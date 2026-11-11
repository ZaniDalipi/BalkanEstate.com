import { describe, expect, it } from 'vitest';
import { coverBox } from './coverBox';

describe('coverBox', () => {
  it('covers the stage edge to edge, centred, when that crops little', () => {
    // 16:9 picture in a 1360 × 820 stage: the picture's height drives, the sides are cropped a little.
    const box = coverBox({ width: 1360, height: 820 }, 16 / 9);
    expect(box.height).toBeGreaterThanOrEqual(820);
    expect(box.width).toBeGreaterThanOrEqual(1360);
    expect(box.left).toBe(Math.round((1360 - box.width) / 2));
    expect(box.top).toBeLessThanOrEqual(0);
  });

  it('never crops more than the allowed share off a side; the backdrop fills what is left', () => {
    // A tall stage would crop most of a wide picture: it stops at 12 % per side.
    const box = coverBox({ width: 800, height: 1000 }, 16 / 9);
    expect((box.width - 800) / 2 / box.width).toBeLessThanOrEqual(0.12 + 1e-3);
    expect(box.height).toBeLessThan(1000);
    expect(box.top).toBeGreaterThan(0);
  });

  it('keeps the picture’s shape', () => {
    const box = coverBox({ width: 1200, height: 700 }, 4 / 3);
    expect(box.width / box.height).toBeCloseTo(4 / 3, 2);
  });

  it('fills the stage before it is measured', () => {
    expect(coverBox({ width: 0, height: 0 }, 16 / 9)).toEqual({ left: 0, top: 0, width: 0, height: 0 });
  });
});
