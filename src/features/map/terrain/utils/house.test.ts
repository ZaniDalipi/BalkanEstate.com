import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { findBuildSpot, patchDownhill } from './buildSpot';
import { metresBetween } from './gridGeometry';
import * as THREE from 'three';
import {
  HOUSE,
  HOUSE_CLEARANCE_M,
  HOUSE_HEIGHT_M,
  houseAxis,
  houseFootprint,
  rectangleAround,
  roofHalves,
} from './house';
import { createHouseModel, houseRotationY } from './houseModel3d';
import { computeSlopeField } from './slopeField';
import { makeGrid, wholeGrid } from './testGrid';
import type { BuildSpot } from '../types';

const spot = (downhill: number | null): BuildSpot => ({ lat: 41, lng: 20, areaM2: 500, quality: 'easy', elevation: 600, downhill });

describe('best spot', () => {
  it('knows its ground height and which way the patch falls', () => {
    // Gentle 5 % slope falling to the west.
    const grid = makeGrid(12, 12, (_r, c) => 400 + c * 0.5);
    const found = findBuildSpot(grid, new Uint8Array(144).fill(1), computeSlopeField(grid))!;
    expect(found.elevation).toBeGreaterThan(400);
    expect(found.elevation).toBeLessThan(406);
    expect(found.downhill).toBe(270);
  });

  it('calls level ground level', () => {
    const grid = makeGrid(6, 6, () => 400);
    expect(patchDownhill([0, 1, 2, 7], computeSlopeField(grid))).toBeNull();
  });

  it('keeps downhill arrows off the house', () => {
    const grid = makeGrid(14, 14, (_r, c) => 400 + c * 0.5);
    const result = analyzeTerrain(grid, wholeGrid(grid));
    if (result.ok === false) throw new Error(result.error);
    const { arrows, buildSpot } = result.value;
    expect(arrows.length).toBeGreaterThan(0);
    expect(arrows.every((a) => metresBetween(a, buildSpot!) >= HOUSE_CLEARANCE_M)).toBe(true);
  });
});

describe('house on the 2D map', () => {
  it('runs its long side across the fall line, or east–west on level ground', () => {
    expect(houseAxis(spot(270))).toBe(0); // falls west → long side north–south
    expect(houseAxis(spot(180))).toBe(270); // falls south → long side east–west
    expect(houseAxis(spot(null))).toBe(90);
  });

  it('is about 12 × 9 m on the ground, centred on the spot', () => {
    const [a, b, c, d] = houseFootprint(spot(null));
    expect(metresBetween(a, b)).toBeCloseTo(HOUSE.lengthM, 1);
    expect(metresBetween(b, c)).toBeCloseTo(HOUSE.widthM, 1);
    expect((a.lat + c.lat) / 2).toBeCloseTo(41, 9);
    expect((b.lng + d.lng) / 2).toBeCloseTo(20, 9);
  });

  it('turns with the slope', () => {
    // Long side north–south: the first two corners differ in latitude only.
    const [a, b] = rectangleAround({ lat: 41, lng: 20 }, 0, 12, 9);
    expect(a.lng).toBeCloseTo(b.lng, 9);
    expect(metresBetween(a, b)).toBeCloseTo(12, 1);
  });

  it('splits the roof along the ridge, with the slope facing the north-west light lit', () => {
    // Long side east–west: one slope faces north, the other south.
    const halves = roofHalves(spot(null));
    expect(halves).toHaveLength(2);
    expect(halves.filter((h) => h.lit)).toHaveLength(1);
    const northernmost = (pts: Array<{ lat: number }>) => Math.max(...pts.map((p) => p.lat));
    const lit = halves.find((h) => h.lit)!;
    const shaded = halves.find((h) => !h.lit)!;
    expect(northernmost(lit.points)).toBeGreaterThan(northernmost(shaded.points));
    // Each half is half the footprint: 12 × 4.5 m.
    expect(metresBetween(lit.points[1], lit.points[2])).toBeCloseTo(HOUSE.widthM / 2, 1);
  });
});

describe('house model', () => {
  const house = createHouseModel();
  const box = new THREE.Box3().setFromObject(house);

  it('is about 12 × 9 m, rising to the ridge, with footings below the ground', () => {
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(HOUSE.lengthM);
    expect(size.x).toBeLessThan(HOUSE.lengthM + 2 * HOUSE.overhangM + 0.2);
    expect(size.z).toBeGreaterThan(HOUSE.widthM);
    expect(box.max.y).toBeCloseTo(HOUSE_HEIGHT_M, 1);
    expect(box.min.y).toBeCloseTo(-HOUSE.footingM, 6);
  });

  it('casts and catches shadows', () => {
    const meshes: THREE.Mesh[] = [];
    house.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o); });
    expect(meshes.length).toBeGreaterThan(8);
    expect(meshes.every((m) => m.castShadow && m.receiveShadow)).toBe(true);
  });

  it('turns its long side to the compass bearing it is given', () => {
    // Long side along +x (east) before turning; north is −z.
    const along = (bearing: number) => new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), houseRotationY(bearing));
    expect(along(90).x).toBeCloseTo(1, 6); // east
    expect(along(0).z).toBeCloseTo(-1, 6); // north
    expect(along(180).z).toBeCloseTo(1, 6); // south
  });
});
