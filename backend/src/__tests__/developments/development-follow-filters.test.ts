/**
 * Phase: follow & alerts — the pure filter matcher that decides whether a unit
 * should alert a follower. No database, so it runs anywhere.
 */
process.env.SKIP_TEST_DB = 'true';

import { unitMatchesFilters } from '../../services/developments/developmentAlertService';

const unit = (overrides: Record<string, unknown> = {}) =>
  ({ beds: 2, price: 150000, netArea: 80, totalArea: 80, grossArea: 90, ...overrides } as never);

describe('unitMatchesFilters', () => {
  it('matches when there are no filters', () => {
    expect(unitMatchesFilters(unit(), undefined)).toBe(true);
    expect(unitMatchesFilters(unit(), {})).toBe(true);
  });

  it('respects bedroom bounds', () => {
    expect(unitMatchesFilters(unit({ beds: 2 }), { minBeds: 2 })).toBe(true);
    expect(unitMatchesFilters(unit({ beds: 1 }), { minBeds: 2 })).toBe(false);
    expect(unitMatchesFilters(unit({ beds: 4 }), { maxBeds: 3 })).toBe(false);
  });

  it('respects price bounds', () => {
    expect(unitMatchesFilters(unit({ price: 150000 }), { maxPrice: 200000 })).toBe(true);
    expect(unitMatchesFilters(unit({ price: 250000 }), { maxPrice: 200000 })).toBe(false);
    expect(unitMatchesFilters(unit({ price: 90000 }), { minPrice: 100000 })).toBe(false);
  });

  it('uses net area (fallbacks) for area bounds', () => {
    expect(unitMatchesFilters(unit({ netArea: 80 }), { minArea: 70, maxArea: 90 })).toBe(true);
    expect(unitMatchesFilters(unit({ netArea: 60 }), { minArea: 70 })).toBe(false);
  });

  it('excludes a unit missing a constrained field', () => {
    expect(unitMatchesFilters(unit({ beds: undefined }), { minBeds: 1 })).toBe(false);
    expect(unitMatchesFilters(unit({ price: undefined }), { maxPrice: 300000 })).toBe(false);
  });

  it('combines all constraints (AND)', () => {
    const filters = { minBeds: 2, maxPrice: 200000, minArea: 70 };
    expect(unitMatchesFilters(unit({ beds: 3, price: 180000, netArea: 85 }), filters)).toBe(true);
    expect(unitMatchesFilters(unit({ beds: 3, price: 210000, netArea: 85 }), filters)).toBe(false);
  });
});
