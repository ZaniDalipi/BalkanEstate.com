import { describe, expect, it } from 'vitest';
import { contourInterval } from './contours';
import { fillGaps, resampleSmooth, soften } from './resample';
import { SLOPE_BANDS } from './slopeBands';
import { SLOPE_CLASSES } from './slopeClasses';
import { computeSlopeField } from './slopeField';
import { renderSlopePixels } from './slopePixels';
import { LEGEND_TICKS, RAMP_MAX_SLOPE, rampColor, rampGradientCss, rampHex, rampIndex, rampLookup } from './slopeRamp';
import { makeGrid } from './testGrid';

describe('colour scale', () => {
  it('runs from green on flat ground to red on steep ground', () => {
    const [r0, g0] = rampColor(0);
    const [r1, g1] = rampColor(30);
    expect(g0).toBeGreaterThan(r0);
    expect(r1).toBeGreaterThan(g1);
  });

  it('blends between its stops and holds the last colour past the end', () => {
    const mid = rampColor(5.5);
    const [a, b] = [rampColor(3), rampColor(8)];
    mid.forEach((v, i) => expect(Math.abs(v - (a[i] + b[i]) / 2)).toBeLessThanOrEqual(1));
    expect(rampColor(500)).toEqual(rampColor(RAMP_MAX_SLOPE));
    expect(rampColor(Number.NaN)).toEqual(rampColor(0));
  });

  it('gives the legend, the labels and the map the same colours', () => {
    expect(SLOPE_CLASSES[0].color).toBe(rampHex(1.5));
    expect(SLOPE_BANDS[1].color).toBe(rampHex(4));
    const lut = rampLookup();
    expect(Array.from(lut.slice(rampIndex(12) * 3, rampIndex(12) * 3 + 3))).toEqual(rampColor(12));
    expect(rampIndex(-5)).toBe(0);
  });

  it('spaces the legend ticks evenly along the gradient', () => {
    const css = rampGradientCss();
    expect(css.startsWith('linear-gradient(to right, ')).toBe(true);
    expect(css).toContain(`${rampHex(LEGEND_TICKS[0])} 0%`);
    expect(css).toContain(`${rampHex(40)} 100%`);
  });
});

describe('smoothing', () => {
  it('fills gaps from the values around them', () => {
    // Known corners 1, 3, 7, 9; everything else missing.
    const filled = Array.from(fillGaps([1, null, 3, null, null, null, 7, null, 9], 3, 3));
    expect([filled[0], filled[2], filled[6], filled[8]]).toEqual([1, 3, 7, 9]);
    expect(filled[1]).toBe(2); // between 1 and 3
    expect(filled[4]).toBe(5); // the middle: mean of the four corners
    expect(filled.every((v) => v >= 1 && v <= 9)).toBe(true);
  });

  it('copes with nothing known, and with NaN as well as null', () => {
    expect(Array.from(fillGaps([null, null, null, null], 2, 2))).toEqual([0, 0, 0, 0]);
    expect(Array.from(fillGaps([5, Number.NaN], 1, 2))).toEqual([5, 5]);
  });

  it('softens a spike without changing level ground or the total much', () => {
    const level = new Float32Array(25).fill(4);
    expect(Array.from(soften(level, 5, 5, 2))).toEqual(Array.from(level));
    const spike = new Float32Array(25);
    spike[12] = 16;
    const soft = soften(spike, 5, 5, 1);
    expect(soft[12]).toBe(4);
    expect(soft[11]).toBe(2);
    expect(soft[6]).toBe(1);
    expect(soft.reduce((a, b) => a + b, 0)).toBeCloseTo(16, 5);
  });

  it('keeps a level surface level and a steady rise steady when enlarging', () => {
    const level = resampleSmooth(new Float32Array(9).fill(7), 3, 3, 12, 12);
    expect(Math.min(...level)).toBeCloseTo(7, 5);
    expect(Math.max(...level)).toBeCloseTo(7, 5);
    // Columns rising by 1: enlarged 4×, the middle rises by ¼ per pixel.
    const rise = resampleSmooth(Float32Array.from({ length: 25 }, (_, i) => i % 5), 5, 5, 20, 20);
    expect(rise[10 * 20 + 9] - rise[10 * 20 + 8]).toBeCloseTo(0.25, 5);
  });

  it('passes through every cell value when the size is unchanged', () => {
    const src = Float32Array.from([1, 5, 2, 8, 3, 9, 4, 7, 6]);
    expect(Array.from(resampleSmooth(src, 3, 3, 3, 3))).toEqual(Array.from(src));
  });
});

describe('contour interval', () => {
  it.each([
    [400, 400.5, null],
    [959, 961, 1],
    [400, 420, 2],
    [408, 567, 20],
    [200, 1400, 100],
  ])('%s–%s m → %s', (min, max, interval) => {
    expect(contourInterval(min, max)).toBe(interval);
  });
});

describe('renderSlopePixels', () => {
  const plan = { width: 40, height: 40, pxPerCell: 4 };
  const pixel = (data: Uint8ClampedArray, x: number, y: number) => Array.from(data.slice((y * 40 + x) * 4, (y * 40 + x) * 4 + 4));

  it('paints level ground in the flat colour, evenly', () => {
    const grid = makeGrid(10, 10, () => 300);
    const data = renderSlopePixels(grid, computeSlopeField(grid), plan, null);
    expect(pixel(data, 5, 5).slice(0, 3)).toEqual(rampColor(0));
    expect(pixel(data, 30, 22)).toEqual(pixel(data, 5, 5));
    expect(pixel(data, 5, 5)[3]).toBeGreaterThan(180);
  });

  it('shades smoothly from gentle to steep, with no steps between cells', () => {
    // Slope grows steadily to the east.
    const grid = makeGrid(10, 10, (_r, c) => 300 + c * c * 0.2);
    const data = renderSlopePixels(grid, computeSlopeField(grid), plan, null);
    const reds = Array.from({ length: 30 }, (_, x) => pixel(data, 5 + x, 20)[0]);
    const jumps = reds.slice(1).map((v, i) => Math.abs(v - reds[i]));
    expect(Math.max(...jumps)).toBeLessThan(25);
    expect(pixel(data, 36, 20)[1]).toBeLessThan(pixel(data, 3, 20)[1]); // less green on the steep side
  });

  it('leaves water clear', () => {
    const grid = makeGrid(10, 10, (r, c) => (r < 2 && c < 2 ? null : 300));
    const data = renderSlopePixels(grid, computeSlopeField(grid), plan, null);
    expect(pixel(data, 2, 2)[3]).toBe(0);
    expect(pixel(data, 30, 30)[3]).toBeGreaterThan(0);
  });

  it('draws white contour lines where the ground crosses each level', () => {
    // Rising 1 m per cell to the east: a line every 2 cells at a 2 m interval.
    const grid = makeGrid(10, 10, (_r, c) => 300 + c);
    const field = computeSlopeField(grid);
    const plain = renderSlopePixels(grid, field, plan, null);
    const lined = renderSlopePixels(grid, field, plan, 2);
    const brighter = Array.from({ length: 40 }, (_, x) => pixel(lined, x, 20)[2] - pixel(plain, x, 20)[2] > 40);
    const lines = brighter.filter((on, x) => on && !brighter[x - 1]).length;
    expect(lines).toBeGreaterThanOrEqual(4);
    expect(lines).toBeLessThanOrEqual(6);
    expect(brighter.filter(Boolean).length).toBeLessThan(20); // thin lines, not bands
  });
});
