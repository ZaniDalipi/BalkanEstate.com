import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { findBuildSpot, patchDownhill } from './buildSpot';
import { metresBetween } from './gridGeometry';
import {
  HOUSE,
  HOUSE_CLEARANCE_M,
  HOUSE_HEIGHT_M,
  HOUSE_VERTEX_SIZE,
  houseAxis,
  houseFootprint,
  houseMesh,
  placeOnMap,
  rectangleAround,
  roofHalves,
} from './house';
import { houseShadowCorners } from './houseShadow';
import { computeSlopeField } from './slopeField';
import { makeGrid, wholeGrid } from './testGrid';
import type { BuildSpot } from '../types';

const spot = (downhill: number | null): BuildSpot => ({ lat: 41, lng: 20, areaM2: 500, quality: 'easy', elevation: 600, downhill });

/** The mesh as vertices: position and colour. */
const vertices = (mesh: Float32Array) =>
  Array.from({ length: mesh.length / HOUSE_VERTEX_SIZE }, (_, i) => {
    const [x, y, z, r, g, b] = mesh.slice(i * HOUSE_VERTEX_SIZE, (i + 1) * HOUSE_VERTEX_SIZE);
    return { x, y, z, r, g, b };
  });

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
  const mesh = vertices(houseMesh(spot(null)));

  it('is whole triangles, with a roof that rises to a ridge', () => {
    expect(mesh.length % 3).toBe(0);
    const top = Math.max(...mesh.map((v) => v.z));
    expect(top).toBeGreaterThan(HOUSE_HEIGHT_M);
    expect(top).toBeLessThan(HOUSE_HEIGHT_M + 0.3);
    // The ridge runs along the long (east–west) side, over the middle of the house.
    const ridge = mesh.filter((v) => v.z === top);
    expect(ridge.every((v) => Math.abs(v.y) < 0.01)).toBe(true);
    expect(Math.max(...ridge.map((v) => v.x))).toBeCloseTo(HOUSE.lengthM / 2 + HOUSE.overhangM, 3);
  });

  it('reaches below ground, so no corner hangs in the air on a slope', () => {
    expect(Math.min(...mesh.map((v) => v.z))).toBe(-HOUSE.footingM);
  });

  it('has light walls under a dark roof', () => {
    const brightness = (v: { r: number; g: number; b: number }) => (v.r + v.g + v.b) / 3;
    const wall = mesh.filter((v) => v.z === -HOUSE.footingM).map(brightness);
    const roof = mesh.filter((v) => v.z > HOUSE.wallM + 1).filter((v) => Math.abs(v.x) > HOUSE.lengthM / 2).map(brightness);
    expect(Math.min(...wall)).toBeGreaterThan(0.7);
    expect(Math.max(...roof)).toBeLessThan(0.45);
  });

  it('turns with the slope like the footprint does', () => {
    // Falls west → long side north–south: the model is longer north–south than east–west.
    const turned = vertices(houseMesh(spot(270)));
    const span = (pick: (v: { x: number; y: number }) => number) => Math.max(...turned.map(pick)) - Math.min(...turned.map(pick));
    expect(span((v) => v.y)).toBeGreaterThan(span((v) => v.x));
  });

  it('places its metres on the map: east is +x, north is −y (mercator runs south), up is +z', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const m = placeOnMap(identity, { x: 0.5, y: 0.25, z: 0.001 }, 2);
    const apply = ([x, y, z]: number[]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
    expect(apply([0, 0, 0])).toEqual([0.5, 0.25, expect.closeTo(0.001, 6)]);
    expect(apply([1, 0, 0])[0]).toBeCloseTo(2.5, 6);
    expect(apply([0, 1, 0])[1]).toBeCloseTo(-1.75, 6);
    expect(apply([0, 0, 1])[2]).toBeCloseTo(2.001, 6);
  });

  it('lays its shadow around the footprint', () => {
    const corners = houseShadowCorners(spot(null));
    const [a, b] = corners.map(([lng, lat]) => ({ lat, lng }));
    expect(metresBetween(a, b)).toBeGreaterThan(HOUSE.lengthM + 5);
    expect(corners).toHaveLength(4);
  });
});
