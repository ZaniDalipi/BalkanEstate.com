import { useCallback, useEffect, useState } from 'react';
import type * as maplibregl from 'maplibre-gl';
import type { TerrainPoint } from '../types';
import { ORBIT_DEG_PER_SECOND, START_PITCH, areaBounds, framePadding } from '../utils/terrain3dScene';

const TURN_STEP = 45;
/** Past this tilt the view counts as 3D (the 2D/3D button then offers 2D). */
const TILTED_FROM = 12;

/**
 * Buttons for moving around the 3D view, for anyone who doesn't know the
 * drag gestures: zoom, turn, switch between looking straight down (2D) and
 * tilted (3D), fly around (a slow orbit that stops at the first touch), and
 * back to the opening view. Moves are instant under reduced motion, and there
 * is no fly-around then.
 */
export function useCamera3D(map: maplibregl.Map | null, polygon: TerrainPoint[], startBearing: number, reduceMotion: boolean) {
  const [orbiting, setOrbiting] = useState(false);
  const [tilted, setTilted] = useState(true);
  const duration = reduceMotion ? 0 : 450;

  useEffect(() => {
    if (!map) return undefined;
    const read = () => setTilted(map.getPitch() > TILTED_FROM);
    read();
    map.on('pitchend', read);
    map.on('moveend', read);
    return () => {
      map.off('pitchend', read);
      map.off('moveend', read);
    };
  }, [map]);

  const turn = useCallback((deg: number) => {
    setOrbiting(false);
    map?.easeTo({ bearing: map.getBearing() + deg, duration });
  }, [map, duration]);

  const zoom = useCallback((steps: number) => {
    setOrbiting(false);
    map?.easeTo({ zoom: map.getZoom() + steps, duration });
  }, [map, duration]);

  const toggleTilt = useCallback(() => {
    if (!map) return;
    setOrbiting(false);
    map.easeTo({ pitch: map.getPitch() > TILTED_FROM ? 0 : START_PITCH, duration: reduceMotion ? 0 : 700 });
  }, [map, reduceMotion]);

  const reset = useCallback(() => {
    setOrbiting(false);
    if (!map) return;
    map.fitBounds(areaBounds(polygon), {
      padding: framePadding(map.getContainer().clientWidth),
      pitch: START_PITCH,
      bearing: startBearing,
      duration: reduceMotion ? 0 : 900,
    });
  }, [map, polygon, startBearing, reduceMotion]);

  const toggleOrbit = useCallback(() => setOrbiting((on) => !on), []);

  useEffect(() => {
    if (!map || !orbiting || reduceMotion) return undefined;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      map.setBearing(map.getBearing() + ((now - last) / 1000) * ORBIT_DEG_PER_SECOND);
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const stop = () => setOrbiting(false);
    map.on('mousedown', stop);
    map.on('touchstart', stop);
    map.on('wheel', stop);
    return () => {
      cancelAnimationFrame(frame);
      map.off('mousedown', stop);
      map.off('touchstart', stop);
      map.off('wheel', stop);
    };
  }, [map, orbiting, reduceMotion]);

  return {
    zoomIn: () => zoom(1),
    zoomOut: () => zoom(-1),
    turnLeft: () => turn(-TURN_STEP),
    turnRight: () => turn(TURN_STEP),
    tilted,
    toggleTilt,
    reset,
    orbiting,
    toggleOrbit,
    canOrbit: !reduceMotion,
  };
}

export type Camera3D = ReturnType<typeof useCamera3D>;
