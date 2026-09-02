/**
 * Estimated apartment prices
 *
 * `avgPricePerSqm` is ingested from the market-data API, where zero, missing
 * and nonsense values all occur. Multiplying those out renders a grid of
 * confident "€0" tiles, so the guard is the point of this module.
 */

import { describe, it, expect } from 'vitest';
import {
  buildApartmentPriceEstimates,
  isUsablePricePerSqm,
  formatTypicalSize,
  APARTMENT_TYPES,
} from '../features/cities/utils/priceEstimates';

describe('isUsablePricePerSqm', () => {
  it('accepts a plausible €/m²', () => {
    expect(isUsablePricePerSqm(2400)).toBe(true);
    expect(isUsablePricePerSqm(1)).toBe(true);
  });

  it('rejects zero, negative, non-finite and non-numeric values', () => {
    expect(isUsablePricePerSqm(0)).toBe(false);
    expect(isUsablePricePerSqm(-500)).toBe(false);
    expect(isUsablePricePerSqm(Number.NaN)).toBe(false);
    expect(isUsablePricePerSqm(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isUsablePricePerSqm(undefined)).toBe(false);
    expect(isUsablePricePerSqm(null)).toBe(false);
    expect(isUsablePricePerSqm('2400')).toBe(false);
  });

  it('rejects a figure far outside this market (corrupt feed)', () => {
    expect(isUsablePricePerSqm(500_000)).toBe(false);
  });
});

describe('buildApartmentPriceEstimates', () => {
  it('prices every apartment type from the €/m²', () => {
    const estimates = buildApartmentPriceEstimates(3000);

    expect(estimates).toHaveLength(APARTMENT_TYPES.length);
    expect(estimates[0]).toEqual({ type: 'Studio', size: 38, price: 114_000 });
    expect(estimates.map(e => e.price)).toEqual([114_000, 174_000, 246_000, 345_000]);
  });

  it('rounds to whole euros', () => {
    const [studio] = buildApartmentPriceEstimates(2399.7);
    expect(Number.isInteger(studio.price)).toBe(true);
  });

  it('returns no estimates at all for an unusable €/m²', () => {
    // The panel hides the section on an empty list, so "€0" is never rendered.
    expect(buildApartmentPriceEstimates(0)).toEqual([]);
    expect(buildApartmentPriceEstimates(undefined)).toEqual([]);
    expect(buildApartmentPriceEstimates(Number.NaN)).toEqual([]);
    expect(buildApartmentPriceEstimates(-100)).toEqual([]);
  });

  it('drops one bad size instead of the whole grid', () => {
    const estimates = buildApartmentPriceEstimates(2400, [
      { type: 'Studio', size: 38 },
      { type: 'Broken', size: 0 },
      { type: 'AlsoBroken', size: Number.NaN },
      { type: '2-Bedroom', size: 82 },
    ]);

    expect(estimates.map(e => e.type)).toEqual(['Studio', '2-Bedroom']);
  });

  it('is pure — the shared type list is never mutated', () => {
    const before = JSON.stringify(APARTMENT_TYPES);
    buildApartmentPriceEstimates(2400);
    expect(JSON.stringify(APARTMENT_TYPES)).toBe(before);
  });
});

describe('formatTypicalSize', () => {
  it('renders a rounded size caption', () => {
    expect(formatTypicalSize(38)).toBe('~38 m²');
    expect(formatTypicalSize(82.4)).toBe('~82 m²');
  });
});
