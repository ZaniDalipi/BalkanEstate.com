import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { createSlopeImageUrl } from '../utils/slopeImageUrl';
import { createSpotMarker3D, type SpotMarker3D } from '../utils/spotMarker3d';
import { addSlopeImage, addTerrainLayers, applyView } from '../utils/terrain3dLayers';
import {
  MAX_PITCH,
  START_PITCH,
  areaBounds,
  openingBearing,
  terrain3dStyle,
  type Exaggeration,
  type View3DMode,
} from '../utils/terrain3dScene';

export type Terrain3DStatus = 'loading' | 'ready' | 'failed';

export interface Terrain3DOptions {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  mode: View3DMode;
  exaggeration: Exaggeration;
  reduceMotion: boolean;
  /** Text on the best-place-to-build pin. */
  spotLabel: string;
}

/**
 * A MapLibre map of the drawn area in 3D (see terrain3dScene for the two
 * views), with a house at the best place to build and its label floating
 * above it. Created once per analysis; the view and height update in place.
 * 'failed' when the browser can't draw 3D (no WebGL).
 */
export function useTerrain3DMap(container: React.RefObject<HTMLDivElement>, o: Terrain3DOptions) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const spotRef = useRef<SpotMarker3D | null>(null);
  const [status, setStatus] = useState<Terrain3DStatus>('loading');
  const latest = useRef(o);
  latest.current = o;
  const { analysis, polygon } = o;

  useEffect(() => {
    if (!container.current) return undefined;
    const { reduceMotion, spotLabel } = latest.current;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: terrain3dStyle(),
        bounds: areaBounds(polygon),
        fitBoundsOptions: { padding: 56 },
        maxPitch: MAX_PITCH,
        attributionControl: { compact: true },
      });
    } catch {
      setStatus('failed');
      return undefined;
    }
    instance.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    let imageUrl: string | null = null;
    let cancelled = false;
    const { buildSpot } = analysis;
    const spot = buildSpot ? createSpotMarker3D(instance, { ...analysis, buildSpot }, spotLabel, () => latest.current) : null;
    spotRef.current = spot;

    instance.on('load', () => {
      addTerrainLayers(instance, analysis, polygon);
      applyView(instance, analysis, latest.current.mode, latest.current.exaggeration);
      void createSlopeImageUrl(analysis, polygon).then((url) => {
        if (!url) return;
        if (cancelled) { URL.revokeObjectURL(url); return; }
        imageUrl = url;
        addSlopeImage(instance, url, analysis);
        applyView(instance, analysis, latest.current.mode, latest.current.exaggeration);
      });
      // Tilt into 3D once the area is framed from above.
      const camera = { pitch: START_PITCH, bearing: openingBearing(analysis) };
      if (reduceMotion) instance.jumpTo(camera); else instance.easeTo({ ...camera, duration: 1600 });
      setMap(instance);
      setStatus('ready');
    });

    return () => {
      cancelled = true;
      spot?.remove();
      spotRef.current = null;
      instance.remove();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setMap(null);
      setStatus('loading');
    };
  }, [container, analysis, polygon]);

  useEffect(() => {
    if (!map) return;
    applyView(map, analysis, o.mode, o.exaggeration);
    spotRef.current?.update();
  }, [map, analysis, o.mode, o.exaggeration]);

  return { status, map };
}
