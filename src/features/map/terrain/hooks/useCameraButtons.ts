import { useCallback, useState, type MutableRefObject } from 'react';
import type * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { orbitOf, placeOnOrbit, TOP_DOWN, type Orbit } from '../utils/orbitCamera';
import type { PlotScene } from '../utils/plotScene';
import type { Camera3D } from './camera3d';

export interface ViewParts {
  plot: PlotScene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

/** A camera move under way, played by the render loop. */
export interface CameraMove {
  from: Orbit;
  to: Orbit;
  started: number;
  ms: number;
}

const MOVE_MS = 550;
const ZOOM_STEP = 0.72;
const TURN_STEP = Math.PI / 4;
/** Further from straight down than this counts as tilted. */
export const TILTED_FROM = (12 * Math.PI) / 180;

/**
 * The camera buttons: each starts a tween along the orbit (or jumps, under
 * reduced motion) that the render loop plays. Fly-around is OrbitControls'
 * auto-rotate.
 */
export function useCameraButtons(
  parts: MutableRefObject<ViewParts | null>,
  move: MutableRefObject<CameraMove | null>,
  start: MutableRefObject<Orbit>,
  tilted: boolean,
  reduceMotion: boolean,
): { camera: Camera3D; setOrbiting: (on: boolean) => void } {
  const [orbiting, setOrbiting] = useState(false);

  const goTo = useCallback((change: (now: Orbit) => Partial<Orbit>) => {
    const p = parts.current;
    if (!p) return;
    p.controls.autoRotate = false;
    setOrbiting(false);
    const from = orbitOf(p.camera.position, p.controls.target);
    const to = { ...from, ...change(from) };
    to.radius = Math.min(p.controls.maxDistance, Math.max(p.controls.minDistance, to.radius));
    if (reduceMotion) {
      move.current = null;
      placeOnOrbit(p.camera.position, p.controls.target, to);
    } else {
      move.current = { from, to, started: performance.now(), ms: MOVE_MS };
    }
  }, [parts, move, reduceMotion]);

  const camera: Camera3D = {
    zoomIn: () => goTo((c) => ({ radius: c.radius * ZOOM_STEP })),
    zoomOut: () => goTo((c) => ({ radius: c.radius / ZOOM_STEP })),
    turnLeft: () => goTo((c) => ({ theta: c.theta - TURN_STEP })),
    turnRight: () => goTo((c) => ({ theta: c.theta + TURN_STEP })),
    tilted,
    toggleTilt: () => goTo((c) => ({ phi: c.phi > TILTED_FROM ? TOP_DOWN : start.current.phi })),
    reset: () => {
      const p = parts.current;
      if (p) p.controls.target.copy(p.plot.target);
      goTo(() => start.current);
    },
    orbiting,
    toggleOrbit: () => {
      const p = parts.current;
      if (!p) return;
      move.current = null;
      p.controls.autoRotate = !p.controls.autoRotate;
      setOrbiting(p.controls.autoRotate);
    },
    canOrbit: !reduceMotion,
  };
  return { camera, setOrbiting };
}
