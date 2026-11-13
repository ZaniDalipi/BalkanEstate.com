/**
 * Arrows that show which way the ground falls. The area is split into square
 * blocks of cells; each block gets one arrow at its middle, pointing along
 * the block's average gradient, so a noisy cell doesn't swing the arrow. Flat
 * blocks get none: there is no "downhill" there to show. Nor does the block
 * the house at the best spot stands on.
 */
import type { ElevationGrid, SlopeArrow, SlopeField, TerrainPoint } from '../types';
import { cellCenter, metresBetween } from './gridGeometry';
import { HOUSE_CLEARANCE_M } from './house';
import { FLAT_SLOPE } from './slopeClasses';
import { downhillBearing } from './slopeField';

/** About this many arrows over the whole area, whatever its size. */
export const TARGET_ARROWS = 16;

export function slopeArrows(
  grid: ElevationGrid,
  inside: Uint8Array,
  field: SlopeField,
  /** The best spot, which has a house on it: no arrow is drawn over it. */
  avoid: TerrainPoint | null = null,
  target = TARGET_ARROWS,
): SlopeArrow[] {
  const insideCount = inside.reduce((n, v) => n + v, 0);
  if (insideCount === 0) return [];
  const block = Math.max(2, Math.ceil(Math.sqrt(insideCount / target)));
  const arrows: SlopeArrow[] = [];

  for (let r0 = 0; r0 < grid.rows; r0 += block) {
    for (let c0 = 0; c0 < grid.cols; c0 += block) {
      let east = 0;
      let north = 0;
      let n = 0;
      for (let r = r0; r < Math.min(r0 + block, grid.rows); r++) {
        for (let c = c0; c < Math.min(c0 + block, grid.cols); c++) {
          const i = r * grid.cols + c;
          if (!inside[i] || Number.isNaN(field.slope[i])) continue;
          east += field.gradEast[i];
          north += field.gradNorth[i];
          n++;
        }
      }
      // Skip blocks mostly outside the area, and flat ones.
      if (n < (block * block) / 2) continue;
      if (100 * Math.hypot(east / n, north / n) < FLAT_SLOPE) continue;
      const mid = Math.min(r0 + Math.floor(block / 2), grid.rows - 1) * grid.cols
        + Math.min(c0 + Math.floor(block / 2), grid.cols - 1);
      if (!inside[mid]) continue;
      const { lat, lng } = cellCenter(grid, mid);
      if (avoid && metresBetween({ lat, lng }, avoid) < HOUSE_CLEARANCE_M) continue;
      arrows.push({ lat, lng, bearing: Math.round(downhillBearing(east, north)) });
    }
  }
  return arrows;
}
