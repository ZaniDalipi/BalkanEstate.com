/**
 * Slope and fall line of every grid cell, by Horn's method: the height
 * gradient from the 3 × 3 block around each cell, with the direct neighbours
 * weighted double. A missing neighbour (grid edge, water) is extended from
 * the cells that are there, carrying the slope on straight through: a side
 * neighbour mirrors the opposite one, a corner one adds up its two sides.
 * With nothing to extend from it takes the centre height, which reads as flat
 * rather than inventing a cliff.
 */
import type { ElevationGrid, SlopeField } from '../types';
import { cellSpacingM } from './gridGeometry';

export function computeSlopeField(grid: ElevationGrid): SlopeField {
  const { rows, cols, elevations } = grid;
  const { dx, dy } = cellSpacingM(grid);
  const n = rows * cols;
  const slope = new Float32Array(n).fill(Number.NaN);
  const gradEast = new Float32Array(n).fill(Number.NaN);
  const gradNorth = new Float32Array(n).fill(Number.NaN);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const e = elevations[i];
      if (e === null) continue;
      const raw = (dr: number, dc: number): number | null => {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) return null;
        return elevations[rr * cols + cc];
      };
      const z = (dr: number, dc: number): number => {
        const own = raw(dr, dc);
        if (own !== null) return own;
        if (dr !== 0 && dc !== 0) return z(dr, 0) + z(0, dc) - e;
        const opposite = raw(-dr, -dc);
        return opposite === null ? e : 2 * e - opposite;
      };
      // Row −1 is north, column +1 is east.
      const east = (z(-1, 1) + 2 * z(0, 1) + z(1, 1) - (z(-1, -1) + 2 * z(0, -1) + z(1, -1))) / (8 * dx);
      const north = (z(-1, -1) + 2 * z(-1, 0) + z(-1, 1) - (z(1, -1) + 2 * z(1, 0) + z(1, 1))) / (8 * dy);
      gradEast[i] = east;
      gradNorth[i] = north;
      slope[i] = 100 * Math.hypot(east, north);
    }
  }
  return { slope, gradEast, gradNorth };
}

/** Compass bearing (0 = north, clockwise) of the way down a gradient. */
export function downhillBearing(gradEast: number, gradNorth: number): number {
  const deg = (Math.atan2(-gradEast, -gradNorth) * 180) / Math.PI;
  return (deg + 360) % 360;
}
