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
        expect(aiQueryToFilters({})).toEqual({ ...initialFilters, constructionStatus: 'any', minKitchens: null });
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
    ])('leaves out a listing with %s', (_label, change) => {
        expect(filterProperties([{ ...match, ...change } as Property], filters)).toEqual([]);
    });
});
