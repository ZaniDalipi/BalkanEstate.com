/**
 * The best place to build: the largest connected patch of easy ground, and
 * the point deepest inside it (furthest from steeper ground), so a house
 * placed there has room around it. When there is no easy patch big enough,
 * fall back to ground that is workable with earthworks; when even that is
 * missing, there is no spot to suggest.
 */
import type { BuildSpot, ElevationGrid, SlopeField } from '../types';
import { cellCenter, cellSpacingM } from './gridGeometry';
import { EASY_BUILD_MAX_SLOPE, WORKABLE_BUILD_MAX_SLOPE } from './slopeClasses';
import { downhillBearing } from './slopeField';

/** Roughly a small house with a little space around it. */
export const MIN_BUILD_AREA_M2 = 150;
/** Below this average slope a patch counts as level: no way it falls. */
const LEVEL_SLOPE = 1;

/** Which way a patch falls on average, or null when it is level. */
export function patchDownhill(patch: number[], field: SlopeField): number | null {
  let east = 0;
  let north = 0;
  for (const i of patch) { east += field.gradEast[i]; north += field.gradNorth[i]; }
  east /= patch.length;
  north /= patch.length;
  return 100 * Math.hypot(east, north) < LEVEL_SLOPE ? null : Math.round(downhillBearing(east, north));
}

/** Cell indices of the largest 4-connected patch where `ok(i)` holds. */
export function largestPatch(rows: number, cols: number, ok: (i: number) => boolean): number[] {
  const seen = new Uint8Array(rows * cols);
  let best: number[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || !ok(start)) continue;
    const patch: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop() as number;
      patch.push(i);
      const r = Math.floor(i / cols);
      const c = i % cols;
      const next = [r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1, c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1];
      for (const j of next) {
        if (j >= 0 && !seen[j] && ok(j)) { seen[j] = 1; stack.push(j); }
      }
    }
    if (patch.length > best.length) best = patch;
  }
  return best;
}

/** The patch cell furthest (in steps) from the patch's edge; ties go to the gentler cell. */
export function deepestCell(patch: number[], rows: number, cols: number, slope: Float32Array): number {
  const inPatch = new Set(patch);
  const depth = new Map<number, number>();
  let frontier: number[] = [];
  const neighbours = (i: number): number[] => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return [r > 0 ? i - cols : -1, r < rows - 1 ? i + cols : -1, c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1];
  };
  for (const i of patch) {
    if (neighbours(i).some((j) => j < 0 || !inPatch.has(j))) { depth.set(i, 0); frontier.push(i); }
  }
  for (let d = 1; frontier.length; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      for (const j of neighbours(i)) {
        if (j >= 0 && inPatch.has(j) && !depth.has(j)) { depth.set(j, d); next.push(j); }
      }
    }
    frontier = next;
  }
  let best = patch[0];
  for (const i of patch) {
    const di = depth.get(i) ?? 0;
    const db = depth.get(best) ?? 0;
    if (di > db || (di === db && slope[i] < slope[best])) best = i;
  }
  return best;
}

export function findBuildSpot(grid: ElevationGrid, inside: Uint8Array, field: SlopeField): BuildSpot | null {
  const { dx, dy } = cellSpacingM(grid);
  const cellArea = dx * dy;
  const tiers: Array<[BuildSpot['quality'], number]> = [
    ['easy', EASY_BUILD_MAX_SLOPE],
    ['workable', WORKABLE_BUILD_MAX_SLOPE],
  ];
  for (const [quality, maxSlope] of tiers) {
    const patch = largestPatch(grid.rows, grid.cols, (i) => inside[i] === 1 && field.slope[i] < maxSlope);
    if (patch.length * cellArea < MIN_BUILD_AREA_M2) continue;
    const cell = deepestCell(patch, grid.rows, grid.cols, field.slope);
    const { lat, lng } = cellCenter(grid, cell);
    return {
      lat,
      lng,
      areaM2: Math.round(patch.length * cellArea),
      quality,
      elevation: grid.elevations[cell] ?? 0,
      downhill: patchDownhill(patch, field),
    };
  }
  return null;
}
