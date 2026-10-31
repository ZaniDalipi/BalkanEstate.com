import { describe, expect, it } from 'vitest';
import { MAX_REPEAT_COPIES, defaultStepPct, repeatPoints, stepVector, validateRepeat } from './regionRepeat';
import type { Point } from './polygonGeometry';

// The apartment outline on the facade: 0.15 wide, 0.09 tall, near the top-left.
const rect: Point[] = [[0.1, 0.1], [0.25, 0.19]];

describe('defaultStepPct', () => {
  it('starts a little taller than the region (slab between floors), a little wider sideways', () => {
    expect(defaultStepPct(rect, 'down')).toBeCloseTo(11.3, 1);
    expect(defaultStepPct(rect, 'right')).toBeCloseTo(17.3, 1);
  });
  it('stays within the allowed range for a tiny or huge region', () => {
    expect(defaultStepPct([[0.5, 0.5], [0.5001, 0.5001]], 'down')).toBeGreaterThanOrEqual(0.5);
    expect(defaultStepPct([[0, 0], [1, 1]], 'down')).toBeLessThanOrEqual(90);
  });
});

describe('validateRepeat', () => {
  it('accepts a whole count and a spacing in range, with a decimal comma', () => {
    expect(validateRepeat('4', '11,5')).toEqual({ ok: true, count: 4, stepPct: 11.5 });
  });
  it('names the field that is wrong', () => {
    expect(validateRepeat('', '10')).toEqual({ ok: false, problem: 'count' });
    expect(validateRepeat('0', '10')).toEqual({ ok: false, problem: 'count' });
    expect(validateRepeat('2.5', '10')).toEqual({ ok: false, problem: 'count' });
    expect(validateRepeat(String(MAX_REPEAT_COPIES + 1), '10')).toEqual({ ok: false, problem: 'count' });
    expect(validateRepeat('3', '')).toEqual({ ok: false, problem: 'step' });
    expect(validateRepeat('3', 'abc')).toEqual({ ok: false, problem: 'step' });
    expect(validateRepeat('3', '0.1')).toEqual({ ok: false, problem: 'step' });
    expect(validateRepeat('3', '95')).toEqual({ ok: false, problem: 'step' });
  });
});

describe('repeatPoints', () => {
  it('moves each copy one more step along the direction, keeping the shape', () => {
    const copies = repeatPoints(rect, 'down', 12, 3);
    expect(copies).toHaveLength(3);
    expect(copies[0][0][1]).toBeCloseTo(0.22);
    expect(copies[2][1][1]).toBeCloseTo(0.55);
    expect(copies[1][0][0]).toBeCloseTo(0.1); // x unchanged
  });
  it('goes up, left and right', () => {
    expect(repeatPoints([[0.5, 0.5], [0.6, 0.6]], 'up', 10, 1)[0][0][1]).toBeCloseTo(0.4);
    expect(repeatPoints(rect, 'right', 20, 1)[0][0][0]).toBeCloseTo(0.3);
    expect(repeatPoints([[0.5, 0.1], [0.6, 0.2]], 'left', 20, 1)[0][0][0]).toBeCloseTo(0.3);
  });
  it('stops at the first copy that would leave the picture instead of squashing it', () => {
    const copies = repeatPoints(rect, 'down', 30, 10);
    expect(copies).toHaveLength(2); // 0.19+0.3=0.49, +0.6 = 0.79, +0.9 = 1.09 (out)
    expect(copies.length).toBeLessThan(10);
    for (const c of copies) for (const [, y] of c) expect(y).toBeLessThanOrEqual(1);
  });
  it('returns nothing when even the first copy does not fit', () => {
    expect(repeatPoints([[0.1, 0.9], [0.2, 0.99]], 'down', 10, 3)).toEqual([]);
  });
  it('works for polygons', () => {
    const tri: Point[] = [[0.1, 0.1], [0.2, 0.1], [0.15, 0.2]];
    expect(repeatPoints(tri, 'down', 20, 1)[0]).toEqual([[0.1, 0.3], [0.2, 0.3], [0.15, 0.4]].map(([x, y]) => [x, expect.closeTo(y, 5)]));
  });
});

describe('stepVector', () => {
  it('is in picture units', () => {
    expect(stepVector('down', 10)).toEqual([0, 0.1]);
    expect(stepVector('left', 10)).toEqual([-0.1, 0]);
  });
});
