/**
 * Operations on binary masks (1 = set, row by row), all linear in the
 * picture size whatever the radius, so a phone can run them on a plan.
 */

/**
 * Square-window erode (keep: all set) or dilate (any set) of radius `r`, as
 * two sliding 1-D passes. Beyond the border counts as set for erode and unset
 * for dilate, so neither eats into or grows from the picture's edge.
 */
export function morph(cells: Uint8Array, width: number, height: number, r: number, op: 'erode' | 'dilate'): Uint8Array {
  if (r < 1) return cells;
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const dst = new Uint8Array(src.length);
    const lines = horizontal ? height : width;
    const len = horizontal ? width : height;
    const at = (line: number, i: number) => (horizontal ? line * width + i : i * width + line);
    for (let line = 0; line < lines; line += 1) {
      // Set cells inside the window [i - r, i + r]; outside the picture counts as unset.
      let count = 0;
      for (let i = 0; i < Math.min(r, len); i += 1) count += src[at(line, i)];
      for (let i = 0; i < len; i += 1) {
        if (i + r < len) count += src[at(line, i + r)];
        if (i - r - 1 >= 0) count -= src[at(line, i - r - 1)];
        const inside = Math.min(len - 1, i + r) - Math.max(0, i - r) + 1;
        dst[at(line, i)] = op === 'erode' ? (count === inside ? 1 : 0) : count > 0 ? 1 : 0;
      }
    }
    return dst;
  };
  return pass(pass(cells, true), false);
}

/** Opening: strokes narrower than 2r + 1 cells removed, thicker ones kept at their size. */
export const openMask = (cells: Uint8Array, width: number, height: number, r: number): Uint8Array =>
  morph(morph(cells, width, height, r, 'erode'), width, height, r, 'dilate');

/** Closing: gaps narrower than 2r + 1 cells filled (a wall's two lines become one solid wall). */
export const closeMask = (cells: Uint8Array, width: number, height: number, r: number): Uint8Array =>
  morph(morph(cells, width, height, r, 'dilate'), width, height, r, 'erode');

/**
 * Each set cell's distance to the nearest unset cell, in cells (chessboard
 * metric, two passes). Beyond the picture's border counts as set: a dark
 * strip along the edge (the table round a photographed sheet) measures its
 * full width, not half of it.
 */
export function distanceInside(cells: Uint8Array, width: number, height: number): Uint16Array {
  const d = new Uint16Array(cells.length);
  const big = 65535;
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? big : d[y * width + x]);
  for (let p = 0; p < cells.length; p += 1) d[p] = cells[p] ? big : 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = y * width + x;
      if (d[p]) d[p] = Math.min(d[p], 1 + Math.min(get(x - 1, y), get(x, y - 1), get(x - 1, y - 1), get(x + 1, y - 1)));
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const p = y * width + x;
      if (d[p]) d[p] = Math.min(d[p], 1 + Math.min(get(x + 1, y), get(x, y + 1), get(x + 1, y + 1), get(x - 1, y + 1)));
    }
  }
  return d;
}

/**
 * Removes every area thicker than `2 * half` cells (a tiled floor filled in
 * by the closing, the table round a photographed sheet), keeping strokes up
 * to that thickness — walls — even where they touch such an area.
 */
export function dropThick(cells: Uint8Array, width: number, height: number, half: number): Uint8Array {
  const dist = distanceInside(cells, width, height);
  const core = new Uint8Array(cells.length);
  for (let p = 0; p < cells.length; p += 1) if (dist[p] > half) core[p] = 1;
  const thick = morph(core, width, height, half, 'dilate');
  const out = new Uint8Array(cells.length);
  for (let p = 0; p < cells.length; p += 1) out[p] = cells[p] && !thick[p] ? 1 : 0;
  return out;
}

/** Keeps only connected shapes (8-neighbour) whose bounding box reaches `minSpan` cells along its longer side. */
export function keepLong(cells: Uint8Array, width: number, height: number, minSpan: number): Uint8Array {
  const out = new Uint8Array(cells.length);
  const seen = new Uint8Array(cells.length);
  const stack = new Int32Array(cells.length);
  const members: number[] = [];
  for (let start = 0; start < cells.length; start += 1) {
    if (!cells[start] || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    members.length = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    while (top > 0) {
      const p = stack[--top];
      members.push(p);
      const x = p % width;
      const y = (p - x) / width;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const q = ny * width + nx;
          if (cells[q] && !seen[q]) {
            seen[q] = 1;
            stack[top++] = q;
          }
        }
      }
    }
    if (Math.max(maxX - minX, maxY - minY) + 1 >= minSpan) for (const p of members) out[p] = 1;
  }
  return out;
}
