import { describe, expect, it } from 'vitest';
import { MIN_BUILD_AREA_M2, deepestCell, findBuildSpot, largestPatch } from './buildSpot';
import { computeSlopeField } from './slopeField';
import { makeGrid } from './testGrid';
import { TERRAIN_MAX_SIDE_M, validateTerrainArea } from './validateTerrainArea';

describe('largestPatch', () => {
  it('keeps the bigger of two separate patches', () => {
    // 1 1 0 1
    // 1 0 0 1
    // 0 0 0 1
    const ok = [1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1];
    expect(largestPatch(3, 4, (i) => ok[i] === 1).sort((a, b) => a - b)).toEqual([0, 1, 4]);
  });
});

describe('deepestCell', () => {
  it('picks the middle of a square patch', () => {
    const patch = Array.from({ length: 25 }, (_, i) => i);
    expect(deepestCell(patch, 5, 5, new Float32Array(25))).toBe(12);
  });
});

describe('findBuildSpot', () => {
  it('finds the flat ground and sits well inside it', () => {
    // West 8 columns flat; east climbs 4 m per 10 m cell (40 %).
    const grid = makeGrid(12, 16, (_r, c) => (c < 8 ? 400 : 400 + (c - 7) * 4));
    const spot = findBuildSpot(grid, new Uint8Array(192).fill(1), computeSlopeField(grid))!;
    expect(spot.quality).toBe('easy');
    const westHalfEast = grid.west + (grid.east - grid.west) / 2;
    expect(spot.lng).toBeLessThan(westHalfEast);
    expect(spot.lat).toBeLessThan(grid.north);
    expect(spot.lat).toBeGreaterThan(grid.south);
    expect(spot.areaM2).toBeGreaterThan(7 * 12 * 100 * 0.9);
  });

  it('falls back to workable ground when nothing is easy', () => {
    const grid = makeGrid(10, 10, (_r, c) => 400 + c * 1.2); // 12 %
    expect(findBuildSpot(grid, new Uint8Array(100).fill(1), computeSlopeField(grid))?.quality).toBe('workable');
  });

  it('suggests nothing on steep land', () => {
    const grid = makeGrid(10, 10, (_r, c) => 400 + c * 4); // 40 %
    expect(findBuildSpot(grid, new Uint8Array(100).fill(1), computeSlopeField(grid))).toBeNull();
  });

  it('ignores flat patches too small for a house', () => {
    const grid = makeGrid(10, 10, () => 400, 3); // 9 m² cells
    const inside = new Uint8Array(100);
    inside[0] = 1; // one 9 m² cell
    expect(9).toBeLessThan(MIN_BUILD_AREA_M2);
    expect(findBuildSpot(grid, inside, computeSlopeField(grid))).toBeNull();
  });
});

describe('validateTerrainArea', () => {
  const square = (sizeDeg: number) => [
    { lat: 42, lng: 20 },
    { lat: 42, lng: 20 + sizeDeg },
    { lat: 42 + sizeDeg, lng: 20 + sizeDeg },
    { lat: 42 + sizeDeg, lng: 20 },
  ];

  it('accepts a normal plot', () => {
    expect(validateTerrainArea(square(0.002))).toEqual({ isValid: true });
  });

  it.each([
    ['tooFewPoints', square(0.002).slice(0, 2)],
    ['edgesCross', [{ lat: 42, lng: 20 }, { lat: 42.002, lng: 20.002 }, { lat: 42, lng: 20.002 }, { lat: 42.002, lng: 20 }]],
    ['tooSmall', square(0.00005)],
    ['tooLarge', square((TERRAIN_MAX_SIDE_M + 500) / 110574)],
  ])('rejects %s', (error, points) => {
    expect(validateTerrainArea(points)).toEqual({ isValid: false, error });
  });
});
