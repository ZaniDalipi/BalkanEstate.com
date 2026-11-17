import { describe, it, expect } from 'vitest';
import { darkPixels, findWalls, openMask, openingRadius, paintMask, wallHeightShare } from './wallMask';
import { ORBIT_TILT, orbitBy, orbitByDrag } from './planOrbit';

/** An RGBA picture filled white, with `paint` setting some pixels. */
const picture = (w: number, h: number, paint: (x: number, y: number) => [number, number, number] | null) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const c = paint(x, y) ?? [255, 255, 255];
      data.set([...c, 255], (y * w + x) * 4);
    }
  }
  return data;
};
const count = (cells: Uint8Array) => cells.reduce((n, c) => n + c, 0);

describe('darkPixels', () => {
  it('takes dark grey pixels, not coloured or light ones', () => {
    const data = picture(4, 1, (x) => [[20, 20, 20], [30, 120, 30], [200, 200, 200], [60, 55, 50]][x] as [number, number, number]);
    expect(Array.from(darkPixels(data, 4, 1))).toEqual([1, 0, 0, 1]);
  });
});

describe('openMask', () => {
  it('drops a 1-pixel line and keeps a 6-pixel band at its full size', () => {
    const w = 20;
    const h = 20;
    const cells = new Uint8Array(w * h);
    for (let x = 0; x < w; x += 1) cells[2 * w + x] = 1; // thin line on row 2
    for (let y = 10; y < 16; y += 1) for (let x = 0; x < w; x += 1) cells[y * w + x] = 1; // band rows 10–15
    const opened = openMask(cells, w, h, 1);
    expect(count(opened.subarray(0, 5 * w))).toBe(0);
    // The band survives; only its ends at the picture edge can shrink.
    expect(count(opened.subarray(10 * w, 16 * w))).toBeGreaterThanOrEqual(6 * (w - 2));
  });
});

describe('findWalls', () => {
  it('finds the thick walls of a line plan', () => {
    const w = 200;
    const h = 100;
    const data = picture(w, h, (x, y) => (x < 6 || x >= w - 6 || y < 6 || y >= h - 6 || (x >= 97 && x < 103) ? [25, 25, 25] : null));
    const walls = findWalls(data, w, h);
    expect(walls).not.toBeNull();
    expect(walls!.cells[50 * w + 100]).toBe(1); // the inner wall
    expect(walls!.cells[50 * w + 50]).toBe(0); // a room
  });

  it('is null for a picture without dark walls, and for a mostly dark one', () => {
    expect(findWalls(picture(50, 50, () => null), 50, 50)).toBeNull();
    expect(findWalls(picture(50, 50, () => [10, 10, 10]), 50, 50)).toBeNull();
  });
});

describe('findWalls on a photographed paper plan', () => {
  // A 400×300 sheet lit from the left (paper 215 → 150), walls drawn as two
  // 2-px ink lines 8 px apart with hatching, a room label, a long dimension
  // line, a tiled bathroom, and the dark table showing past the sheet's edge.
  const W = 400;
  const H = 300;
  const ink: [number, number, number] = [70, 68, 66];
  const inBand = (v: number, a: number) => v >= a && v < a + 12; // a wall band: two lines at a and a+10, hatch between
  const wallAt = (x: number, y: number) => {
    const across = (v: number, a: number) => v === a || v === a + 1 || v === a + 10 || v === a + 11 || (inBand(v, a) && (x + y) % 5 === 0);
    const frame = x >= 40 && x < 360 && y >= 40 && y < 260;
    if (!frame) return false;
    return across(y, 40) || across(y, 248) || across(x, 40) || across(x, 348) || (x >= 200 && across(y, 150)) || (y >= 150 && across(x, 200));
  };
  const data = picture(W, H, (x, y) => {
    if (x >= 370) return [30, 28, 26]; // the table, past the sheet's edge
    const paper = Math.round(215 - (x / W) * 65);
    if (wallAt(x, y)) return ink;
    if (y === 280 && x >= 40 && x < 360) return ink; // dimension line
    if (y >= 95 && y < 101 && x >= 100 && x < 130 && x % 3 === 0) return ink; // label strokes
    if (x >= 215 && x < 345 && y >= 165 && y < 245 && (x % 16 === 0 || y % 16 === 0)) return ink; // bathroom tiles (wider than a wall's gap)
    return [paper, paper - 4, paper - 12];
  });
  const walls = findWalls(data, W, H);
  const at = (x: number, y: number) => walls!.cells[y * W + x];

  it('finds the hatched double-line walls, including on the dim side of the sheet', () => {
    expect(walls).not.toBeNull();
    expect(at(120, 45)).toBe(1); // top wall, bright side
    expect(at(353, 120)).toBe(1); // right wall, dim side
    expect(at(205, 200)).toBe(1); // inner wall
  });

  it('leaves the rooms, the label, the dimension line, the tiles and the table flat', () => {
    expect(at(120, 120)).toBe(0);
    expect(at(110, 97)).toBe(0);
    expect(at(200, 280)).toBe(0);
    expect(at(280, 205)).toBe(0);
    expect(at(390, 150)).toBe(0);
  });
});

describe('wallHeightShare', () => {
  it('scales with the building, within bounds', () => {
    expect(wallHeightShare({ width: 1000, span: 500 })).toBeCloseTo(0.025);
    expect(wallHeightShare({ width: 1000, span: 100 })).toBe(0.02);
    expect(wallHeightShare({ width: 1000, span: 1400 })).toBe(0.06);
  });
});

describe('openingRadius', () => {
  it('grows with the picture', () => {
    expect(openingRadius(100, 50)).toBe(1);
    expect(openingRadius(768, 1152)).toBe(3);
  });
});

describe('paintMask', () => {
  it('paints walls opaque and leaves the rest transparent', () => {
    const px = paintMask({ width: 2, height: 1, cells: Uint8Array.from([1, 0]), span: 1 }, [1, 2, 3]);
    expect(Array.from(px)).toEqual([1, 2, 3, 255, 0, 0, 0, 0]);
  });
});

describe('orbit', () => {
  it('turns with a drag across, without limit, and tilts within bounds with a drag down', () => {
    const start = { turn: 0, tilt: ORBIT_TILT.rest };
    expect(orbitByDrag(start, 1000, 0).turn).toBeGreaterThan(360);
    expect(orbitByDrag(start, 0, 10_000).tilt).toBe(ORBIT_TILT.max);
    expect(orbitByDrag(start, 0, -10_000).tilt).toBe(ORBIT_TILT.min);
  });
  it('steps by the buttons', () => {
    expect(orbitBy({ turn: 10, tilt: 50 }, -45)).toEqual({ turn: -35, tilt: 50 });
  });
});
