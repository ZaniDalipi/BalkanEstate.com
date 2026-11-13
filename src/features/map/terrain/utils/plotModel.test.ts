import { describe, expect, it } from 'vitest';
import { MODEL_SIZE, drapeMesh, plotTerrain, surfaceAt, surfaceMesh, surfaceY, toModel } from './plotModel';
import { makeGrid } from './testGrid';

// 20 × 10 cells of 10 m: 200 m east–west, 100 m north–south, rising 1 m per cell to the east.
const grid = makeGrid(10, 20, (_r, c) => 400 + c);
const t = plotTerrain(grid);

describe('plotTerrain', () => {
  it('scales the longer side to the model size, keeping proportions', () => {
    expect(t.widthM).toBeCloseTo(200, 0);
    expect(t.depthM).toBeCloseTo(100, 0);
    expect(t.widthM * t.scale).toBeCloseTo(MODEL_SIZE, 6);
    expect(t.cols).toBeGreaterThan(t.rows);
    expect((t.cols - 1) / (t.rows - 1)).toBeCloseTo(2, 1);
  });

  it('measures heights from the lowest point and keeps the rise', () => {
    expect(Math.min(...t.heights)).toBe(0);
    const row = Array.from(t.heights.slice(4 * t.cols, 5 * t.cols));
    expect(row[row.length - 1] - row[0]).toBeGreaterThan(17);
    expect(row.every((h, i) => i === 0 || h >= row[i - 1] - 0.01)).toBe(true);
  });
});

describe('model space', () => {
  it('puts the north-west corner at −x, −z and the middle at the origin', () => {
    expect(toModel(t, grid, { lat: grid.north, lng: grid.west })).toEqual({ x: expect.closeTo(-MODEL_SIZE / 2, 6), z: expect.closeTo(-2.5, 6) });
    const mid = toModel(t, grid, { lat: (grid.north + grid.south) / 2, lng: (grid.west + grid.east) / 2 });
    expect(mid.x).toBeCloseTo(0, 6);
    expect(mid.z).toBeCloseTo(0, 6);
  });

  it('reads the surface height anywhere, and stretches it', () => {
    const west = surfaceAt(t, -4.9, 0, 1);
    const east = surfaceAt(t, 4.9, 0, 1);
    expect(east).toBeGreaterThan(west);
    expect(surfaceAt(t, 4.9, 0, 3)).toBeCloseTo(3 * east, 5);
    expect(surfaceAt(t, -99, 99, 1)).toBeCloseTo(surfaceY(t, (t.rows - 1) * t.cols, 1), 5); // clamped to the corner
  });
});

describe('meshes', () => {
  it('builds a surface of two triangles per square, with texture across the whole box', () => {
    const m = surfaceMesh(t, 2);
    expect(m.positions.length).toBe(t.cols * t.rows * 3);
    expect(m.indices.length).toBe((t.cols - 1) * (t.rows - 1) * 6);
    expect(Array.from(m.uvs.slice(0, 2))).toEqual([0, 1]);
    expect(Array.from(m.uvs.slice(-2))).toEqual([1, 0]);
    expect(Math.max(...m.indices)).toBe(t.cols * t.rows - 1);
  });

  it('drapes a sheet over part of the ground, just above it', () => {
    const box = { x0: -2, z0: -1, x1: 2, z1: 1 };
    const m = drapeMesh(t, box, 8, 2, 0.01);
    expect(m.positions.length).toBe(9 * 9 * 3);
    expect(m.indices.length).toBe(8 * 8 * 6);
    expect(Array.from(m.positions.slice(0, 3))).toEqual([-2, expect.closeTo(surfaceAt(t, -2, -1, 2) + 0.01, 5), -1]);
    const last = m.positions.length - 3;
    expect(m.positions[last]).toBeCloseTo(2, 6);
    expect(m.positions[last + 1]).toBeCloseTo(surfaceAt(t, 2, 1, 2) + 0.01, 5);
    expect(Array.from(m.uvs.slice(0, 2))).toEqual([0, 1]);
  });
});
