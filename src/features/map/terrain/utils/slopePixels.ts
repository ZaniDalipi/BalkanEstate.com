/**
 * The slope map as pixels: a smooth surface coloured by steepness, softly lit
 * so the relief shows, with thin white contour lines of equal height on top
 * (every fifth one stronger, as on printed maps). Pure: grid in, RGBA out.
 */
import type { ElevationGrid, SlopeField } from '../types';
import { INDEX_EVERY } from './contours';
import { cellSpacingM } from './gridGeometry';
import { shadeChannel, shadeFactor } from './hillshade';
import { fillGaps, resampleSmooth, soften } from './resample';
import { rampIndex, rampLookup } from './slopeRamp';

export interface ImagePlan {
  width: number;
  height: number;
  pxPerCell: number;
}

/** How solid the colour is over the satellite photo (0–255). */
const FILL_ALPHA = 218;
/** The elevation survey is ~30 m: cells finer than that carry its grid pattern, which is softened away. */
const softeningPasses = (cellSizeM: number): number => (cellSizeM < 15 ? 2 : cellSizeM < 30 ? 1 : 0);
const LINE_STRENGTH = 0.55;
const INDEX_LINE_STRENGTH = 0.85;
/** Lines keep their width where the ground is nearly level, instead of spreading into bands. */
const MIN_GRADIENT = 0.004;

const LUT = rampLookup();

export function renderSlopePixels(
  grid: ElevationGrid,
  field: SlopeField,
  plan: ImagePlan,
  contourIntervalM: number | null,
): Uint8ClampedArray {
  const { rows, cols } = grid;
  const { width, height, pxPerCell } = plan;
  const passes = softeningPasses(grid.cellSizeM);
  const smooth = (values: ArrayLike<number | null>, soft: boolean) => {
    const filled = fillGaps(values, rows, cols);
    return resampleSmooth(soft ? soften(filled, rows, cols, passes) : filled, rows, cols, height, width);
  };
  const elevation = smooth(grid.elevations, false);
  const slope = smooth(field.slope, true);
  const gradEast = smooth(field.gradEast, true);
  const gradNorth = smooth(field.gradNorth, true);

  const { dx, dy } = cellSpacingM(grid);
  const metersPerPx = (dx + dy) / 2 / pxPerCell;
  // Line width follows the picture's size, so lines look the same on a small plot and a large area.
  const halfLine = Math.max(0.6, Math.max(width, height) / 1100);
  const out = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const row = Math.min(rows - 1, Math.floor(y / pxPerCell));
    for (let x = 0; x < width; x++) {
      const cell = row * cols + Math.min(cols - 1, Math.floor(x / pxPerCell));
      if (grid.elevations[cell] === null || Number.isNaN(field.slope[cell])) continue; // water: left clear
      const p = y * width + x;
      const lut = rampIndex(slope[p]) * 3;
      const shade = shadeFactor(gradEast[p], gradNorth[p]);
      let r = shadeChannel(LUT[lut], shade);
      let g = shadeChannel(LUT[lut + 1], shade);
      let b = shadeChannel(LUT[lut + 2], shade);
      let alpha = FILL_ALPHA;

      if (contourIntervalM !== null) {
        const level = Math.round(elevation[p] / contourIntervalM);
        const gradient = Math.max(MIN_GRADIENT, Math.hypot(gradEast[p], gradNorth[p]));
        const distancePx = Math.abs(elevation[p] - level * contourIntervalM) / (gradient * metersPerPx);
        const index = level % INDEX_EVERY === 0;
        const cover = Math.min(1, Math.max(0, (index ? halfLine * 1.6 : halfLine) + 0.5 - distancePx));
        if (cover > 0) {
          const line = cover * (index ? INDEX_LINE_STRENGTH : LINE_STRENGTH);
          r += (255 - r) * line;
          g += (255 - g) * line;
          b += (255 - b) * line;
          alpha = Math.max(alpha, 255 * line);
        }
      }
      out[p * 4] = r;
      out[p * 4 + 1] = g;
      out[p * 4 + 2] = b;
      out[p * 4 + 3] = alpha;
    }
  }
  return out;
}
