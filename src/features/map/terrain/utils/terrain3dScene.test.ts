import { describe, expect, it } from 'vitest';
import { analyzeTerrain } from './analyzeTerrain';
import { rampHex } from './slopeRamp';
import {
  BLOCK_BASE_M,
  DEM_SOURCE,
  blockHeight,
  blockTop,
  cellBlocks,
  MAX_PITCH,
  SATELLITE_MAX_ZOOM,
  START_BEARING,
  areaBounds,
  areaFeature,
  clampPitch,
  defaultExaggeration,
  easeInOut,
  framePadding,
  imageCorners,
  openingBearing,
  terrain3dStyle,
  verticalPx,
} from './terrain3dScene';
import { makeGrid, wholeGrid } from './testGrid';
import type { TerrainStats } from '../types';

const stats = (areaM2: number, min: number, max: number): TerrainStats => ({
  areaM2, minElevation: min, maxElevation: max, meanSlope: 0, maxSlope: 0,
  classShares: { flat: 1, gentle: 0, moderate: 0, steep: 0, verySteep: 0 },
});

const analysed = (height: (r: number, c: number) => number) => {
  const grid = makeGrid(10, 10, height);
  const result = analyzeTerrain(grid, wholeGrid(grid));
  if (result.ok === false) throw new Error(result.error);
  return result.value;
};

describe('3D base map', () => {
  const style = terrain3dStyle('slope', 2);

  it('stands satellite imagery on the real relief, stretched as asked — but not under the blocks', () => {
    expect(style.sources[DEM_SOURCE]).toMatchObject({ type: 'raster-dem', encoding: 'terrarium', maxzoom: 14 });
    expect(style.terrain).toEqual({ source: DEM_SOURCE, exaggeration: 2 });
    expect(terrain3dStyle('blocks', 2).terrain).toBeUndefined();
    expect(style.layers.map((l) => l.type)).toEqual(['background', 'raster', 'hillshade']);
  });

  it('shades the relief from its own copy of the heights', () => {
    const shade = style.layers.find((l) => l.type === 'hillshade') as { source: string };
    expect(shade.source).not.toBe(DEM_SOURCE);
    expect(style.sources[shade.source]).toMatchObject({ type: 'raster-dem' });
  });

  it('never asks for satellite zooms that show "Map data not yet available"', () => {
    expect(SATELLITE_MAX_ZOOM).toBe(17);
    expect(style.sources.satellite).toMatchObject({ type: 'raster', maxzoom: 17 });
  });
});

describe('3D camera', () => {
  it('opens looking uphill from the low side, so higher ground beyond cannot hide the area', () => {
    expect(openingBearing(analysed((_r, c) => 400 + c * 2))).toBe(90); // rises to the east → look east
    expect(openingBearing(analysed((r) => 400 + r * 2))).toBe(180); // rises to the south → look south
  });

  it('opens on the default view over level ground', () => {
    expect(openingBearing(analysed(() => 400))).toBe(START_BEARING);
  });

  it('keeps the tilt between straight down and the limit', () => {
    expect(clampPitch(-10)).toBe(0);
    expect(clampPitch(200)).toBe(MAX_PITCH);
  });

  it('lifts a label by what stands under it, more when tilted, none from straight above', () => {
    expect(verticalPx(10, 18, 41, 0)).toBe(0);
    expect(verticalPx(10, 18, 41, 60)).toBeGreaterThan(verticalPx(10, 18, 41, 30));
    expect(verticalPx(10, 19, 41, 60)).toBeCloseTo(2 * verticalPx(10, 18, 41, 60), 6);
  });

  it('frames the area clear of the info card and the controls, which take more room on a phone', () => {
    const phone = framePadding(390);
    const desktop = framePadding(1100);
    expect(phone.top).toBeGreaterThan(desktop.top);
    expect(phone.bottom).toBeGreaterThan(desktop.bottom);
    expect(phone.left).toBeLessThan(desktop.left);
    expect(desktop.bottom).toBeGreaterThan(desktop.top); // the controls are taller than the gap above
  });

  it('eases height changes in and out', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.25)).toBeLessThan(0.25);
    expect(easeInOut(0.75)).toBeGreaterThan(0.75);
  });
});

describe('cellBlocks', () => {
  // West half flat at 300 m, east half climbing 3 m per cell.
  const result = analyzeTerrain(makeGrid(6, 6, (_r, c) => (c < 3 ? 300 : 300 + (c - 2) * 3)), wholeGrid(makeGrid(6, 6, () => 0)));
  if (result.ok === false) throw new Error(result.error);
  const blocks = cellBlocks(result.value);

  it('raises one tile per measured cell, as tall as its ground above the lowest point', () => {
    expect(blocks.features).toHaveLength(36);
    const rises = blocks.features.map((f) => f.properties?.rise as number);
    expect(Math.min(...rises)).toBe(0);
    expect(Math.max(...rises)).toBe(9);
  });

  it('colours each tile from the colour scale at its own slope, with a gap to its neighbours', () => {
    const first = blocks.features[0];
    expect(first.properties?.color).toBe(rampHex(result.value.field.slope[0]));
    expect(first.geometry.coordinates[0][0][0]).toBeGreaterThan(result.value.grid.west);
  });

  it('builds heights with a minimum thickness, and knows where the top of a block is', () => {
    expect(blockHeight(2)).toEqual(['+', BLOCK_BASE_M, ['*', ['get', 'rise'], 2]]);
    expect(blockTop(610, 600, 3)).toBeCloseTo(30.6, 6);
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
});
