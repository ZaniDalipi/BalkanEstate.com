import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { ringArea, slopeZones, smoothRing, traceRings } from './slopeZones';
import { makeGrid, wholeGrid } from './testGrid';

describe('traceRings', () => {
  it('outlines a block of cells clockwise', () => {
    const rings = traceRings(4, 4, (r, c) => r >= 1 && r <= 2 && c >= 1 && c <= 2);
    expect(rings).toHaveLength(1);
    expect(ringArea(rings[0]) / 2).toBe(4);
  });

  it('gives a hole as its own ring, running the other way', () => {
    // A 5×5 ring of cells with the middle one missing.
    const rings = traceRings(5, 5, (r, c) => !(r === 2 && c === 2));
    const areas = rings.map((ring) => ringArea(ring) / 2).sort((a, b) => a - b);
    expect(areas).toEqual([-1, 25]);
  });

  it('keeps separate patches separate', () => {
    expect(traceRings(3, 5, (_r, c) => c === 0 || c === 4)).toHaveLength(2);
  });
});

describe('smoothRing', () => {
  it('rounds corners without moving the shape away', () => {
    const square: Array<[number, number]> = [[0, 0], [0, 4], [4, 4], [4, 0]];
    const smooth = smoothRing(square);
    expect(smooth.length).toBe(16);
    expect(smooth.every(([r, c]) => r >= 0 && r <= 4 && c >= 0 && c <= 4)).toBe(true);
    // The sharp corners themselves are cut away.
    const corners = smooth.filter(([r, c]) => (r === 0 || r === 4) && (c === 0 || c === 4));
    expect(corners).toEqual([]);
  });
});

describe('slopeZones', () => {
  it('gives one zone per class present, coloured like the legend, inside the grid', () => {
    // West half flat; east half climbing 4 m per 10 m cell (40 %).
    const grid = makeGrid(12, 12, (_r, c) => (c < 6 ? 400 : 400 + (c - 5) * 4));
    const result = analyzeTerrain(grid, wholeGrid(grid));
    if (result.ok === false) throw new Error(result.error);
    const zones = slopeZones(result.value);
    const classes = zones.map((z) => z.classId);
    expect(classes).toContain('flat');
    expect(classes).toContain('verySteep');
    const flat = zones.find((z) => z.classId === 'flat')!;
    expect(flat.outer.every((p) => p.lat <= grid.north && p.lat >= grid.south && p.lng >= grid.west && p.lng <= grid.east)).toBe(true);
    expect(Math.max(...flat.outer.map((p) => p.lng))).toBeLessThan((grid.west + grid.east) / 2 + 0.0002);
  });

  it('leaves out specks of a single cell', () => {
    const grid = makeGrid(8, 8, (r, c) => (r === 4 && c === 4 ? 404 : 400));
    const result = analyzeTerrain(grid, wholeGrid(grid));
    if (result.ok === false) throw new Error(result.error);
    expect(slopeZones(result.value).every((z) => z.outer.length > 4)).toBe(true);
  });
});
