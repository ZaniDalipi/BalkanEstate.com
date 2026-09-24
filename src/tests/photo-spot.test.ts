import { describe, it, expect } from 'vitest';
import { normalizeAngle, sanitizeSpot } from '@/src/components/property/PhotoSpotMarker';

describe('normalizeAngle', () => {
  it('wraps any angle into 0–359', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(725)).toBe(5);
    expect(normalizeAngle(44.6)).toBe(45);
  });
});

describe('sanitizeSpot', () => {
  it('keeps a valid spot', () => {
    expect(sanitizeSpot({ x: 12.5, y: 80, angle: 90 })).toEqual({ x: 12.5, y: 80, angle: 90 });
  });

  it('clamps positions to the plan and normalises the angle', () => {
    expect(sanitizeSpot({ x: -5, y: 140, angle: -45 })).toEqual({ x: 0, y: 100, angle: 315 });
  });

  it('defaults a missing angle to facing up', () => {
    expect(sanitizeSpot({ x: 50, y: 50 })).toEqual({ x: 50, y: 50, angle: 0 });
  });

  it('drops anything that is not a spot', () => {
    expect(sanitizeSpot(undefined)).toBeUndefined();
    expect(sanitizeSpot(null)).toBeUndefined();
    expect(sanitizeSpot('30,40')).toBeUndefined();
    expect(sanitizeSpot({ x: '30', y: 40 })).toBeUndefined();
    expect(sanitizeSpot({ x: NaN, y: 40 })).toBeUndefined();
  });
});
