import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { between, fitRadius, orbitOf, placeOnOrbit, startOrbit, START_TILT_DEG } from './orbitCamera';
import { START_BEARING, defaultExaggeration, easeInOut, openingBearing } from './terrain3dScene';
import { makeGrid, wholeGrid } from './testGrid';
import type { TerrainStats } from '../types';
import * as THREE from 'three';

const stats = (areaM2: number, min: number, max: number): TerrainStats => ({
  areaM2, minElevation: min, maxElevation: max, meanSlope: 0, maxSlope: 0,
  classShares: { flat: 1, gentle: 0, moderate: 0, steep: 0, verySteep: 0 },
});

const analysed = (height: (r: number, c: number) => number) => {
  const grid = makeGrid(10, 10, height);
  const result = analyzeTerrain(grid, wholeGrid(grid));
  if (result.ok === false) throw new Error(result.error);
  return result.value;
};

describe('opening view', () => {
  it('looks uphill from the low side', () => {
    expect(openingBearing(analysed((_r, c) => 400 + c * 2))).toBe(90); // rises to the east → look east
    expect(openingBearing(analysed((r) => 400 + r * 2))).toBe(180); // rises to the south → look south
  });

  it('opens on the default view over level ground', () => {
    expect(openingBearing(analysed(() => 400))).toBe(START_BEARING);
  });

  it('stands the camera opposite where it looks, tilted', () => {
    // Looking east: the camera stands west of the model (−x).
    const o = startOrbit(10, 90);
    const camera = new THREE.Vector3();
    placeOnOrbit(camera, new THREE.Vector3(), o);
    expect(camera.x).toBeLessThan(-1);
    expect(Math.abs(camera.z)).toBeLessThan(1e-6);
    expect(camera.y).toBeGreaterThan(0);
    expect(o.phi).toBeCloseTo((START_TILT_DEG * Math.PI) / 180, 6);
    expect(orbitOf(camera, new THREE.Vector3()).radius).toBeCloseTo(o.radius, 6);
  });

  it('stands further back on a narrow (upright phone) screen, so the whole model fits', () => {
    const desktop = fitRadius(7, 35, 1.6);
    const phone = fitRadius(7, 35, 0.46);
    expect(phone).toBeGreaterThan(desktop * 2);
    expect(desktop).toBeGreaterThan(7);
  });

  it('moves between views smoothly, turning the short way round', () => {
    const a = { radius: 10, phi: 1, theta: 3 };
    const b = { radius: 20, phi: 0.5, theta: -3 };
    expect(between(a, b, 0)).toEqual(a);
    expect(between(a, b, 1).radius).toBe(20);
    expect(between(a, b, 1).theta).toBeCloseTo(3 + (2 * Math.PI - 6), 6); // across ±π, not back through 0
    expect(between(a, b, 0.5).radius).toBe(15);
  });
});

describe('stretching', () => {
  it('stretches nearly level land most and leaves hills alone', () => {
    expect(defaultExaggeration(stats(10000, 500, 502))).toBe(5); // 2 m over 100 m
    expect(defaultExaggeration(stats(10000, 500, 504))).toBe(3);
    expect(defaultExaggeration(stats(10000, 500, 510))).toBe(2);
    expect(defaultExaggeration(stats(10000, 500, 540))).toBe(1);
  });

  it('eases in and out', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.25)).toBeLessThan(0.25);
  });
});
