import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { createHouseShadowUrl } from '../utils/houseShadow';
import { createSlopeImageUrl } from '../utils/slopeImageUrl';
import { createSpotMarker3D } from '../utils/spotMarker3d';
import {
  STRETCH_MS,
  addHouseShadow,
  addSlopeImage,
  addTerrainLayers,
  applyView,
  foldCredits,
  houseStandsAt,
  setBlockHeight,
  setExaggeration,
  stretchRelief,
  watchGround,
} from '../utils/terrain3dLayers';
import {
  MAX_PITCH,
  START_PITCH,
  areaBounds,
  easeInOut,
  framePadding,
  openingBearing,
  terrain3dStyle,
  usesRelief,
  type Exaggeration,
  type View3D,
} from '../utils/terrain3dScene';

export type Terrain3DStatus = 'loading' | 'ready' | 'failed';

export interface Terrain3DOptions {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  view: View3D;
  exaggeration: Exaggeration;
  reduceMotion: boolean;
  /** Text on the best-place-to-build label. */
  spotLabel: string;
}

/**
 * A MapLibre map of the drawn area in 3D (see terrain3dScene for the three
 * views), with a house at the best place to build and its label above it.
 * Created once per analysis; the view and the height change in place,
 * smoothly. 'failed' when the browser can't draw 3D (no WebGL).
 */
export function useTerrain3DMap(container: React.RefObject<HTMLDivElement>, o: Terrain3DOptions) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [status, setStatus] = useState<Terrain3DStatus>('loading');
  const latest = useRef(o);
  latest.current = o;
  /** The height the land is stretched to right now (it moves between the chosen ones). */
  const stretch = useRef<number>(o.exaggeration);
  /** Stops waiting for the relief's heights (after a switch to a relief view). */
  const stopWaiting = useRef<() => void>(() => {});
  const { analysis, polygon } = o;

  useEffect(() => {
    if (!container.current) return undefined;
    const { reduceMotion, spotLabel, exaggeration, view } = latest.current;
    stretch.current = exaggeration;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: terrain3dStyle(view, exaggeration),
        bounds: areaBounds(polygon),
        fitBoundsOptions: { padding: framePadding(container.current.clientWidth) },
        maxPitch: MAX_PITCH,
        attributionControl: { compact: true },
        // Smooth edges on the blocks, the house and the horizon.
        canvasContextAttributes: { antialias: true },
      });
    } catch {
      setStatus('failed');
      return undefined;
    }

    const urls: string[] = [];
    let cancelled = false;
    const keep = (url: string | null): string | null => {
      if (!url) return null;
      if (cancelled) { URL.revokeObjectURL(url); return null; }
      urls.push(url);
      return url;
    };
    const houseAt = (m: maplibregl.Map) => houseStandsAt(m, analysis, latest.current.view, stretch.current);
    const { buildSpot } = analysis;
    const spot = buildSpot
      ? createSpotMarker3D(instance, buildSpot, spotLabel, () => (usesRelief(latest.current.view) ? 0 : houseAt(instance) ?? 0))
      : null;

    // As soon as the style is in (not once every tile is: the far ones can take a while).
    instance.once('style.load', () => {
      foldCredits(instance);
      addTerrainLayers(instance, analysis, polygon, view, exaggeration, houseAt);
      void createSlopeImageUrl(analysis, polygon).then((made) => {
        const url = keep(made);
        if (url) addSlopeImage(instance, url, analysis, latest.current.view);
      });
      if (buildSpot) {
        void createHouseShadowUrl().then((made) => {
          const url = keep(made);
          if (url) addHouseShadow(instance, url, buildSpot, latest.current.view);
        });
      }
      const camera = { pitch: START_PITCH, bearing: openingBearing(analysis) };
      const open = () => {
        if (reduceMotion) instance.jumpTo(camera); else instance.easeTo({ ...camera, duration: 1400 });
        setMap(instance);
        setStatus('ready');
      };
      // The blocks stand on flat ground: tilt in at once. On the relief, wait until the camera stands on the real ground.
      if (!usesRelief(view)) open();
      else stopWaiting.current = watchGround(instance, open, () => instance.jumpTo(camera));
    });

    return () => {
      cancelled = true;
      stopWaiting.current();
      spot?.remove();
      instance.remove();
      urls.forEach((url) => URL.revokeObjectURL(url));
      setMap(null);
      setStatus('loading');
    };
  }, [container, analysis, polygon]);

  // Switch views. When the relief comes in, stand the camera on it as soon as its heights arrive.
  useEffect(() => {
    if (!map) return;
    if (applyView(map, o.view, stretch.current)) {
      stopWaiting.current();
      stopWaiting.current = watchGround(map, () => {}, () => {});
    }
  }, [map, o.view]);

  // Move the land to the chosen height: at once under reduced motion, otherwise over a moment.
  useEffect(() => {
    if (!map) return undefined;
    const from = stretch.current;
    const to = o.exaggeration;
    if (from === to) return undefined;
    const relief = usesRelief(latest.current.view);
    // The blocks grow by themselves (a paint transition); the house on top and the relief follow this clock.
    setBlockHeight(map, to, o.reduceMotion);
    if (o.reduceMotion) {
      stretch.current = to;
      if (relief) setExaggeration(map, to);
      map.triggerRepaint();
      return undefined;
    }
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / STRETCH_MS);
      stretch.current = from + (to - from) * easeInOut(t);
      if (t < 1) {
        if (!relief || stretchRelief(map, stretch.current)) {
          map.triggerRepaint();
          frame = requestAnimationFrame(step);
          return;
        }
      }
      stretch.current = to;
      if (relief) setExaggeration(map, to);
      map.triggerRepaint();
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [map, o.exaggeration, o.reduceMotion]);

  return { status, map };
}
