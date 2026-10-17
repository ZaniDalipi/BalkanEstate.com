import { describe, it, expect } from 'vitest';
import {
  deriveFilterBounds,
  unitMatchesCriteria,
  hasActiveCriteria,
  EMPTY_CRITERIA,
} from './unitFilters';
import type { PublicUnit } from '../types';

const unit = (over: Partial<PublicUnit>): PublicUnit =>
  ({
    id: Math.random().toString(36).slice(2),
    developmentId: 'd',
    buildingId: 'b',
    floorId: 'f',
    unitNumber: 'A1',
    unitType: 'apartment',
    availability: 'available',
    listingIds: [],
    ...over,
  }) as PublicUnit;

describe('deriveFilterBounds', () => {
  it('collects bed options, types and area/level bounds', () => {
    const bounds = deriveFilterBounds([
      unit({ beds: 1, unitType: 'studio', totalArea: 40, floorLevel: 1 }),
      unit({ beds: 3, unitType: 'apartment', totalArea: 95, floorLevel: 8 }),
      unit({ beds: 1, unitType: 'apartment', netArea: 55, floorLevel: 3 }),
    ]);
    expect(bounds.bedOptions).toEqual([1, 3]);
    expect(bounds.types).toEqual(['apartment', 'studio']);
    expect(bounds.areaMin).toBe(40);
    expect(bounds.areaMax).toBe(95);
    expect(bounds.levelMin).toBe(1);
    expect(bounds.levelMax).toBe(8);
  });

  it('returns null bounds when no numeric data is present', () => {
    const bounds = deriveFilterBounds([unit({})]);
    expect(bounds.areaMin).toBeNull();
    expect(bounds.levelMax).toBeNull();
  });
});

describe('unitMatchesCriteria', () => {
  it('matches everything when criteria are empty', () => {
    expect(unitMatchesCriteria(unit({ beds: 2 }), EMPTY_CRITERIA)).toBe(true);
    expect(hasActiveCriteria(EMPTY_CRITERIA)).toBe(false);
  });

  it('treats the max bed option as N+', () => {
    const u = unit({ beds: 5 });
    expect(unitMatchesCriteria(u, { beds: [4], types: [] }, 4)).toBe(true);
    expect(unitMatchesCriteria(unit({ beds: 2 }), { beds: [4], types: [] }, 4)).toBe(false);
  });

  it('respects exact bed counts below the max', () => {
    expect(unitMatchesCriteria(unit({ beds: 2 }), { beds: [1, 2], types: [] }, 4)).toBe(true);
    expect(unitMatchesCriteria(unit({ beds: 3 }), { beds: [1, 2], types: [] }, 4)).toBe(false);
  });

  it('filters by unit type', () => {
    expect(unitMatchesCriteria(unit({ unitType: 'duplex' }), { beds: [], types: ['duplex'] })).toBe(true);
    expect(unitMatchesCriteria(unit({ unitType: 'apartment' }), { beds: [], types: ['duplex'] })).toBe(false);
  });

  it('filters by area range and excludes units without an area', () => {
    expect(unitMatchesCriteria(unit({ totalArea: 80 }), { beds: [], types: [], minArea: 60, maxArea: 100 })).toBe(true);
    expect(unitMatchesCriteria(unit({ totalArea: 50 }), { beds: [], types: [], minArea: 60 })).toBe(false);
    expect(unitMatchesCriteria(unit({}), { beds: [], types: [], minArea: 60 })).toBe(false);
  });

  it('filters by floor level range', () => {
    expect(unitMatchesCriteria(unit({ floorLevel: 5 }), { beds: [], types: [], minLevel: 2, maxLevel: 8 })).toBe(true);
    expect(unitMatchesCriteria(unit({ floorLevel: 1 }), { beds: [], types: [], minLevel: 2 })).toBe(false);
  });

  it('combines all constraints with AND', () => {
    const u = unit({ beds: 2, unitType: 'apartment', totalArea: 75, floorLevel: 4 });
    expect(
      unitMatchesCriteria(u, { beds: [2], types: ['apartment'], minArea: 60, maxArea: 90, minLevel: 2, maxLevel: 6 }, 4)
    ).toBe(true);
    // Same unit, but the area floor is now above its 75 m² → excluded.
    expect(
      unitMatchesCriteria(u, { beds: [2], types: ['apartment'], minArea: 80 }, 4)
    ).toBe(false);
  });
});
