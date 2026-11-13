/**
 * Range labels written on the slope map ("3–5%", "20–25%"), one per shade,
 * at the heart of that shade's largest patch — so a glance at the map tells
 * how steep each colour is without the legend. Only the biggest patches get
 * one, so small areas don't fill up with text, and none lands on the house at
 * the best spot.
 */
import type { ElevationGrid, SlopeField, SlopeLabel, TerrainPoint } from '../types';
import { deepestCell, largestPatch } from './buildSpot';
import { cellCenter, cellSpacingM, metresBetween } from './gridGeometry';
import { SLOPE_BANDS, bandLabel, slopeBandIndex } from './slopeBands';

export const MAX_LABELS = 4;
/** A patch needs at least this share of the area (and 3 cells) to be labelled. */
const MIN_SHARE = 0.04;
/** Labels stay at least this far from the house drawn at the best spot, metres… */
export const CLEAR_OF_HOUSE_M = 18;
/** …and further on big areas, where the map is zoomed out and metres are fewer pixels: this share of the area's width. */
const CLEAR_SHARE = 0.08;

export function slopeLabels(
  grid: ElevationGrid,
  inside: Uint8Array,
  field: SlopeField,
  /** The best spot, which has a house on it: labels go elsewhere. */
  avoid: TerrainPoint | null = null,
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
  const { dx, dy } = cellSpacingM(grid);
  const clearM = Math.max(CLEAR_OF_HOUSE_M, CLEAR_SHARE * Math.sqrt(insideCount * dx * dy));

  const patches = SLOPE_BANDS.map((_, b) => ({ b, cells: largestPatch(grid.rows, grid.cols, (i) => band[i] === b) }))
    .filter((p) => p.cells.length >= minCells)
    .sort((x, y) => y.cells.length - x.cells.length)
    .slice(0, max);

  const labels: SlopeLabel[] = [];
  for (const { b, cells } of patches) {
    const free = avoid ? cells.filter((i) => metresBetween(cellCenter(grid, i), avoid) >= clearM) : cells;
    if (!free.length) continue;
    const { lat, lng } = cellCenter(grid, deepestCell(free, grid.rows, grid.cols, field.slope));
    labels.push({ lat, lng, text: bandLabel(SLOPE_BANDS[b]), color: SLOPE_BANDS[b].color });
  }
  return labels;
}
