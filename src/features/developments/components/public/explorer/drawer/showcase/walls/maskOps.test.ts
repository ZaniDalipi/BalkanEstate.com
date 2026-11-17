import { describe, it, expect } from 'vitest';
import { closeMask, distanceInside, dropThick, keepLong, morph } from './maskOps';

const grid = (w: number, h: number, set: (x: number, y: number) => boolean) => {
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (set(x, y)) cells[y * w + x] = 1;
  return cells;
};

/** Square-window erode/dilate the slow way, to check the sliding one against. */
const naive = (cells: Uint8Array, w: number, h: number, r: number, op: 'erode' | 'dilate') =>
  grid(w, h, (x, y) => {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        const inside = nx >= 0 && ny >= 0 && nx < w && ny < h;
        // Beyond the border: set for erode, unset for dilate.
        const c = inside ? cells[ny * w + nx] : op === 'erode' ? 1 : 0;
        if (op === 'erode' && !c) return false;
        if (op === 'dilate' && c) return true;
      }
    }
    return op === 'erode';
  });

describe('morph', () => {
  it('matches a plain square-window erode and dilate', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cells = grid(23, 17, () => rand() > 0.35);
    for (const r of [1, 2, 4]) {
      expect(Array.from(morph(cells, 23, 17, r, 'erode'))).toEqual(Array.from(naive(cells, 23, 17, r, 'erode')));
      expect(Array.from(morph(cells, 23, 17, r, 'dilate'))).toEqual(Array.from(naive(cells, 23, 17, r, 'dilate')));
    }
  });
});

describe('closeMask', () => {
  it('does not thin a strip along the picture edge', () => {
    const cells = grid(20, 10, (x) => x < 5);
    expect(closeMask(cells, 20, 10, 3)[5 * 20 + 0]).toBe(1);
  });

  it('fills the gap between two parallel lines', () => {
    const cells = grid(30, 20, (_x, y) => y === 8 || y === 12);
    expect(closeMask(cells, 30, 20, 3)[10 * 30 + 15]).toBe(1);
  });
});

describe('distanceInside', () => {
  it('counts cells to the nearest gap', () => {
    const d = distanceInside(grid(9, 9, (x, y) => x > 0 && y > 0 && x < 8 && y < 8), 9, 9);
    expect(d[4 * 9 + 4]).toBe(4);
    expect(d[1 * 9 + 4]).toBe(1);
  });

  it('measures a strip along the picture edge at its full width', () => {
    // 6 cells wide, against the left edge: its outer cells are 6 from the gap, not 1.
    const d = distanceInside(grid(20, 10, (x) => x < 6), 20, 10);
    expect(d[5 * 20 + 0]).toBe(6);
    expect(d[5 * 20 + 5]).toBe(1);
  });
});

describe('dropThick', () => {
  it('drops a wide block and keeps a thin band touching it', () => {
    const w = 60;
    const cells = grid(w, 40, (x, y) => (x < 30 && y < 30) || (y >= 34 && y < 38));
    const out = dropThick(cells, w, 40, 4);
    expect(out[15 * w + 15]).toBe(0);
    expect(out[36 * w + 50]).toBe(1);
  });
});

describe('keepLong', () => {
  it('keeps a long line and drops a short blob', () => {
    const w = 50;
    const cells = grid(w, 20, (x, y) => (y === 3 && x < 40) || (x >= 10 && x < 14 && y >= 10 && y < 14));
    const out = keepLong(cells, w, 20, 20);
    expect(out[3 * w + 20]).toBe(1);
    expect(out[11 * w + 11]).toBe(0);
  });
});
