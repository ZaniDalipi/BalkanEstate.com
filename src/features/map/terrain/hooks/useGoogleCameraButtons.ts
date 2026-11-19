import { useCallback, useState, type MutableRefObject } from 'react';
import { clampRange, GOOGLE_TILT, normalHeading, type GoogleCamera } from '../utils/googleCamera';
import type { Camera3D } from './camera3d';

const MOVE_MS = 550;
const ZOOM_STEP = 0.72;
const TURN_DEG = 45;
/** One slow turn round the plot. */
const ORBIT_MS = 40000;

/** The camera of Google's 3D map as it is now. */
export function currentCamera(map: google.maps.maps3d.Map3DElement, fallback: GoogleCamera): GoogleCamera {
  const c = map.center;
  return {
    center: c ? { lat: c.lat, lng: c.lng, altitude: c.altitude } : fallback.center,
    range: map.range ?? fallback.range,
    tilt: map.tilt ?? fallback.tilt,
    heading: map.heading ?? fallback.heading,
  };
}

/** The camera buttons for Google's 3D map: each flies there (or jumps, under reduced motion). */
export function useGoogleCameraButtons(
  map: MutableRefObject<google.maps.maps3d.Map3DElement | null>,
  start: MutableRefObject<GoogleCamera | null>,
  tilted: boolean,
  reduceMotion: boolean,
): { camera: Camera3D; setOrbiting: (on: boolean) => void } {
  const [orbiting, setOrbiting] = useState(false);

  const flyTo = useCallback((change: (now: GoogleCamera) => Partial<GoogleCamera>) => {
    const m = map.current;
    const s = start.current;
    if (!m || !s) return;
    m.stopCameraAnimation();
    setOrbiting(false);
    const now = currentCamera(m, s);
    const to = { ...now, ...change(now) };
    m.flyCameraTo({
      endCamera: { ...to, range: clampRange(to.range), heading: normalHeading(to.heading) },
      durationMillis: reduceMotion ? 0 : MOVE_MS,
    });
  }, [map, start, reduceMotion]);

  const camera: Camera3D = {
    zoomIn: () => flyTo((c) => ({ range: c.range * ZOOM_STEP })),
    zoomOut: () => flyTo((c) => ({ range: c.range / ZOOM_STEP })),
    turnLeft: () => flyTo((c) => ({ heading: c.heading - TURN_DEG })),
    turnRight: () => flyTo((c) => ({ heading: c.heading + TURN_DEG })),
    tilted,
    toggleTilt: () => flyTo(() => ({ tilt: tilted ? 0 : GOOGLE_TILT })),
    reset: () => flyTo(() => start.current ?? {}),
    orbiting,
    toggleOrbit: () => {
      const m = map.current;
      const s = start.current;
      if (!m || !s) return;
      if (orbiting) {
        m.stopCameraAnimation();
        setOrbiting(false);
        return;
      }
      m.flyCameraAround({ camera: currentCamera(m, s), durationMillis: ORBIT_MS, repeatCount: Number.POSITIVE_INFINITY });
      setOrbiting(true);
    },
    canOrbit: !reduceMotion,
  };
  return { camera, setOrbiting };
}
