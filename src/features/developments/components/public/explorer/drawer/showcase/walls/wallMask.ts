/**
 * Finding the walls of a floor-plan picture, so the plan can be shown as a
 * model with its walls standing up. Works for drawn plans with filled walls
 * on CAD sheets, rendered plans, and paper plans photographed with a phone
 * (uneven light):
 *
 * 1. ink — grey and dark: dark outright, or (on a dim photo) under about half
 *    the brightness of the paper round it — never mid-grey shadows or fabric;
 * 2. close — one-pixel cracks sealed, nothing more (wider closing fuses text
 *    and furniture outlines into blocks);
 * 3. drop thick — areas wider than any wall (the table round the sheet) go;
 * 4. open, drop thin — hairlines go, then any shape nowhere as thick as a
 *    wall (text, even bold; dimension lines; furniture outlines);
 * 5. keep long — only shapes long enough to be walls stay, pieces of a wall
 *    cut by windows and doors counting together.
 */
import { closeMask, dropThick, dropThin, keepLong, openMask } from './maskOps';

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
const DARK = 70;
/** On a dim photographed sheet: darker than this share of the paper round it… */
const PAPER_SHARE = 0.55;
/** …but never lighter than this (grey shadows, fabric and floor patterns are not walls). */
const DARK_MAX = 110;
/** Greyer than this (max − min channel): coloured furniture, plants and floors are not walls… */
const GREY = 70;
/** …and, relative to its brightness, dark greens and browns (plants, shadows on wood) are coloured too. */
const GREY_SHARE = 0.25;
/** Walls must cover at least this share of the picture… */
const MIN_SHARE = 0.004;
/** …and at most this (a dark or photographic picture is not a line plan). */
const MAX_SHARE = 0.3;

/** Sizes of the steps, as shares of the picture's longer side. */
const SCALE = {
  /** Neighbourhood the paper's brightness is measured over. */
  paper: 1 / 24,
  /** Half the thickest wall kept. */
  thick: 1 / 40,
  /** Half the thinnest wall kept: bold text and drawn lines are thinner. */
  thin: 1 / 300,
  /** Shortest wall kept. */
  span: 1 / 8,
  /** Widest opening (window, door) a wall's pieces are joined across. */
  join: 1 / 50,
} as const;

/** Opening radius for a picture of this size: drops hairlines (text, dimensions, outlines), about 1/700 of its longer side. */
export const openingRadius = (width: number, height: number): number => Math.max(1, Math.round(Math.max(width, height) / 700));

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
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const spread = max - Math.min(data[i], data[i + 1], data[i + 2]);
    const grey = spread < GREY && spread <= max * GREY_SHARE + 6;
    if (grey && (lum[p] < DARK || lum[p] < Math.min(DARK_MAX, paper[p] * PAPER_SHARE))) out[p] = 1;
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
  // Only seal one-pixel cracks (anti-aliasing, scan noise): wider closing fuses text and furniture into blocks.
  cells = closeMask(cells, width, height, 1);
  cells = dropThick(cells, width, height, px(SCALE.thick));
  cells = openMask(cells, width, height, openingRadius(width, height));
  cells = dropThin(cells, width, height, px(SCALE.thin));
  cells = keepLong(cells, width, height, px(SCALE.span), px(SCALE.join));
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
