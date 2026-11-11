/**
 * Range labels written on the slope map ("3–5%", "20–25%"), one per shade,
 * at the heart of that shade's largest patch — so a glance at the map tells
 * how steep each colour is without the legend. Only the biggest patches get
 * one, so small areas don't fill up with text.
 */
import type { ElevationGrid, SlopeField, SlopeLabel } from '../types';
import { deepestCell, largestPatch } from './buildSpot';
import { cellCenter } from './gridGeometry';
import { SLOPE_BANDS, bandLabel, slopeBandIndex } from './slopeBands';

export const MAX_LABELS = 4;
/** A patch needs at least this share of the area (and 3 cells) to be labelled. */
const MIN_SHARE = 0.04;

export function slopeLabels(
  grid: ElevationGrid,
  inside: Uint8Array,
  field: SlopeField,
  max = MAX_LABELS,
): SlopeLabel[] {
  const band = new Int8Array(inside.length).fill(-1);
  let insideCount = 0;
  for (let i = 0; i < inside.length; i++) {
    if (!inside[i] || Number.isNaN(field.slope[i])) continue;
    band[i] = slopeBandIndex(field.slope[i]);
    insideCount++;
  }
  const minCells = Math.max(3, Math.ceil(insideCount * MIN_SHARE));

  const patches = SLOPE_BANDS.map((_, b) => ({ b, cells: largestPatch(grid.rows, grid.cols, (i) => band[i] === b) }))
    .filter((p) => p.cells.length >= minCells)
    .sort((x, y) => y.cells.length - x.cells.length)
    .slice(0, max);

  return patches.map(({ b, cells }) => {
    const { lat, lng } = cellCenter(grid, deepestCell(cells, grid.rows, grid.cols, field.slope));
    return { lat, lng, text: bandLabel(SLOPE_BANDS[b]), color: SLOPE_BANDS[b].color };
  });
}
