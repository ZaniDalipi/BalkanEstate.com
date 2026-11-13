/**
 * Turning a coarse grid of values (one per ~8 m cell) into a smooth picture:
 * gaps are filled from their neighbours, then the grid is resampled to the
 * picture's size with Catmull-Rom splines, which pass through every cell's
 * value and have no creases between cells.
 */

/** A copy with every NaN replaced from the nearest values around it (all zero when nothing is known). */
export function fillGaps(values: ArrayLike<number | null>, rows: number, cols: number): Float32Array {
  const out = new Float32Array(rows * cols);
  let missing: number[] = [];
  for (let i = 0; i < out.length; i++) {
    const v = values[i];
    if (v === null || Number.isNaN(v)) { out[i] = Number.NaN; missing.push(i); } else out[i] = v;
  }
  while (missing.length > 0 && missing.length < out.length) {
    const filled: Array<[number, number]> = [];
    const still: number[] = [];
    for (const i of missing) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      let sum = 0;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
          const v = out[rr * cols + cc];
          if (!Number.isNaN(v)) { sum += v; n++; }
        }
      }
      if (n > 0) filled.push([i, sum / n]); else still.push(i);
    }
    // Apply a whole ring at once, so the fill grows evenly from the known values.
    for (const [i, v] of filled) out[i] = v;
    missing = still;
  }
  if (missing.length === out.length) out.fill(0);
  return out;
}

/**
 * A soft blur (each value averaged with its neighbours, 1-2-1, both ways),
 * repeated `passes` times. Takes out the faint grid pattern that coarse
 * elevation data leaves in slopes, without moving anything.
 */
export function soften(src: Float32Array, rows: number, cols: number, passes: number): Float32Array {
  let current = src;
  for (let pass = 0; pass < passes; pass++) {
    const wide = new Float32Array(current.length);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        wide[i] = (current[r * cols + Math.max(0, c - 1)] + 2 * current[i] + current[r * cols + Math.min(cols - 1, c + 1)]) / 4;
      }
    }
    const next = new Float32Array(current.length);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        next[i] = (wide[Math.max(0, r - 1) * cols + c] + 2 * wide[i] + wide[Math.min(rows - 1, r + 1) * cols + c]) / 4;
      }
    }
    current = next;
  }
  return current;
}

/** Catmull-Rom weights of the four values around a position `t` (0–1) between the middle two. */
function splineWeights(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  return [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2];
}

/** Resample `n` values along one line to `outN`, with cell centres as the known points. */
function resampleLine(read: (i: number) => number, n: number, outN: number, write: (o: number, v: number) => void): void {
  const scale = n / outN;
  const last = n - 1;
  for (let o = 0; o < outN; o++) {
    const pos = (o + 0.5) * scale - 0.5;
    const i = Math.floor(pos);
    const [w0, w1, w2, w3] = splineWeights(pos - i);
    const at = (k: number) => read(Math.min(last, Math.max(0, k)));
    write(o, w0 * at(i - 1) + w1 * at(i) + w2 * at(i + 1) + w3 * at(i + 2));
  }
}

/** A `rows × cols` grid (no NaN) resampled smoothly to `outRows × outCols`. */
export function resampleSmooth(src: Float32Array, rows: number, cols: number, outRows: number, outCols: number): Float32Array {
  const wide = new Float32Array(rows * outCols);
  for (let r = 0; r < rows; r++) {
    resampleLine((c) => src[r * cols + c], cols, outCols, (o, v) => { wide[r * outCols + o] = v; });
  }
  const out = new Float32Array(outRows * outCols);
  for (let c = 0; c < outCols; c++) {
    resampleLine((r) => wide[r * outCols + c], rows, outRows, (o, v) => { out[o * outCols + c] = v; });
  }
  return out;
}
