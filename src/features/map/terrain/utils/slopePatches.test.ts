import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { clipToBox, MAX_PATCHES, slopePatches } from './slopePatches';
import { SLOPE_BANDS, slopeBandIndex } from './slopeBands';
import { makeGrid, wholeGrid } from './testGrid';

const analyse = (grid: ReturnType<typeof makeGrid>, polygon = wholeGrid(grid)) => {
  const result = analyzeTerrain(grid, polygon);
  if (result.ok === false) throw new Error(result.error);
  return result.value;
};

describe('clipToBox', () => {
  const square = [{ lat: 0, lng: 0 }, { lat: 0, lng: 2 }, { lat: 2, lng: 2 }, { lat: 2, lng: 0 }];

  it('cuts an outline down to the part inside the box', () => {
    const out = clipToBox(square, { south: 1, west: 1, north: 3, east: 3 });
    expect(out).toHaveLength(4);
    out.forEach((p) => {
      expect(p.lat).toBeGreaterThanOrEqual(1);
      expect(p.lng).toBeGreaterThanOrEqual(1);
      expect(p.lat).toBeLessThanOrEqual(2);
      expect(p.lng).toBeLessThanOrEqual(2);
    });
  });

  it('leaves nothing when the outline misses the box', () => {
    expect(clipToBox(square, { south: 5, west: 5, north: 6, east: 6 })).toEqual([]);
  });
});

describe('slopePatches', () => {
  it('joins an evenly sloping plot into one patch of its band colour', () => {
    // 1 m rise per 10 m cell: 10% everywhere.
    const analysis = analyse(makeGrid(8, 8, (_r, c) => 400 + c));
    const patches = slopePatches(analysis, wholeGrid(analysis.grid));
    expect(patches).toHaveLength(1);
    expect(patches[0].color).toBe(SLOPE_BANDS[slopeBandIndex(10)].color);
  });

  it('gives each slope its own patch and keeps every patch inside the outline', () => {
    // Gentle on the west half, steep on the east half.
    const grid = makeGrid(8, 8, (_r, c) => 400 + (c < 4 ? c * 0.2 : 0.6 + (c - 3) * 3));
    const triangle = [
      { lat: grid.north, lng: grid.west },
      { lat: grid.north, lng: grid.east },
      { lat: grid.south, lng: grid.west },
    ];
    const patches = slopePatches(analyse(grid, triangle), triangle);
    expect(new Set(patches.map((p) => p.color)).size).toBeGreaterThan(1);
    patches.forEach(({ path }) => path.forEach((p) => {
      // Inside the triangle: on the north-west side of its long edge.
      const t = (p.lat - grid.south) / (grid.north - grid.south) - (p.lng - grid.west) / (grid.east - grid.west);
      expect(t).toBeGreaterThanOrEqual(-1e-9);
    }));
  });

  it('falls back to the five classes when the bands would make too many shapes', () => {
    // A checkerboard of slopes: every cell differs from its neighbours.
    const analysis = analyse(makeGrid(60, 60, (r, c) => 400 + ((r + c) % 2) * ((r * 7 + c * 3) % 5)));
    const patches = slopePatches(analysis, wholeGrid(analysis.grid));
    const classColors = new Set(SLOPE_BANDS.map((b) => b.color));
    patches.forEach((p) => expect(classColors.has(p.color)).toBe(true));
    expect(MAX_PATCHES).toBeGreaterThan(0);
  });
});
