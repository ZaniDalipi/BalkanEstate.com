import { describe, expect, it } from 'vitest';
import { MODEL_SIZE, TOPSOIL, plotTerrain, rimIndices, sideMesh, surfaceAt, surfaceMesh, surfaceY, toModel } from './plotModel';
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
    expect(surfaceAt(t, 4.9, 0, 3) - t.base).toBeCloseTo(3 * (east - t.base), 5);
    expect(surfaceAt(t, -99, 99, 1)).toBeCloseTo(surfaceY(t, (t.rows - 1) * t.cols, 1), 5); // clamped to the corner
  });
});

describe('meshes', () => {
  it('builds a top surface of two triangles per square, with texture across the whole box', () => {
    const m = surfaceMesh(t, 2);
    expect(m.positions.length).toBe(t.cols * t.rows * 3);
    expect(m.indices.length).toBe((t.cols - 1) * (t.rows - 1) * 6);
    expect(Array.from(m.uvs.slice(0, 2))).toEqual([0, 1]);
    expect(Array.from(m.uvs.slice(-2))).toEqual([1, 0]);
    expect(Math.max(...m.indices)).toBe(t.cols * t.rows - 1);
  });

  it('walks the rim once round the edge', () => {
    const rim = rimIndices(t);
    expect(rim.length).toBe(2 * (t.cols + t.rows) - 4);
    expect(new Set(rim).size).toBe(rim.length);
  });

  it('drops the sides from the ground to the base, with a topsoil band', () => {
    const s = sideMesh(t, 1);
    const n = rimIndices(t).length;
    expect(s.positions.length).toBe(n * 9);
    const [, top, , , soil, , , base] = s.positions;
    expect(top - soil).toBeCloseTo(TOPSOIL, 6);
    expect(base).toBe(0);
    expect(s.indices.length).toBe(n * 12);
  });

  it('turns every side face outward', () => {
    const s = sideMesh(t, 1);
    const p = (i: number) => [s.positions[i * 3], s.positions[i * 3 + 1], s.positions[i * 3 + 2]];
    for (let k = 0; k < s.indices.length; k += 3) {
      const [a, b, c] = [p(s.indices[k]), p(s.indices[k + 1]), p(s.indices[k + 2])];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const outward = normal[0] * (a[0] + b[0] + c[0]) + normal[2] * (a[2] + b[2] + c[2]);
      if (Math.hypot(normal[0], normal[1], normal[2]) > 1e-9) expect(outward).toBeGreaterThan(0);
    }
  });
});
