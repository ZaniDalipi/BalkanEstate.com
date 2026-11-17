/**
 * Finding the walls of a floor-plan picture, so the plan can be shown as a
 * model with its walls standing up. Works for drawn plans with filled walls
 * and for paper plans photographed with a phone (uneven light, walls drawn
 * as two thin lines, often hatched):
 *
 * 1. ink — a pixel clearly darker than the paper around it, or dark outright;
 * 2. close — a wall's two lines and its hatching become one solid wall;
 * 3. drop thick — areas wider than any wall (a tiled floor, the table round
 *    the sheet) go;
 * 4. open — thin strokes (text, dimension lines, furniture outlines) go;
 * 5. keep long — only shapes long enough to be walls stay.
 */
import { closeMask, dropThick, keepLong, openMask } from './maskOps';

export { openMask } from './maskOps';

export interface WallMask {
  width: number;
  height: number;
  /** 1 = wall, 0 = not, row by row. */
  cells: Uint8Array;
  /** The walls' extent (longer side of their bounding box), in cells: the building's size on the sheet. */
  span: number;
}

/** Dark outright (0–255 luminance): a filled wall, whatever surrounds it. */
const DARK = 85;
/** Darker than the local paper by this much: a pencil or ink line on a photographed sheet. */
const BELOW_PAPER = 38;
/** Greyer than this (max − min channel): coloured furniture, plants and floors are not walls. */
const GREY = 70;
/** Walls must cover at least this share of the picture… */
const MIN_SHARE = 0.004;
/** …and at most this (a dark or photographic picture is not a line plan). */
const MAX_SHARE = 0.3;

/** Sizes of the steps, as shares of the picture's longer side. */
const SCALE = {
  /** Neighbourhood the paper's brightness is measured over. */
  paper: 1 / 24,
  /** Widest gap between a wall's two lines that is filled in. */
  close: 1 / 90,
  /** Half the thickest wall kept. */
  thick: 1 / 45,
  /** Shortest wall kept. */
  span: 1 / 12,
} as const;

/** Opening radius for a picture of this size: about 1/380 of its longer side. */
export const openingRadius = (width: number, height: number): number => Math.max(1, Math.round(Math.max(width, height) / 380));

const luminance = (data: Uint8ClampedArray) => {
  const lum = new Float32Array(data.length / 4);
  for (let p = 0, i = 0; p < lum.length; p += 1, i += 4) lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return lum;
};

/** Mean of `values` over the square of radius r round each cell (summed-area table). */
export function localMean(values: Float32Array, width: number, height: number, r: number): Float32Array {
  const sum = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) {
      row += values[y * width + x];
      sum[(y + 1) * (width + 1) + x + 1] = sum[y * (width + 1) + x + 1] + row;
    }
  }
  const out = new Float32Array(values.length);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height, y + r + 1);
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width, x + r + 1);
      const total = sum[y1 * (width + 1) + x1] - sum[y0 * (width + 1) + x1] - sum[y1 * (width + 1) + x0] + sum[y0 * (width + 1) + x0];
      out[y * width + x] = total / ((x1 - x0) * (y1 - y0));
    }
  }
  return out;
}

/** Ink: opaque, greyish pixels that are dark outright or clearly darker than the paper round them (pure). */
export function darkPixels(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const lum = luminance(data);
  const paper = localMean(lum, width, height, Math.max(2, Math.round(Math.max(width, height) * SCALE.paper)));
  const out = new Uint8Array(width * height);
  for (let p = 0, i = 0; p < out.length; p += 1, i += 4) {
    if (data[i + 3] < 128) continue;
    const grey = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) < GREY;
    if (grey && (lum[p] < DARK || lum[p] < paper[p] - BELOW_PAPER)) out[p] = 1;
  }
  return out;
}

/**
 * The walls of a plan picture (RGBA pixels), or null when it does not look
 * like a plan with walls (too little or too much found).
 */
export function findWalls(data: Uint8ClampedArray, width: number, height: number): WallMask | null {
  const long = Math.max(width, height);
  const px = (share: number) => Math.max(1, Math.round(long * share));
  let cells = darkPixels(data, width, height);
  cells = closeMask(cells, width, height, px(SCALE.close));
  cells = dropThick(cells, width, height, px(SCALE.thick));
  cells = openMask(cells, width, height, openingRadius(width, height));
  cells = keepLong(cells, width, height, px(SCALE.span));
  let count = 0;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let p = 0; p < cells.length; p += 1) {
    if (!cells[p]) continue;
    count += 1;
    const x = p % width;
    const y = (p - x) / width;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const share = count / cells.length;
  if (share < MIN_SHARE || share > MAX_SHARE) return null;
  return { width, height, cells, span: Math.max(maxX - minX, maxY - minY) + 1 };
}

/** Wall height for the model, as a share of the picture's width: in scale with the building, not the sheet it is drawn on. */
export const wallHeightShare = (mask: Pick<WallMask, 'width' | 'span'>): number =>
  Math.min(0.06, Math.max(0.02, (0.05 * mask.span) / mask.width));

/** RGBA pixels painting the wall cells in one colour, everything else transparent (pure). */
export function paintMask(mask: WallMask, [r, g, b]: readonly [number, number, number]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask.cells.length * 4);
  mask.cells.forEach((c, p) => {
    if (!c) return;
    out[p * 4] = r;
    out[p * 4 + 1] = g;
    out[p * 4 + 2] = b;
    out[p * 4 + 3] = 255;
  });
  return out;
}
