/**
 * Finding the walls of a floor-plan picture, so the plan can be shown as a
 * model with its walls standing up. Plans draw walls as thick dark lines:
 * a pixel is "wall" when it is dark and grey, and an opening (erode, then
 * dilate) drops thin dark strokes — room names, dimensions, furniture
 * outlines — while keeping the thick ones.
 */

export interface WallMask {
  width: number;
  height: number;
  /** 1 = wall, 0 = not, row by row. */
  cells: Uint8Array;
}

/** Darker than this (0–255 luminance) can be a wall. */
const DARK = 85;
/** Greyer than this (max − min channel) can be a wall; coloured furniture and plants are not. */
const GREY = 45;
/** Walls must cover at least this share of the picture… */
const MIN_SHARE = 0.004;
/** …and at most this (a dark or photographic picture is not a line plan). */
const MAX_SHARE = 0.3;

/** Dark, grey, opaque pixels of RGBA `data` (pure). */
export function darkPixels(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < out.length; i += 4, p += 1) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (data[i + 3] < 128) continue;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < DARK && Math.max(r, g, b) - Math.min(r, g, b) < GREY) out[p] = 1;
  }
  return out;
}

/** Square-window min (erode) or max (dilate) of radius `r`, done as two 1-D passes. */
function morph(cells: Uint8Array, width: number, height: number, r: number, keep: 0 | 1): Uint8Array {
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const dst = new Uint8Array(src.length);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        // Erode keeps a cell only when every neighbour is set; dilate sets it when any is.
        let v = keep === 0 ? 1 : 0;
        for (let k = -r; k <= r; k += 1) {
          const nx = horizontal ? x + k : x;
          const ny = horizontal ? y : y + k;
          const inside = nx >= 0 && ny >= 0 && nx < width && ny < height;
          const c = inside ? src[ny * width + nx] : 0;
          if (keep === 0 && !c) { v = 0; break; }
          if (keep === 1 && c) { v = 1; break; }
        }
        dst[y * width + x] = v;
      }
    }
    return dst;
  };
  return pass(pass(cells, true), false);
}

/** Thin strokes (narrower than 2r + 1 cells) removed, thick ones kept at their size. */
export const openMask = (cells: Uint8Array, width: number, height: number, r: number): Uint8Array =>
  r < 1 ? cells : morph(morph(cells, width, height, r, 0), width, height, r, 1);

/** Opening radius for a picture of this size: about 1/380 of its longer side. */
export const openingRadius = (width: number, height: number): number => Math.max(1, Math.round(Math.max(width, height) / 380));

/**
 * The walls of a plan picture (RGBA pixels), or null when it does not look
 * like a line plan with dark walls (too little or too much dark).
 */
export function findWalls(data: Uint8ClampedArray, width: number, height: number): WallMask | null {
  const cells = openMask(darkPixels(data, width, height), width, height, openingRadius(width, height));
  let count = 0;
  for (let i = 0; i < cells.length; i += 1) count += cells[i];
  const share = count / cells.length;
  if (share < MIN_SHARE || share > MAX_SHARE) return null;
  return { width, height, cells };
}

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
