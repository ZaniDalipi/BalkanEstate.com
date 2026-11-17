import { describe, it, expect } from 'vitest';
import { darkPixels, findWalls, openMask, openingRadius, paintMask } from './planWalls';
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

describe('openingRadius', () => {
  it('grows with the picture', () => {
    expect(openingRadius(100, 50)).toBe(1);
    expect(openingRadius(768, 1152)).toBe(3);
  });
});

describe('paintMask', () => {
  it('paints walls opaque and leaves the rest transparent', () => {
    const px = paintMask({ width: 2, height: 1, cells: Uint8Array.from([1, 0]) }, [1, 2, 3]);
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
