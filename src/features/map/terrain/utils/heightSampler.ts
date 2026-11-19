/**
 * The height of the ground anywhere in a heights grid, blended between the
 * four nearest cell centres (gaps filled first). Outside the grid the edge
 * cells' heights carry on. Pure.
 */
import type { ElevationGrid, TerrainPoint } from '../types';
import { fillGaps } from './resample';

export type HeightAt = (p: TerrainPoint) => number;

export function heightSampler(grid: ElevationGrid): HeightAt {
  const { rows, cols } = grid;
  const h = fillGaps(grid.elevations, rows, cols);
  const clamp = (v: number, max: number) => Math.min(max, Math.max(0, v));
  return (p) => {
    // Position in cells, with cell centres on whole numbers.
    const fr = clamp(((grid.north - p.lat) / (grid.north - grid.south)) * rows - 0.5, rows - 1);
    const fc = clamp(((p.lng - grid.west) / (grid.east - grid.west)) * cols - 0.5, cols - 1);
    const r0 = Math.floor(fr);
    const c0 = Math.floor(fc);
    const r1 = Math.min(rows - 1, r0 + 1);
    const c1 = Math.min(cols - 1, c0 + 1);
    const tr = fr - r0;
    const tc = fc - c0;
    const top = h[r0 * cols + c0] * (1 - tc) + h[r0 * cols + c1] * tc;
    const bottom = h[r1 * cols + c0] * (1 - tc) + h[r1 * cols + c1] * tc;
    return top * (1 - tr) + bottom * tr;
  };
}
