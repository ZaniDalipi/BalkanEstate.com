import { describe, it, expect } from 'vitest';
import type { Property, Filters } from '@/types';
import { initialFilters } from '@/types';
import { createPropertyMatcher, rankProperties, sortByRelevance } from '@/shared/search';
import { filterProperties } from '@/utils/propertyUtils';
import { applyQueryToFilters } from '@/src/features/search/universal/queryToFilters';

const property = (overrides: Partial<Property>): Property => ({
  id: 'p1',
  sellerId: 's1',
  listingType: 'sale',
  status: 'active',
  price: 200_000,
  address: 'Jadranski Put 12',
  city: 'Budva',
  country: 'Montenegro',
  beds: 2,
  baths: 1,
  livingRooms: 1,
  sqft: 80,
  yearBuilt: 2015,
  parking: 1,
  description: '',
  specialFeatures: [],
  materials: [],
  amenities: [],
  imageUrl: '',
  lat: 42.28,
  lng: 18.84,
  seller: { name: 'Seller', type: 'agent' } as Property['seller'],
  propertyType: 'apartment',
  ...overrides,
});

const budvaApartment = property({ id: 'budva-apt', title: 'Sea View Apartment' });
const zagrebApartment = property({
  id: 'zagreb-apt',
  city: 'Zagreb',
  country: 'Croatia',
  address: 'Ilica 5',
  title: 'City Apartment',
  lat: 45.81,
  lng: 15.98,
});
const beciciVilla = property({
  id: 'becici-villa',
  address: 'Bečići bb',
  title: 'Villa Bečići',
  propertyType: 'villa',
  price: 450_000,
  beds: 4,
});

const all = [budvaApartment, zagrebApartment, beciciVilla];

const withQuery = (query: string, extra: Partial<Filters> = {}): Filters => ({
  ...initialFilters,
  propertyType: 'any',
  query,
  ...extra,
});

describe('createPropertyMatcher', () => {
  it('requires every word, so a second word narrows rather than widens', () => {
    const matcher = createPropertyMatcher('Budva apartment');
    expect(matcher.matches(budvaApartment)).toBe(true);
    // The bug this replaced: OR-ing the terms returned every apartment
    // anywhere as soon as the word "apartment" was typed.
    expect(matcher.matches(zagrebApartment)).toBe(false);
  });

  it('matches a place typed without its diacritics', () => {
    expect(createPropertyMatcher('becici').matches(beciciVilla)).toBe(true);
    expect(createPropertyMatcher('Bečići').matches(beciciVilla)).toBe(true);
  });

  it('forgives a typo in a long enough word', () => {
    expect(createPropertyMatcher('budvva').matches(budvaApartment)).toBe(true);
  });

  it('does not search street names for the numbers in a sentence', () => {
    // Everything the sentence explains becomes a filter, so all that is left
    // to match on is the place — the listing must not be rejected for having
    // no "300k" or "bed" in its address.
    const matcher = createPropertyMatcher('3 bed apartment in Budva under 300k');
    expect(matcher.parsed.terms).toEqual(['budva']);
    expect(matcher.parsed.intent).toMatchObject({ beds: 3, propertyType: 'apartment', maxPrice: 300_000 });
    expect(matcher.matches(budvaApartment)).toBe(true);
  });

  it('rejects a listing carrying an excluded word', () => {
    const matcher = createPropertyMatcher('Budva -villa');
    expect(matcher.matches(budvaApartment)).toBe(true);
    expect(matcher.matches(beciciVilla)).toBe(false);
  });

  it('takes a quoted phrase literally', () => {
    const matcher = createPropertyMatcher('"sea view"');
    expect(matcher.matches(budvaApartment)).toBe(true);
    expect(matcher.matches(zagrebApartment)).toBe(false);
  });

  it('passes everything when the query says nothing about text', () => {
    const matcher = createPropertyMatcher('   ');
    expect(matcher.isActive).toBe(false);
    expect(all.every((entry) => matcher.matches(entry))).toBe(true);
  });

  it('finds a listing by its reference number', () => {
    const referenced = property({ id: 'ref-1', propertyId: 'BE-1042' });
    expect(createPropertyMatcher('BE-1042').matches(referenced)).toBe(true);
  });
});

describe('filterProperties', () => {
  it('narrows on the words typed', () => {
    expect(filterProperties(all, withQuery('Budva')).map((entry) => entry.id))
      .toEqual(['budva-apt', 'becici-villa']);
    expect(filterProperties(all, withQuery('Zagreb')).map((entry) => entry.id))
      .toEqual(['zagreb-apt']);
  });

  it('still applies the rest of the filters alongside the text', () => {
    const filtered = filterProperties(all, withQuery('Budva', { maxPrice: 300_000 }));
    expect(filtered.map((entry) => entry.id)).toEqual(['budva-apt']);
  });

  it('keeps every listing when the box is empty', () => {
    expect(filterProperties(all, withQuery(''))).toHaveLength(all.length);
  });
});

describe('rankProperties', () => {
  it('puts the closest match first', () => {
    const ranked = rankProperties(all, 'Bečići');
    expect(ranked[0].doc.id).toBe('becici-villa');
  });

  it('orders a list by relevance without dropping anything', () => {
    const sorted = sortByRelevance(all, 'Zagreb');
    expect(sorted[0].id).toBe('zagreb-apt');
    expect(sorted).toHaveLength(all.length);
  });

  it('leaves the order alone when there is nothing to rank by', () => {
    expect(sortByRelevance(all, '')).toEqual(all);
  });
});

describe('applyQueryToFilters', () => {
  it('moves the filters a sentence describes and leaves the place as the text', () => {
    const { filters, changedFilters } = applyQueryToFilters(
      initialFilters,
      '3 bedroom villa in Budva under 300k with a pool'
    );

    expect(changedFilters).toBe(true);
    expect(filters).toMatchObject({
      beds: 3,
      propertyType: 'villa',
      maxPrice: 300_000,
      hasPool: true,
    });
    expect(filters.query.toLowerCase()).toContain('budva');
    expect(filters.query.toLowerCase()).not.toContain('300k');
  });

  it('changes nothing but the text for a plain place name', () => {
    const { filters, changedFilters } = applyQueryToFilters(initialFilters, 'Bečići, Budva');
    expect(changedFilters).toBe(false);
    expect(filters).toEqual({ ...initialFilters, query: 'Bečići, Budva' });
  });

  it('leaves filters the sentence did not mention exactly as they were', () => {
    const existing: Filters = { ...initialFilters, minPrice: 50_000, beds: 2 };
    const { filters } = applyQueryToFilters(existing, 'villa in Kotor');
    expect(filters.minPrice).toBe(50_000);
    expect(filters.beds).toBe(2);
    expect(filters.propertyType).toBe('villa');
  });

  it('lets a newer instruction replace an older one', () => {
    const existing: Filters = { ...initialFilters, maxPrice: 500_000 };
    const { filters } = applyQueryToFilters(existing, 'Budva under 200k');
    expect(filters.maxPrice).toBe(200_000);
  });

  it('reads "with parking" as at least one space', () => {
    const { filters } = applyQueryToFilters(initialFilters, 'apartment in Tirana with parking');
    expect(filters.minParking).toBe(1);
  });

  it('reads "sea view" and "furnished" onto the right controls', () => {
    const { filters } = applyQueryToFilters(initialFilters, 'furnished sea view apartment in Bar');
    expect(filters.viewType).toBe('sea');
    expect(filters.furnishing).toBe('furnished');
  });
});
