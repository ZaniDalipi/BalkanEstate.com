import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { cellCenter, insideMask, requestBounds } from './gridGeometry';
import { SLOPE_CLASSES, classifySlope, slopeRangeLabel } from './slopeClasses';
import { slopeArrows } from './slopeArrows';
import { computeSlopeField, downhillBearing } from './slopeField';
import { computeTerrainStats } from './terrainStats';
import { makeGrid, wholeGrid } from './testGrid';

/** Heights rising 10 m per 100 m to the east (10 % slope), on 10 m cells. */
const eastRising = makeGrid(12, 12, (_r, c) => 500 + c * 1);

describe('slope classes', () => {
  it.each([
    [0, 'flat'], [2.99, 'flat'], [3, 'gentle'], [7.9, 'gentle'], [8, 'moderate'],
    [15, 'steep'], [24.9, 'steep'], [25, 'verySteep'], [120, 'verySteep'],
  ])('%s %% is %s', (pct, id) => {
    expect(classifySlope(pct)).toBe(id);
  });

  it('labels the bands', () => {
    expect(SLOPE_CLASSES.map(slopeRangeLabel)).toEqual(['0–3%', '3–8%', '8–15%', '15–25%', '25%+']);
  });
});

describe('computeSlopeField', () => {
  it('measures a 10 % plane and its fall line', () => {
    const field = computeSlopeField(eastRising);
    const mid = 5 * 12 + 5;
    expect(field.slope[mid]).toBeCloseTo(10, 1);
    expect(downhillBearing(field.gradEast[mid], field.gradNorth[mid])).toBeCloseTo(270, 5); // falls to the west
  });

  it('points downhill to the south when the ground rises to the north', () => {
    const field = computeSlopeField(makeGrid(6, 6, (r) => 600 - r * 2));
    expect(downhillBearing(field.gradEast[14], field.gradNorth[14])).toBeCloseTo(180, 5);
    expect(field.slope[14]).toBeCloseTo(20, 1);
  });

  it('carries the slope on through the grid edge', () => {
    const field = computeSlopeField(eastRising);
    expect(field.slope[0]).toBeCloseTo(10, 1);
    expect(field.slope[12 * 12 - 1]).toBeCloseTo(10, 1);
  });

  it('leaves water cells empty and does not invent cliffs beside them', () => {
    const grid = makeGrid(5, 5, (r, c) => (r === 2 && c === 2 ? null : 300));
    const field = computeSlopeField(grid);
    expect(Number.isNaN(field.slope[12])).toBe(true);
    expect(field.slope[11]).toBe(0);
  });
});

describe('grid geometry', () => {
  it('puts cell 0 in the north-west corner', () => {
    const c = cellCenter(eastRising, 0);
    expect(c.lat).toBeLessThan(eastRising.north);
    expect(c.lat).toBeGreaterThan(eastRising.north - (eastRising.north - eastRising.south) / 6);
    expect(c.lng).toBeGreaterThan(eastRising.west);
    expect(c.lng).toBeLessThan(eastRising.west + (eastRising.east - eastRising.west) / 6);
  });

  it('marks the cells inside a drawn area', () => {
    const midLng = (eastRising.west + eastRising.east) / 2;
    const westHalf = [
      { lat: eastRising.north, lng: eastRising.west },
      { lat: eastRising.north, lng: midLng },
      { lat: eastRising.south, lng: midLng },
      { lat: eastRising.south, lng: eastRising.west },
    ];
    const mask = insideMask(eastRising, westHalf);
    expect(mask.reduce((n, v) => n + v, 0)).toBe(72);
    expect(mask[0]).toBe(1);
    expect(mask[11]).toBe(0);
  });

  it('widens the margin on large areas to about a grid cell', () => {
    const b = requestBounds([{ lat: 42, lng: 20 }, { lat: 42.05, lng: 20 }, { lat: 42.05, lng: 20.05 }]);
    expect((42 - b.south) * 110574).toBeGreaterThan(80);
  });

  it('asks for a margin around the area, rounded so the same area is cached', () => {
    // 1.1 km tall, 2.5 km wide: the margin is 1.5 % of 2.5 km ≈ 37 m.
    const b = requestBounds([{ lat: 42.1, lng: 20.1 }, { lat: 42.11, lng: 20.12 }, { lat: 42.105, lng: 20.13 }]);
    expect((42.1 - b.south) * 110574).toBeCloseTo(37, -1);
    expect((b.north - 42.11) * 110574).toBeCloseTo(37, -1);
    expect(b.west).toBeLessThan(20.1);
    expect(b.east).toBeGreaterThan(20.13);
    expect(String(b.west).split('.')[1].length).toBeLessThanOrEqual(5);
  });
});

describe('computeTerrainStats', () => {
  it('splits the ground into bands and reports the height range', () => {
    // West half flat (500 m); east half climbs 3 m per 10 m cell (30 %).
    const grid = makeGrid(10, 10, (_r, c) => (c < 5 ? 500 : 500 + (c - 4) * 3));
    const field = computeSlopeField(grid);
    const inside = new Uint8Array(100).fill(1);
    const stats = computeTerrainStats(grid, inside, field, 10000)!;
    expect(stats.areaM2).toBe(10000);
    expect(stats.minElevation).toBe(500);
    expect(stats.maxElevation).toBe(515);
    expect(stats.classShares.flat).toBeCloseTo(0.4, 5);
    expect(stats.classShares.verySteep).toBeGreaterThan(0.3);
    expect(Object.values(stats.classShares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(stats.maxSlope).toBeCloseTo(30, 0);
    expect(stats.meanSlope).toBeGreaterThan(0);
  });

  it('has nothing to report when the area is all water', () => {
    const grid = makeGrid(4, 4, () => null);
    expect(computeTerrainStats(grid, new Uint8Array(16).fill(1), computeSlopeField(grid), 100)).toBeNull();
  });
});

describe('slopeArrows', () => {
  it('points every arrow downhill, and keeps their number near the target', () => {
    const grid = makeGrid(40, 40, (_r, c) => 500 + c);
    const arrows = slopeArrows(grid, new Uint8Array(1600).fill(1), computeSlopeField(grid), null, 30);
    expect(arrows.length).toBeGreaterThan(10);
    expect(arrows.length).toBeLessThanOrEqual(40);
    expect(new Set(arrows.map((a) => a.bearing))).toEqual(new Set([270]));
  });

  it('draws no arrows on flat ground', () => {
    const grid = makeGrid(20, 20, () => 300);
    expect(slopeArrows(grid, new Uint8Array(400).fill(1), computeSlopeField(grid))).toEqual([]);
  });
});

describe('analyzeTerrain', () => {
  it('reports noData when the area has no heights', () => {
    const grid = makeGrid(5, 5, () => null);
    expect(analyzeTerrain(grid, wholeGrid(grid))).toEqual({ ok: false, error: 'noData' });
  });

  it('brings slope, stats, arrows and a build spot together', () => {
    const result = analyzeTerrain(eastRising, wholeGrid(eastRising));
    if (result.ok === false) throw new Error(result.error);
    expect(result.value.stats.meanSlope).toBeGreaterThan(5);
    expect(result.value.stats.areaM2).toBeGreaterThan(14000);
    expect(result.value.arrows.length).toBeGreaterThan(0);
    // 10 % everywhere: no easy ground, but workable ground.
    expect(result.value.buildSpot?.quality).toBe('workable');
  });
});
