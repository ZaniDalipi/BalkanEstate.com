import { describe, expect, it } from 'vitest';
import { cellCenter } from './gridGeometry';
import { heightSampler } from './heightSampler';
import { makeGrid } from './testGrid';

describe('heightSampler', () => {
  const grid = makeGrid(4, 4, (r, c) => 100 + c * 2 + r);
  const at = heightSampler(grid);

  it('gives each cell centre its own height', () => {
    expect(at(cellCenter(grid, 0))).toBeCloseTo(100, 6);
    expect(at(cellCenter(grid, 2 * 4 + 3))).toBeCloseTo(108, 6);
  });

  it('blends between cell centres', () => {
    const a = cellCenter(grid, 0);
    const b = cellCenter(grid, 1);
    expect(at({ lat: a.lat, lng: (a.lng + b.lng) / 2 })).toBeCloseTo(101, 6);
  });

  it('carries the edge on past the grid', () => {
    expect(at({ lat: grid.north + 1, lng: grid.west - 1 })).toBeCloseTo(100, 6);
  });
});
