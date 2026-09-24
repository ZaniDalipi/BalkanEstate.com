import { describe, it, expect } from 'vitest';
import { normalizeAngle, sanitizeFloorplanSpot, validateFloorplanSpot } from '@/shared/utils/validation';

describe('normalizeAngle', () => {
  it('wraps any angle into 0–359', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(725)).toBe(5);
    expect(normalizeAngle(44.6)).toBe(45);
  });
});

describe('sanitizeFloorplanSpot', () => {
  it('keeps a valid spot', () => {
    expect(sanitizeFloorplanSpot({ x: 12.5, y: 80, angle: 90 })).toEqual({ x: 12.5, y: 80, angle: 90 });
  });

  it('clamps positions to the plan and normalises the angle', () => {
    expect(sanitizeFloorplanSpot({ x: -5, y: 140, angle: -45 })).toEqual({ x: 0, y: 100, angle: 315 });
  });

  it('defaults a missing angle to facing up', () => {
    expect(sanitizeFloorplanSpot({ x: 50, y: 50 })).toEqual({ x: 50, y: 50, angle: 0 });
  });

  it('drops anything that is not a spot', () => {
    expect(sanitizeFloorplanSpot(undefined)).toBeUndefined();
    expect(sanitizeFloorplanSpot(null)).toBeUndefined();
    expect(sanitizeFloorplanSpot('30,40')).toBeUndefined();
    expect(sanitizeFloorplanSpot({ x: '30', y: 40 })).toBeUndefined();
    expect(sanitizeFloorplanSpot({ x: NaN, y: 40 })).toBeUndefined();
  });
});

describe('validateFloorplanSpot', () => {
  it('accepts a spot on the plan', () => {
    expect(validateFloorplanSpot({ x: 0, y: 100, angle: 359 }).isValid).toBe(true);
  });

  it('rejects spots off the plan or without a direction', () => {
    expect(validateFloorplanSpot({ x: 101, y: 50, angle: 0 }).isValid).toBe(false);
    expect(validateFloorplanSpot({ x: 50, y: 50 }).isValid).toBe(false);
    expect(validateFloorplanSpot(null).error).toBeDefined();
  });
});
