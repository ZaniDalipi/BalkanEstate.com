import { useEffect, useMemo, useRef, useState } from 'react';
import { useGoogleMapLoader } from '@/src/features/map/hooks/useGoogleMapLoader';
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { addGoogle3DOverlays, type Google3DOverlays } from '../utils/google3dOverlays';
import { startCamera, TILTED_FROM_DEG, type GoogleCamera } from '../utils/googleCamera';
import { openingBearing } from '../utils/terrain3dScene';
import { useGoogleCameraButtons } from './useGoogleCameraButtons';
import type { PlotModelStatus, PlotSurface } from './usePlotModel';

export interface Google3DOptions {
  analysis: TerrainAnalysis;
  polygon: TerrainPoint[];
  surface: PlotSurface;
  markerLabel: string;
  reduceMotion: boolean;
}

/** Past this the map is shown even if Google never says it has finished drawing. */
const SHOW_ANYWAY_MS = 12000;

/**
 * Google's photorealistic 3D map of the plot in `container` — the same 3D
 * imagery as Google Maps, streamed sharper as the camera comes closer — with
 * the slope colours, the outline and the best-spot pin on it. 'failed' when
 * the Maps script or its 3D library can't load, so the dialog can fall back
 * to the home-made model.
 */
export function useGoogle3DMap(container: React.RefObject<HTMLDivElement>, o: Google3DOptions) {
  const { isLoaded, loadError } = useGoogleMapLoader();
  const [status, setStatus] = useState<PlotModelStatus>('loading');
  const [tilted, setTilted] = useState(true);
  const map = useRef<google.maps.maps3d.Map3DElement | null>(null);
  const overlays = useRef<Google3DOverlays | null>(null);
  const start = useRef<GoogleCamera | null>(null);
  const latest = useRef(o);
  latest.current = o;
  const { analysis, polygon } = o;
  const bearing = useMemo(() => openingBearing(analysis), [analysis]);
  const { camera, setOrbiting } = useGoogleCameraButtons(map, start, tilted, o.reduceMotion);

  useEffect(() => {
    if (loadError) setStatus('failed');
  }, [loadError]);

  useEffect(() => {
    const host = container.current;
    if (!isLoaded || !host) return undefined;
    let cancelled = false;
    let timer = 0;
    let element: google.maps.maps3d.Map3DElement | null = null;
    const ready = () => { if (!cancelled) setStatus((s) => (s === 'loading' ? 'ready' : s)); };
    const stopOrbit = () => { element?.stopCameraAnimation(); setOrbiting(false); };

    (async () => {
      let lib: google.maps.Maps3DLibrary;
      try {
        lib = (await google.maps.importLibrary('maps3d')) as google.maps.Maps3DLibrary;
      } catch {
        if (!cancelled) setStatus('failed');
        return;
      }
      if (cancelled) return;
      const cam = startCamera(analysis, polygon, bearing, host.clientWidth / Math.max(host.clientHeight, 1));
      start.current = cam;
      element = new lib.Map3DElement({ ...cam, mode: 'HYBRID', defaultUIHidden: true, gestureHandling: 'GREEDY' });
      element.style.cssText = 'display:block;width:100%;height:100%';
      element.addEventListener('gmp-steadychange', (e) => { if ((e as google.maps.maps3d.SteadyChangeEvent).isSteady) ready(); });
      element.addEventListener('gmp-error', () => { if (!cancelled) setStatus('failed'); });
      element.addEventListener('gmp-tiltchange', () => setTilted((element?.tilt ?? 0) > TILTED_FROM_DEG));
      element.addEventListener('pointerdown', stopOrbit);
      element.addEventListener('wheel', stopOrbit, { passive: true });
      overlays.current = addGoogle3DOverlays(element, lib, analysis, polygon, latest.current.markerLabel);
      overlays.current.setSlopeVisible(latest.current.surface === 'slope');
      host.replaceChildren(element);
      map.current = element;
      timer = window.setTimeout(ready, SHOW_ANYWAY_MS);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      element?.remove();
      map.current = null;
      overlays.current = null;
      setOrbiting(false);
      setStatus((s) => (s === 'failed' ? s : 'loading'));
    };
  }, [container, isLoaded, analysis, polygon, bearing, setOrbiting]);

  // The slope colours on top, or just the photo.
  useEffect(() => {
    overlays.current?.setSlopeVisible(o.surface === 'slope');
  }, [o.surface, status]);

  return { status, camera };
}
