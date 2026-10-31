import { describe, it, expect } from 'vitest';
import { initialFilters } from '@/types';
import type { Property } from '@/types';
import { filterProperties } from '@/utils/propertyUtils';
import { aiQueryToFilters, countryKeyFromAi } from './aiQueryToFilters';

const tiranaRequest = {
    location: 'Tirana', country: 'Albania', propertyType: 'apartment' as const,
    minSqft: 76, maxSqft: 76, beds: 1, kitchens: 1, maxPrice: 200000,
    constructionStatus: 'under-construction' as const, heatingType: 'electric' as const,
    minFloorNumber: 15, maxFloorNumber: 15, energyRating: 'A+' as const,
    maxDistanceToSchool: 0.5, amenities: ['floor heating', 'panoramic view'],
};

describe('aiQueryToFilters', () => {
    it('applies every criterion of a detailed request', () => {
        const f = aiQueryToFilters(tiranaRequest);
        expect(f).toMatchObject({
            query: 'Tirana', country: 'albania', propertyType: 'apartment',
            minSqft: 76, maxSqft: 76, beds: 1, minKitchens: 1, maxPrice: 200000, minPrice: null,
            constructionStatus: 'under-construction', heatingType: 'electric',
            minFloorNumber: 15, maxFloorNumber: 15, energyRating: 'A+',
            maxDistanceToSchool: 0.5, amenities: ['floor heating', 'panoramic view'],
        });
    });

    it('starts from the defaults, so nothing from an earlier search lingers', () => {
        expect(aiQueryToFilters({})).toEqual({
            ...initialFilters, constructionStatus: 'any', minKitchens: null, requireKnownDistances: true, orientation: 'any',
        });
    });

    it('treats a country given as the location as the country, not a place name', () => {
        const f = aiQueryToFilters({ location: 'North Macedonia' });
        expect(f.country).toBe('north-macedonia');
        expect(f.query).toBe('');
    });

    it('keeps commercial as its own type', () => {
        expect(aiQueryToFilters({ propertyType: 'commercial' }).propertyType).toBe('commercial');
    });

    it('moves yes/no amenities onto their field', () => {
        const f = aiQueryToFilters({ amenities: ['Swimming pool', 'Lift', 'sauna'] });
        expect(f.hasPool).toBe(true);
        expect(f.hasElevator).toBe(true);
        expect(f.amenities).toEqual(['sauna']);
    });

    it('keeps each amenity with its translations, and maps a translated yes/no feature', () => {
        const f = aiQueryToFilters({ amenities: ['Floor heating|Ngrohje në dysheme', 'elevator|ashensor', 'floor heating|other'] });
        expect(f.amenities).toEqual(['floor heating|ngrohje në dysheme']);
        expect(f.hasElevator).toBe(true);
    });

    it('applies orientation', () => {
        expect(aiQueryToFilters({ orientation: 'southEast' }).orientation).toBe('southEast');
        expect(aiQueryToFilters({ orientation: 'up' as never }).orientation).toBe('any');
    });

    it('keeps an explicit "no" and the ground floor', () => {
        const f = aiQueryToFilters({ petsAllowed: false, minFloorNumber: 0, maxFloorNumber: 0 });
        expect(f.petsAllowed).toBe(false);
        expect([f.minFloorNumber, f.maxFloorNumber]).toEqual([0, 0]);
    });

    it('swaps a range given back to front and drops malformed values', () => {
        const f = aiQueryToFilters({ minSqft: 80, maxSqft: 60, beds: -1, heatingType: 'nuclear' as never });
        expect([f.minSqft, f.maxSqft]).toEqual([60, 80]);
        expect(f.beds).toBeNull();
        expect(f.heatingType).toBe('any');
    });

    it('sets rent only when asked', () => {
        expect(aiQueryToFilters({ listingType: 'rent' }).listingType).toBe('rent');
        expect(aiQueryToFilters({}).listingType).toBe(initialFilters.listingType);
    });
});

describe('countryKeyFromAi', () => {
    it('knows our countries and nothing else', () => {
        expect(countryKeyFromAi('Bosnia and Herzegovina')).toBe('bosnia-herzegovina');
        expect(countryKeyFromAi('Tirana')).toBeNull();
        expect(countryKeyFromAi(undefined)).toBeNull();
    });
});

describe('an AI search keeps only listings that meet every criterion', () => {
    const match = {
        id: 'match', lat: 41.33, lng: 19.82, city: 'Tirana', address: 'Rruga e Kavajës', country: 'Albania',
        price: 180000, sqft: 76, beds: 1, kitchens: 1, propertyType: 'apartment', listingType: 'sale',
        status: 'active', seller: { type: 'agent' }, constructionStatus: 'under-construction',
        heatingType: 'electric', floorNumber: 15, energyRating: 'A+', distanceToSchool: 0.3,
        amenities: ['Panoramic view'], specialFeatures: ['Electric floor heating'],
        description: '', materials: [], yearBuilt: 2027,
    } as unknown as Property;
    const filters = aiQueryToFilters(tiranaRequest);

    it('finds the listing that has everything', () => {
        expect(filterProperties([match], filters).map(p => p.id)).toEqual(['match']);
    });

    it.each([
        ['a different size', { sqft: 77 }],
        ['a finished building', { constructionStatus: 'ready' }],
        ['another floor', { floorNumber: 14 }],
        ['a lower energy rating', { energyRating: 'A' }],
        ['no kitchen', { kitchens: 0 }],
        ['a missing amenity', { amenities: [], specialFeatures: ['Electric floor heating'] }],
        ['a school too far away', { distanceToSchool: 2 }],
        ['no school distance on record', { distanceToSchool: undefined }],
        ['a school distance stored as null', { distanceToSchool: null }],
    ])('leaves out a listing with %s', (_label, change) => {
        expect(filterProperties([{ ...match, ...change } as Property], filters)).toEqual([]);
    });
});

describe('unknown distances', () => {
    const unknown = { ...({} as Property), id: 'unknown', lat: 41.33, lng: 19.82, price: 1, sqft: 1,
        propertyType: 'apartment', listingType: 'sale', status: 'active', seller: { type: 'agent' } } as Property;

    it('pass a manual distance filter, as before', () => {
        expect(filterProperties([unknown], { ...initialFilters, maxDistanceToSea: 1 })).toHaveLength(1);
    });

    it('are left out of an AI search with a distance filter', () => {
        expect(filterProperties([unknown], aiQueryToFilters({ maxDistanceToSea: 1 }))).toEqual([]);
    });

    it('do not matter to an AI search without a distance filter', () => {
        expect(filterProperties([unknown], aiQueryToFilters({}))).toHaveLength(1);
    });
});

describe('the server\'s reading of the whole listing', () => {
    const base = { ...({} as Property), id: 'x', lat: 41.33, lng: 19.82, price: 1, sqft: 1, amenities: [],
        propertyType: 'apartment', listingType: 'sale', status: 'active', seller: { type: 'agent' } } as Property;
    const filters = aiQueryToFilters({ amenities: ['floor heating|ngrohje në dysheme'], hasElevator: true });

    it('keeps a listing it found, though the list does not show the feature', () => {
        expect(filterProperties([base], filters, { featureMatches: new Set(['x']) })).toHaveLength(1);
    });

    it('drops a listing it did not find, though a tag looks right', () => {
        const tagged = { ...base, amenities: ['floor heating'], hasElevator: true } as Property;
        expect(filterProperties([tagged], filters, { featureMatches: new Set() })).toEqual([]);
    });

    it('falls back to the fields the list carries until it answers', () => {
        const tagged = { ...base, amenities: ['Floor heating'], hasElevator: true } as Property;
        expect(filterProperties([tagged], filters)).toHaveLength(1);
        expect(filterProperties([base], filters)).toEqual([]);
    });

    it('still checks a "no" against the listing itself', () => {
        const noPets = aiQueryToFilters({ amenities: ['sauna'], petsAllowed: false });
        const allowsPets = { ...base, petsAllowed: true } as Property;
        expect(filterProperties([allowsPets], noPets, { featureMatches: new Set(['x']) })).toEqual([]);
    });
});
