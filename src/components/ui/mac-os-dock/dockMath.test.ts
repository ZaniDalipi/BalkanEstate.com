import { describe, it, expect } from 'vitest';
import { getDockConfig, getPositions, getTargetScales, isSettled, MIN_TOUCH_SIZE, resolveDockConfig } from './dockMath';

const cfg = { baseIconSize: 64, maxScale: 1.8, effectWidth: 300 };

describe('getDockConfig', () => {
  it('never goes below a 44px touch target and falls back on bad input', () => {
    expect(getDockConfig(360, 300).baseIconSize).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
    expect(getDockConfig(NaN, 0).baseIconSize).toBe(64);
  });
  it('uses the desktop curve on large screens', () => {
    expect(getDockConfig(1920, 1080)).toMatchObject({ maxScale: 1.8, effectWidth: 300 });
  });
});

describe('getTargetScales', () => {
  it('stays at 1 when the pointer is away', () => {
    expect(getTargetScales(null, 3, cfg)).toEqual([1, 1, 1]);
  });
  it('magnifies the icon under the pointer the most', () => {
    const step = 64 + Math.max(4, 64 * 0.08);
    const scales = getTargetScales(step + 32, 3, cfg);
    expect(scales[1]).toBeGreaterThan(scales[0]);
    expect(scales[1]).toBeGreaterThan(scales[2]);
    expect(scales[1]).toBeLessThanOrEqual(cfg.maxScale);
  });
});

describe('getPositions', () => {
  it('lays icons out left to right without overlap', () => {
    const [a, b] = getPositions([1.5, 1], 60);
    expect(b - a).toBeGreaterThan((60 * 1.5) / 2 + 30);
  });
});

describe('isSettled', () => {
  it('is true only when every value is within tolerance', () => {
    expect(isSettled([1, 1.001], [1, 1], 0.002)).toBe(true);
    expect(isSettled([1, 1.1], [1, 1], 0.002)).toBe(false);
  });
});

describe('resolveDockConfig', () => {
  const base = { baseIconSize: 72, maxScale: 1.8, effectWidth: 300 };
  it('applies a valid compact size and scale', () => {
    const cfg = resolveDockConfig(base, { iconSize: 44, maxScale: 1.45 });
    expect(cfg).toMatchObject({ baseIconSize: 44, maxScale: 1.45 });
    expect(cfg.effectWidth).toBeLessThan(base.effectWidth);
  });
  it('ignores out-of-range values and keeps the viewport default', () => {
    expect(resolveDockConfig(base, { iconSize: 10, maxScale: 9 })).toEqual(base);
    expect(resolveDockConfig(base, { iconSize: NaN })).toEqual(base);
  });
});
