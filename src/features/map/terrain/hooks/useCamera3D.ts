import { useCallback, useEffect, useState } from 'react';
import type * as maplibregl from 'maplibre-gl';
import type { TerrainPoint } from '../types';
import { ORBIT_DEG_PER_SECOND, START_BEARING, START_PITCH, areaBounds, clampPitch } from '../utils/terrain3dScene';

const TURN_STEP = 45;
const TILT_STEP = 15;

/**
 * Buttons for moving around the 3D view, for anyone who doesn't know the
 * drag gestures: turn, tilt, fly around (a slow orbit that stops at the first
 * touch), and back to the opening view. Moves are instant under reduced motion,
 * and there is no fly-around then.
 */
export function useCamera3D(map: maplibregl.Map | null, polygon: TerrainPoint[], reduceMotion: boolean) {
  const [orbiting, setOrbiting] = useState(false);
  const duration = reduceMotion ? 0 : 500;

  const turn = useCallback((deg: number) => {
    setOrbiting(false);
    map?.easeTo({ bearing: map.getBearing() + deg, duration });
  }, [map, duration]);

  const tilt = useCallback((deg: number) => {
    setOrbiting(false);
    map?.easeTo({ pitch: clampPitch(map.getPitch() + deg), duration });
  }, [map, duration]);

  const reset = useCallback(() => {
    setOrbiting(false);
    map?.fitBounds(areaBounds(polygon), { padding: 56, pitch: START_PITCH, bearing: START_BEARING, duration: reduceMotion ? 0 : 900 });
  }, [map, polygon, reduceMotion]);

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
    turnLeft: () => turn(-TURN_STEP),
    turnRight: () => turn(TURN_STEP),
    tiltMore: () => tilt(TILT_STEP),
    tiltLess: () => tilt(-TILT_STEP),
    reset,
    orbiting,
    toggleOrbit,
    canOrbit: !reduceMotion,
  };
}

export type Camera3D = ReturnType<typeof useCamera3D>;
