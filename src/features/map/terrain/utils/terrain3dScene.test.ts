import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { SLOPE_BANDS } from './slopeBands';
import {
  BLOCK_BASE_M,
  MAX_PITCH,
  areaBounds,
  areaFeature,
  blockHeight,
  cellBlocks,
  clampPitch,
  defaultExaggeration,
  imageCorners,
  terrain3dStyle,
} from './terrain3dScene';
import { makeGrid, wholeGrid } from './testGrid';
import type { TerrainStats } from '../types';

const stats = (areaM2: number, min: number, max: number): TerrainStats => ({
  areaM2, minElevation: min, maxElevation: max, meanSlope: 0, maxSlope: 0,
  classShares: { flat: 1, gentle: 0, moderate: 0, steep: 0, verySteep: 0 },
});

describe('cellBlocks', () => {
  // West half flat at 300 m, east half climbing 3 m per cell.
  const grid = makeGrid(6, 6, (_r, c) => (c < 3 ? 300 : 300 + (c - 2) * 3));
  const result = analyzeTerrain(grid, wholeGrid(grid));
  if (result.ok === false) throw new Error(result.error);
  const blocks = cellBlocks(result.value);

  it('raises one tile per measured cell, as tall as its ground above the lowest point', () => {
    expect(blocks.features).toHaveLength(36);
    const rises = blocks.features.map((f) => f.properties?.rise as number);
    expect(Math.min(...rises)).toBe(0);
    expect(Math.max(...rises)).toBe(9);
  });

  it('colours each tile by its slope shade and leaves a gap between tiles', () => {
    const first = blocks.features[0];
    expect(first.properties?.color).toBe(SLOPE_BANDS[0].color);
    const ring = first.geometry.coordinates[0];
    expect(ring).toHaveLength(5);
    expect(ring[0][0]).toBeGreaterThan(grid.west); // inset from the cell edge
    expect(ring[0][1]).toBeLessThan(grid.north);
  });

  it('builds the height expression with a minimum thickness', () => {
    expect(blockHeight(2)).toEqual(['+', BLOCK_BASE_M, ['*', ['get', 'rise'], 2]]);
  });
});

describe('3D scene helpers', () => {
  it('stretches gentle land more than hills', () => {
    expect(defaultExaggeration(stats(10000, 500, 502))).toBe(3); // 2 m over 100 m
    expect(defaultExaggeration(stats(10000, 500, 510))).toBe(2); // 10 m over 100 m
    expect(defaultExaggeration(stats(10000, 500, 540))).toBe(1); // 40 m over 100 m
  });

  it('closes the area ring and frames it', () => {
    const pts = [{ lat: 42, lng: 20 }, { lat: 42.01, lng: 20 }, { lat: 42.01, lng: 20.02 }];
    expect(areaFeature(pts).geometry.coordinates[0]).toEqual([[20, 42], [20, 42.01], [20.02, 42.01], [20, 42]]);
    expect(areaBounds(pts)).toEqual([[20, 42], [20.02, 42.01]]);
  });

  it('places the slope picture by its corners, clockwise from the north-west', () => {
    const grid = makeGrid(2, 2, () => 1);
    expect(imageCorners(grid)).toEqual([[grid.west, grid.north], [grid.east, grid.north], [grid.east, grid.south], [grid.west, grid.south]]);
  });

  it('keeps the tilt between straight down and the limit', () => {
    expect(clampPitch(-10)).toBe(0);
    expect(clampPitch(200)).toBe(MAX_PITCH);
  });

  it('uses Terrarium elevation and satellite imagery, with relief off until a view turns it on', () => {
    const style = terrain3dStyle();
    expect(style.sources.dem).toMatchObject({ type: 'raster-dem', encoding: 'terrarium' });
    expect(style.sources.satellite).toMatchObject({ type: 'raster' });
    expect(style.terrain).toBeUndefined();
  });
});
