import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { createSlopeImageUrl } from '../utils/slopeImageUrl';
import { addSlopeImage, addTerrainLayers, applyView } from '../utils/terrain3dLayers';
import {
  MAX_PITCH,
  START_BEARING,
  START_PITCH,
  areaBounds,
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

function spotElement(label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'pointer-events-none px-2 py-1 rounded-full bg-white shadow-lg border border-emerald-200 text-[11px] font-bold text-emerald-800 whitespace-nowrap';
  el.textContent = `⌂ ${label}`;
  return el;
}

/**
 * A MapLibre map of the drawn area in 3D (see terrain3dScene for the two
 * views). Created once per analysis; the view and height update in place.
 * 'failed' when the browser can't draw 3D (no WebGL).
 */
export function useTerrain3DMap(container: React.RefObject<HTMLDivElement>, o: Terrain3DOptions) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
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
    const spot = analysis.buildSpot
      ? new maplibregl.Marker({ element: spotElement(spotLabel), anchor: 'bottom' }).setLngLat([analysis.buildSpot.lng, analysis.buildSpot.lat]).addTo(instance)
      : null;

    instance.on('load', () => {
      addTerrainLayers(instance, analysis, polygon);
      applyView(instance, latest.current.mode, latest.current.exaggeration);
      void createSlopeImageUrl(analysis, polygon).then((url) => {
        if (!url) return;
        if (cancelled) { URL.revokeObjectURL(url); return; }
        imageUrl = url;
        addSlopeImage(instance, url, analysis);
        applyView(instance, latest.current.mode, latest.current.exaggeration);
      });
      // Tilt into 3D once the area is framed from above.
      const camera = { pitch: START_PITCH, bearing: START_BEARING };
      if (reduceMotion) instance.jumpTo(camera); else instance.easeTo({ ...camera, duration: 1600 });
      setMap(instance);
      setStatus('ready');
    });

    return () => {
      cancelled = true;
      spot?.remove();
      instance.remove();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setMap(null);
      setStatus('loading');
    };
  }, [container, analysis, polygon]);

  useEffect(() => {
    if (map) applyView(map, o.mode, o.exaggeration);
  }, [map, o.mode, o.exaggeration]);

  return { status, map };
}
