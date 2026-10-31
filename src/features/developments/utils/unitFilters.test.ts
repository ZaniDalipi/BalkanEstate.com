import { describe, it, expect } from 'vitest';
import {
  deriveFilterBounds,
  unitMatchesCriteria,
  hasActiveCriteria,
  EMPTY_CRITERIA,
  filterUnits,
  unitArea,
  unitHasFlag,
  toggleIn,
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
    expect(unitMatchesCriteria(u, { beds: [4], types: [], features: [] }, 4)).toBe(true);
    expect(unitMatchesCriteria(unit({ beds: 2 }), { beds: [4], types: [], features: [] }, 4)).toBe(false);
  });

  it('respects exact bed counts below the max', () => {
    expect(unitMatchesCriteria(unit({ beds: 2 }), { beds: [1, 2], types: [], features: [] }, 4)).toBe(true);
    expect(unitMatchesCriteria(unit({ beds: 3 }), { beds: [1, 2], types: [], features: [] }, 4)).toBe(false);
  });

  it('filters by unit type', () => {
    expect(unitMatchesCriteria(unit({ unitType: 'duplex' }), { beds: [], types: ['duplex'], features: [] })).toBe(true);
    expect(unitMatchesCriteria(unit({ unitType: 'apartment' }), { beds: [], types: ['duplex'], features: [] })).toBe(false);
  });

  it('filters by feature flags with AND', () => {
    const u = unit({ features: ['big_terrace', 'duplex'] });
    expect(unitMatchesCriteria(u, { beds: [], types: [], features: ['big_terrace'] })).toBe(true);
    expect(unitMatchesCriteria(u, { beds: [], types: [], features: ['big_terrace', 'duplex'] })).toBe(true);
    expect(unitMatchesCriteria(u, { beds: [], types: [], features: ['big_terrace', 'garden'] })).toBe(false);
    expect(unitMatchesCriteria(unit({ features: [] }), { beds: [], types: [], features: ['duplex'] })).toBe(false);
  });

  it('filters by area range and excludes units without an area', () => {
    expect(unitMatchesCriteria(unit({ totalArea: 80 }), { beds: [], types: [], features: [], minArea: 60, maxArea: 100 })).toBe(true);
    expect(unitMatchesCriteria(unit({ totalArea: 50 }), { beds: [], types: [], features: [], minArea: 60 })).toBe(false);
    expect(unitMatchesCriteria(unit({}), { beds: [], types: [], features: [], minArea: 60 })).toBe(false);
  });

  it('filters by floor level range', () => {
    expect(unitMatchesCriteria(unit({ floorLevel: 5 }), { beds: [], types: [], features: [], minLevel: 2, maxLevel: 8 })).toBe(true);
    expect(unitMatchesCriteria(unit({ floorLevel: 1 }), { beds: [], types: [], features: [], minLevel: 2 })).toBe(false);
  });

  it('combines all constraints with AND', () => {
    const u = unit({ beds: 2, unitType: 'apartment', totalArea: 75, floorLevel: 4, features: ['big_terrace'] });
    expect(
      unitMatchesCriteria(u, { beds: [2], types: ['apartment'], features: ['big_terrace'], minArea: 60, maxArea: 90, minLevel: 2, maxLevel: 6 }, 4)
    ).toBe(true);
    // Same unit, but the area floor is now above its 75 m² → excluded.
    expect(
      unitMatchesCriteria(u, { beds: [2], types: ['apartment'], features: [], minArea: 80 }, 4)
    ).toBe(false);
  });
});

describe('extended criteria', () => {
  const base = EMPTY_CRITERIA;

  it('treats the max bath option as N+', () => {
    expect(unitMatchesCriteria(unit({ baths: 3 }), { ...base, baths: [2] }, undefined, 2)).toBe(true);
    expect(unitMatchesCriteria(unit({ baths: 1 }), { ...base, baths: [2] }, undefined, 2)).toBe(false);
    expect(unitMatchesCriteria(unit({}), { ...base, baths: [1] })).toBe(false);
  });

  it('filters by price range and excludes price-on-request units', () => {
    expect(unitMatchesCriteria(unit({ price: 120000 }), { ...base, minPrice: 100000, maxPrice: 150000 })).toBe(true);
    expect(unitMatchesCriteria(unit({ price: 90000 }), { ...base, minPrice: 100000 })).toBe(false);
    expect(unitMatchesCriteria(unit({ priceOnRequest: true }), { ...base, maxPrice: 150000 })).toBe(false);
    expect(unitMatchesCriteria(unit({ priceOnRequest: true, price: 1 }), { ...base, maxPrice: 150000 })).toBe(false);
  });

  it('filters by effective availability with OR', () => {
    const c = { ...base, availability: ['available', 'reserved'] as const };
    expect(unitMatchesCriteria(unit({ availability: 'reserved' }), { ...c, availability: [...c.availability] })).toBe(true);
    expect(unitMatchesCriteria(unit({ availability: 'sold' }), { ...c, availability: [...c.availability] })).toBe(false);
  });

  it('filters by orientation case-insensitively', () => {
    expect(unitMatchesCriteria(unit({ orientation: 'South' }), { ...base, orientations: ['south'] })).toBe(true);
    expect(unitMatchesCriteria(unit({ orientation: 'north' }), { ...base, orientations: ['south'] })).toBe(false);
    expect(unitMatchesCriteria(unit({}), { ...base, orientations: ['south'] })).toBe(false);
  });

  it('derives terrace / balcony / duplex / penthouse / furnished flags', () => {
    expect(unitHasFlag(unit({ terraces: 1 }), 'terrace')).toBe(true);
    expect(unitHasFlag(unit({ terraceArea: 12 }), 'terrace')).toBe(true);
    expect(unitHasFlag(unit({ features: ['big_terrace'] }), 'terrace')).toBe(true);
    expect(unitHasFlag(unit({}), 'terrace')).toBe(false);
    expect(unitHasFlag(unit({ balconies: 2 }), 'balcony')).toBe(true);
    expect(unitHasFlag(unit({ balconies: 0 }), 'balcony')).toBe(false);
    expect(unitHasFlag(unit({ features: ['duplex', 'penthouse', 'furnished'] }), 'duplex')).toBe(true);
    const u = unit({ balconies: 1, features: ['penthouse'] });
    expect(unitMatchesCriteria(u, { ...base, flags: ['balcony', 'penthouse'] })).toBe(true);
    expect(unitMatchesCriteria(u, { ...base, flags: ['balcony', 'furnished'] })).toBe(false);
  });

  it('uses the same area field for display and filtering (total, then net, then gross)', () => {
    expect(unitArea({ totalArea: 80, netArea: 70 })).toBe(80);
    expect(unitArea({ netArea: 70, grossArea: 90 })).toBe(70);
    expect(unitArea({ grossArea: 90 })).toBe(90);
    expect(unitMatchesCriteria(unit({ totalArea: 80, netArea: 55 }), { ...base, minArea: 60 })).toBe(true);
  });

  it('derives bath, price, orientation and flag bounds', () => {
    const b = deriveFilterBounds([
      unit({ baths: 1, price: 100000, orientation: 'south', balconies: 1 }),
      unit({ baths: 2, price: 250000, features: ['duplex'] }),
      unit({ priceOnRequest: true }),
    ]);
    expect(b.bathOptions).toEqual([1, 2]);
    expect(b.priceMin).toBe(100000);
    expect(b.priceMax).toBe(250000);
    expect(b.orientations).toEqual(['south']);
    expect(b.flags).toEqual(['balcony', 'duplex']);
  });

  it('filterUnits applies N+ thresholds from the data and short-circuits empty criteria', () => {
    const units = [unit({ beds: 1 }), unit({ beds: 3 }), unit({ beds: 4 })];
    expect(filterUnits(units, base)).toBe(units);
    expect(filterUnits(units, { ...base, beds: [4] })).toHaveLength(1);
    expect(filterUnits(units, { ...base, beds: [3] })).toHaveLength(1);
  });

  it('toggleIn adds and removes values in optional lists', () => {
    const once = toggleIn(base, 'flags', 'terrace');
    expect(once.flags).toEqual(['terrace']);
    expect(toggleIn(once, 'flags', 'terrace').flags).toEqual([]);
    expect(hasActiveCriteria(once)).toBe(true);
    expect(hasActiveCriteria({ ...base, maxPrice: 5 })).toBe(true);
  });
});

describe('entrance filter', () => {
  const homes = [
    unit({ id: 'a1', entranceId: 'e1', entranceName: 'Entrance A', buildingName: 'Block A' }),
    unit({ id: 'a2', entranceId: 'e2', entranceName: 'Entrance B', buildingName: 'Block A' }),
    unit({ id: 'b1', entranceId: 'e3', entranceName: 'Entrance A', buildingName: 'Block B' }),
    unit({ id: 'x', buildingName: 'Block C' }),
  ];

  it('keeps the homes reached through the chosen entrances', () => {
    const c = { beds: [], types: [], features: [], entrances: ['e1', 'e3'] };
    expect(hasActiveCriteria(c)).toBe(true);
    expect(filterUnits(homes, c).map((u) => u.id)).toEqual(['a1', 'b1']);
  });

  it('offers each entrance once, adding the building when two share a name', () => {
    expect(deriveFilterBounds(homes).entrances).toEqual([
      { id: 'e1', name: 'Entrance A · Block A' },
      { id: 'e2', name: 'Entrance B' },
      { id: 'e3', name: 'Entrance A · Block B' },
    ]);
  });
});
