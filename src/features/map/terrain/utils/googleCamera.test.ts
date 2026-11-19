import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { clampRange, GOOGLE_TILT, MAX_RANGE, MIN_RANGE, normalHeading, plotCenter, startCamera } from './googleCamera';
import { makeGrid, wholeGrid } from './testGrid';

const analysisOf = (size: number) => {
  const grid = makeGrid(size, size, (_r, c) => 400 + c, 10);
  const polygon = wholeGrid(grid);
  const result = analyzeTerrain(grid, polygon);
  if (result.ok === false) throw new Error(result.error);
  return { analysis: result.value, polygon, grid };
};

describe('googleCamera', () => {
  it('opens over the middle of the plot, at its height, low and side-on to the slope', () => {
    const { analysis, polygon, grid } = analysisOf(10);
    const cam = startCamera(analysis, polygon, -30, 1.5);
    expect(cam.center.lat).toBeCloseTo((grid.north + grid.south) / 2, 9);
    expect(cam.center.lng).toBeCloseTo((grid.east + grid.west) / 2, 9);
    expect(cam.center.altitude).toBeCloseTo((analysis.stats.minElevation + analysis.stats.maxElevation) / 2, 6);
    // Uphill is −30°: the camera looks across the slope, at 60°.
    expect(cam.heading).toBe(60);
    expect(cam.tilt).toBe(GOOGLE_TILT);
  });

  it('stands further back for a bigger plot, within the limits', () => {
    const small = analysisOf(4);
    const big = analysisOf(80);
    const near = startCamera(small.analysis, small.polygon, 0, 1).range;
    const far = startCamera(big.analysis, big.polygon, 0, 1).range;
    expect(near).toBeGreaterThanOrEqual(MIN_RANGE);
    expect(clampRange(1)).toBe(MIN_RANGE);
    expect(far).toBeGreaterThan(near);
    expect(clampRange(1e9)).toBe(MAX_RANGE);
  });

  it('keeps headings in 0–360 and finds the middle of an outline', () => {
    expect(normalHeading(-45)).toBe(315);
    expect(normalHeading(405)).toBe(45);
    expect(plotCenter([{ lat: 0, lng: 0 }, { lat: 2, lng: 4 }])).toEqual({ lat: 1, lng: 2 });
  });
});
