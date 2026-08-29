/**
 * Property-type filter tests.
 *
 * The type filter is a set rather than a single value, and several callers
 * still hand it the legacy shapes (a bare string, the 'any' sentinel, a
 * comma-separated query param). These cover the normalisation that absorbs
 * those, and the client-side filter that consumes it — a mismatch there
 * silently returns zero results rather than failing loudly.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePropertyTypes,
  PROPERTY_TYPE_VALUES,
} from '../../constants/propertyTypes';
import { filterProperties } from '../../utils/propertyUtils';
import { initialFilters, type Filters, type Property } from '../../types';

const makeProperty = (overrides: Partial<Property>): Property =>
  ({
    id: overrides.id ?? 'p1',
    title: 'Test',
    address: 'Somewhere 1',
    city: 'Durres',
    country: 'Albania',
    price: 100000,
    beds: 2,
    baths: 1,
    livingRooms: 1,
    sqft: 80,
    lat: 41.3,
    lng: 19.45,
    propertyType: 'apartment',
    listingType: 'sale',
    seller: { type: 'private', name: 'Someone', phone: '' },
    ...overrides,
  }) as Property;

describe('normalizePropertyTypes', () => {
  it('treats the legacy sentinels as no filter', () => {
    expect(normalizePropertyTypes('any')).toEqual([]);
    expect(normalizePropertyTypes('all')).toEqual([]);
    expect(normalizePropertyTypes(null)).toEqual([]);
    expect(normalizePropertyTypes(undefined)).toEqual([]);
    expect(normalizePropertyTypes('')).toEqual([]);
  });

  it('accepts a legacy single value', () => {
    expect(normalizePropertyTypes('house')).toEqual(['house']);
  });

  it('accepts a comma-separated query param', () => {
    expect(normalizePropertyTypes('house,apartment')).toEqual(['house', 'apartment']);
    expect(normalizePropertyTypes(' house , apartment ')).toEqual(['house', 'apartment']);
  });

  it('drops unknown values instead of passing them through', () => {
    expect(normalizePropertyTypes(['house', 'castle', 'apartment'])).toEqual([
      'house',
      'apartment',
    ]);
    expect(normalizePropertyTypes('castle')).toEqual([]);
  });

  it('de-duplicates', () => {
    expect(normalizePropertyTypes(['house', 'house'])).toEqual(['house']);
  });

  it('keeps every value in the taxonomy', () => {
    expect(normalizePropertyTypes([...PROPERTY_TYPE_VALUES])).toEqual([
      ...PROPERTY_TYPE_VALUES,
    ]);
  });
});

describe('filterProperties — property type', () => {
  const apartment = makeProperty({ id: 'a', propertyType: 'apartment' });
  const house = makeProperty({ id: 'h', propertyType: 'house' });
  const studio = makeProperty({ id: 's', propertyType: 'studio' });
  const luxuryVilla = makeProperty({ id: 'lv', propertyType: 'luxury-villa' });
  const all = [apartment, house, studio, luxuryVilla];

  const withTypes = (propertyType: Filters['propertyType']): Filters => ({
    ...initialFilters,
    listingType: 'any',
    propertyType,
  });

  it('returns everything except luxury villas when no type is selected', () => {
    const result = filterProperties(all, withTypes([]));
    expect(result.map(p => p.id).sort()).toEqual(['a', 'h', 's']);
  });

  it('returns only the selected type', () => {
    const result = filterProperties(all, withTypes(['house']));
    expect(result.map(p => p.id)).toEqual(['h']);
  });

  it('returns the union of several selected types', () => {
    const result = filterProperties(all, withTypes(['house', 'studio']));
    expect(result.map(p => p.id).sort()).toEqual(['h', 's']);
  });

  it('includes luxury villas when explicitly selected', () => {
    const result = filterProperties(all, withTypes(['luxury-villa']));
    expect(result.map(p => p.id)).toEqual(['lv']);
  });

  it('still works when handed the legacy single-value shape', () => {
    // A saved search written before the multi-select change.
    const legacy = filterProperties(all, withTypes('house' as unknown as Filters['propertyType']));
    expect(legacy.map(p => p.id)).toEqual(['h']);

    const legacyAny = filterProperties(all, withTypes('any' as unknown as Filters['propertyType']));
    expect(legacyAny.map(p => p.id).sort()).toEqual(['a', 'h', 's']);
  });
});
