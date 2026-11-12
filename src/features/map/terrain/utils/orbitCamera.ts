/**
 * Camera positions round the model, as distance and angles from the point it
 * looks at, and smooth moves between them. Pure maths on three.js vectors.
 */
import * as THREE from 'three';
import { easeInOut } from './terrain3dScene';

/** How the view opens: this far from straight down. */
export const START_TILT_DEG = 55;
/**
 * Seen tilted, the model looks smaller than the sphere round it, so the
 * camera can stand this much closer than "the whole sphere fits".
 */
const TILTED_FIT = 1;

/**
 * How far back the camera stands for the whole model to fit on screen: its
 * half-diagonal against the narrower of the two fields of view (a phone held
 * upright is narrow across, a desktop window narrow top to bottom).
 */
export function fitRadius(halfDiagonal: number, verticalFovDeg: number, aspect: number): number {
  const v = (verticalFovDeg * Math.PI) / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  return (halfDiagonal / Math.sin(Math.min(v, h) / 2)) * TILTED_FIT;
}
/** Straight down is never quite 0: the orbit controls would lose which way is north. */
export const TOP_DOWN = 0.001;

export interface Orbit {
  radius: number;
  /** Angle from straight down, radians. */
  phi: number;
  /** Turn round the vertical axis, radians (three.js: from +z towards +x). */
  theta: number;
}

/** The opening view: looking along a compass bearing (x east, z south), tilted, `radius` back. */
export function startOrbit(radius: number, bearingDeg: number): Orbit {
  const b = (bearingDeg * Math.PI) / 180;
  // The camera stands opposite where it looks: at (−sin b, +cos b) on the ground.
  return { radius, phi: (START_TILT_DEG * Math.PI) / 180, theta: Math.atan2(-Math.sin(b), Math.cos(b)) };
}

export function orbitOf(camera: THREE.Vector3, target: THREE.Vector3): Orbit {
  const s = new THREE.Spherical().setFromVector3(camera.clone().sub(target));
  return { radius: s.radius, phi: s.phi, theta: s.theta };
}

export function placeOnOrbit(camera: THREE.Vector3, target: THREE.Vector3, o: Orbit): void {
  camera.setFromSpherical(new THREE.Spherical(o.radius, o.phi, o.theta)).add(target);
}

/** The point `t` (0–1) of the way between two views, easing in and out, turning the short way round. */
export function between(from: Orbit, to: Orbit, t: number): Orbit {
  const k = easeInOut(Math.min(1, Math.max(0, t)));
  let turn = (to.theta - from.theta) % (2 * Math.PI);
  if (turn > Math.PI) turn -= 2 * Math.PI;
  if (turn < -Math.PI) turn += 2 * Math.PI;
  return {
    radius: from.radius + (to.radius - from.radius) * k,
    phi: from.phi + (to.phi - from.phi) * k,
    theta: from.theta + turn * k,
  };
}
