/**
 * AI property search — what the model's search may carry to the client.
 *
 * Pure functions only — see `usesDatabase` in setup.ts.
 */

process.env.SKIP_TEST_DB = 'true';

import { sanitizeAiSearchQuery } from '../services/aiSearchQuery';

describe('sanitizeAiSearchQuery', () => {
  it('keeps every criterion of a detailed request', () => {
    const query = sanitizeAiSearchQuery({
      location: 'Tirana', country: 'Albania', propertyType: 'apartment',
      minSqft: 76, maxSqft: 76, beds: 1, maxBeds: 1, kitchens: 1, maxPrice: 200000,
      constructionStatus: 'under-construction', heatingType: 'electric',
      minFloorNumber: 15, maxFloorNumber: 15, energyRating: 'A+',
      maxDistanceToSchool: 0.5, amenities: ['Floor heating', 'panoramic view'],
    });
    expect(query).toEqual({
      location: 'Tirana', country: 'Albania', propertyType: 'apartment',
      minSqft: 76, maxSqft: 76, beds: 1, maxBeds: 1, kitchens: 1, maxPrice: 200000,
      constructionStatus: 'under-construction', heatingType: 'electric',
      minFloorNumber: 15, maxFloorNumber: 15, energyRating: 'A+',
      maxDistanceToSchool: 0.5, amenities: ['floor heating', 'panoramic view'],
    });
  });

  it('drops nulls, unknown keys, wrong types and values outside an enum', () => {
    expect(sanitizeAiSearchQuery({
      location: null, beds: '2', heatingType: 'nuclear', energyRating: 'Z',
      hacker: 'x', hasPool: 'yes', maxPrice: -5, minSqft: Number.NaN,
    })).toEqual({});
  });

  it('keeps the ground floor and a false yes/no answer', () => {
    expect(sanitizeAiSearchQuery({ minFloorNumber: 0, maxFloorNumber: 0, petsAllowed: false }))
      .toEqual({ minFloorNumber: 0, maxFloorNumber: 0, petsAllowed: false });
  });

  it('swaps a range given back to front', () => {
    expect(sanitizeAiSearchQuery({ minSqft: 80, maxSqft: 60, minPrice: 150000, maxPrice: 100000, beds: 3, maxBeds: 2 }))
      .toEqual({ minSqft: 60, maxSqft: 80, minPrice: 100000, maxPrice: 150000, beds: 2, maxBeds: 3 });
  });

  it('reads the older "features" list and de-duplicates amenities', () => {
    expect(sanitizeAiSearchQuery({ features: ['Sauna', 'sauna ', ''] })).toEqual({ amenities: ['sauna'] });
  });

  it('keeps each amenity with its translations, cleaned', () => {
    expect(sanitizeAiSearchQuery({ amenities: ['Floor heating | Ngrohje në dysheme|floor heating', ' | '] }))
      .toEqual({ amenities: ['floor heating|ngrohje në dysheme'] });
  });

  it('keeps a known orientation and drops an unknown one', () => {
    expect(sanitizeAiSearchQuery({ orientation: 'southEast' })).toEqual({ orientation: 'southEast' });
    expect(sanitizeAiSearchQuery({ orientation: 'up' })).toEqual({});
  });

  it('returns null for anything that is not an object', () => {
    expect(sanitizeAiSearchQuery(null)).toBeNull();
    expect(sanitizeAiSearchQuery('Tirana')).toBeNull();
    expect(sanitizeAiSearchQuery([1, 2])).toBeNull();
  });
});
