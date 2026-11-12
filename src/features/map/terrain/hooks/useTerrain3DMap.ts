import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { createHouseShadowUrl } from '../utils/houseShadow';
import { createSlopeImageUrl } from '../utils/slopeImageUrl';
import { createSpotMarker3D } from '../utils/spotMarker3d';
import {
  addHouseShadow,
  addSlopeImage,
  addTerrainLayers,
  foldCredits,
  setExaggeration,
  setOverlay,
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
  type Exaggeration,
  type Overlay3D,
} from '../utils/terrain3dScene';

export type Terrain3DStatus = 'loading' | 'ready' | 'failed';

export interface Terrain3DOptions {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  overlay: Overlay3D;
  exaggeration: Exaggeration;
  reduceMotion: boolean;
  /** Text on the best-place-to-build label. */
  spotLabel: string;
}

/** How long the relief takes to move between heights. */
const STRETCH_MS = 450;

/**
 * A MapLibre map of the drawn area in 3D: satellite on the real relief, the
 * slope picture over the area, and a house at the best place to build with
 * its label above it. Created once per analysis; the overlay and the height
 * change in place, smoothly. 'failed' when the browser can't draw 3D (no WebGL).
 */
export function useTerrain3DMap(container: React.RefObject<HTMLDivElement>, o: Terrain3DOptions) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [status, setStatus] = useState<Terrain3DStatus>('loading');
  const latest = useRef(o);
  latest.current = o;
  /** The height the relief is at right now (it moves between the chosen ones). */
  const stretch = useRef<number>(o.exaggeration);
  const { analysis, polygon } = o;

  useEffect(() => {
    if (!container.current) return undefined;
    const { reduceMotion, spotLabel, exaggeration } = latest.current;
    stretch.current = exaggeration;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: terrain3dStyle(exaggeration),
        bounds: areaBounds(polygon),
        fitBoundsOptions: { padding: framePadding(container.current.clientWidth) },
        maxPitch: MAX_PITCH,
        attributionControl: { compact: true },
        // Smooth edges on the house and the horizon.
        canvasContextAttributes: { antialias: true },
      });
    } catch {
      setStatus('failed');
      return undefined;
    }

    const urls: string[] = [];
    let cancelled = false;
    let stopWaiting = () => {};
    const keep = (url: string | null): string | null => {
      if (!url) return null;
      if (cancelled) { URL.revokeObjectURL(url); return null; }
      urls.push(url);
      return url;
    };
    const { buildSpot } = analysis;
    const spot = buildSpot ? createSpotMarker3D(instance, buildSpot, spotLabel) : null;

    // As soon as the style is in (not once every tile is: the far ones can take a while).
    instance.once('style.load', () => {
      foldCredits(instance);
      addTerrainLayers(instance, analysis, polygon);
      void createSlopeImageUrl(analysis, polygon).then((made) => {
        const url = keep(made);
        if (url) addSlopeImage(instance, url, analysis, latest.current.overlay);
      });
      if (buildSpot) {
        void createHouseShadowUrl().then((made) => {
          const url = keep(made);
          if (url) addHouseShadow(instance, url, buildSpot);
        });
      }
      // Tilt into 3D once the camera stands on the real ground, so the view opens without a jump.
      const camera = { pitch: START_PITCH, bearing: openingBearing(analysis) };
      stopWaiting = watchGround(
        instance,
        () => {
          if (reduceMotion) instance.jumpTo(camera); else instance.easeTo({ ...camera, duration: 1400 });
          setMap(instance);
          setStatus('ready');
        },
        // Slow connection: the heights came after the view opened. Settle straight into the opening view.
        () => instance.jumpTo(camera),
      );
    });

    return () => {
      cancelled = true;
      stopWaiting();
      spot?.remove();
      instance.remove();
      urls.forEach((url) => URL.revokeObjectURL(url));
      setMap(null);
      setStatus('loading');
    };
  }, [container, analysis, polygon]);

  useEffect(() => {
    if (map) setOverlay(map, o.overlay);
  }, [map, o.overlay]);

  // Move the relief to the chosen height: at once under reduced motion, otherwise over a moment.
  useEffect(() => {
    if (!map) return undefined;
    const from = stretch.current;
    const to = o.exaggeration;
    if (from === to) return undefined;
    if (o.reduceMotion) {
      stretch.current = to;
      setExaggeration(map, to);
      return undefined;
    }
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / STRETCH_MS);
      stretch.current = from + (to - from) * easeInOut(t);
      // Light frames on the way; the last one makes the new height the map's own.
      if (t < 1 && stretchRelief(map, stretch.current)) {
        frame = requestAnimationFrame(step);
        return;
      }
      stretch.current = to;
      setExaggeration(map, to);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [map, o.exaggeration, o.reduceMotion]);

  return { status, map };
}
