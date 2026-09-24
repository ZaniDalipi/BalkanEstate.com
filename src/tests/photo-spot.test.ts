import { describe, it, expect } from 'vitest';
import { normalizeAngle, sanitizeFloorplanSpot, validateFloorplanSpot, MAX_FLOORPLANS } from '@/shared/utils/validation';
import { getFloorPlans, spotFloor } from '@/shared/utils/floorplans';

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

describe('floor plan floors', () => {
  it('keeps the floor of a spot on a later floor, and drops floor 0', () => {
    expect(sanitizeFloorplanSpot({ x: 10, y: 10, angle: 0, floor: 2 })).toEqual({ x: 10, y: 10, angle: 0, floor: 2 });
    expect(sanitizeFloorplanSpot({ x: 10, y: 10, angle: 0, floor: 0 })).toEqual({ x: 10, y: 10, angle: 0 });
  });

  it('rejects spots on floors that cannot exist', () => {
    expect(validateFloorplanSpot({ x: 1, y: 1, angle: 0, floor: -1 }).isValid).toBe(false);
    expect(validateFloorplanSpot({ x: 1, y: 1, angle: 0, floor: 1.5 }).isValid).toBe(false);
    expect(validateFloorplanSpot({ x: 1, y: 1, angle: 0, floor: MAX_FLOORPLANS }).isValid).toBe(false);
    expect(sanitizeFloorplanSpot({ x: 1, y: 1, angle: 0, floor: MAX_FLOORPLANS })).toBeUndefined();
  });

  it('reads spots saved before floors existed as on the first floor', () => {
    expect(spotFloor({ x: 1, y: 1, angle: 0 })).toBe(0);
    expect(spotFloor({ x: 1, y: 1, angle: 0, floor: 1 })).toBe(1);
    expect(spotFloor(undefined)).toBe(0);
  });

  it('prefers the floors list and falls back to the single floorplanUrl', () => {
    const floors = [{ url: 'https://a/1.png', label: 'Floor 1' }, { url: 'https://a/2.png', label: 'Floor 2' }];
    expect(getFloorPlans({ floorplans: floors, floorplanUrl: 'https://a/1.png' })).toEqual(floors);
    expect(getFloorPlans({ floorplanUrl: 'https://a/old.png' })).toEqual([{ url: 'https://a/old.png' }]);
    expect(getFloorPlans({ floorplans: [], floorplanUrl: 'https://a/old.png' })).toEqual([{ url: 'https://a/old.png' }]);
    expect(getFloorPlans({})).toEqual([]);
  });
});
