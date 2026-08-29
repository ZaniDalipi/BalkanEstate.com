import { describe, it, expect } from 'vitest';
import type { Filters, Property } from '@/types';
import { initialFilters } from '@/types';
import { filterProperties } from '@/utils/propertyUtils';

/**
 * Every control in VillaAllFilters must actually narrow the villa list.
 *
 * The panel writes plain `Filters` fields and `useVillaSearch` hands them
 * straight to `filterProperties`, so this drives that same composition —
 * `{ ...filters, propertyType: 'luxury-villa', listingType: <market> }` — and
 * asserts each field on its own. A control that renders but filters nothing
 * fails here rather than in someone's search.
 */

const villa = (overrides: Partial<Property> = {}): Property => ({
    id: Math.random().toString(36).slice(2),
    sellerId: 's1',
    listingType: 'rent',
    status: 'active',
    price: 1000,
    address: 'Rruga e Kavajës 42',
    city: 'Tirana',
    country: 'Albania',
    beds: 4,
    baths: 3,
    livingRooms: 2,
    sqft: 400,
    yearBuilt: 2015,
    parking: 2,
    description: '',
    specialFeatures: [],
    materials: [],
    amenities: [],
    imageUrl: '',
    lat: 41.3,
    lng: 19.8,
    seller: { type: 'private', name: '', phone: '' },
    propertyType: 'luxury-villa',
    createdAt: Date.now(),
    ...overrides,
} as Property);

/** The exact filter object the villa page builds before querying. */
const villaFilters = (overrides: Partial<Filters> = {}, market: 'any' | 'sale' | 'rent' = 'any'): Filters => ({
    ...initialFilters,
    ...overrides,
    propertyType: 'luxury-villa',
    listingType: market === 'any' ? 'any' : market,
});

/** Runs one filter over a matching and a non-matching villa. */
const narrows = (
    overrides: Partial<Filters>,
    matching: Partial<Property>,
    excluded: Partial<Property>,
    market: 'any' | 'sale' | 'rent' = 'any',
) => {
    const hit = villa({ ...matching, id: 'hit' });
    const miss = villa({ ...excluded, id: 'miss' });
    const result = filterProperties([hit, miss], villaFilters(overrides, market));
    return result.map(p => p.id);
};

describe('Luxury villa filters', () => {
    it('keeps luxury villas and drops every other home type', () => {
        const result = filterProperties(
            [villa({ id: 'v' }), villa({ id: 'h', propertyType: 'house' })],
            villaFilters(),
        );
        expect(result.map(p => p.id)).toEqual(['v']);
    });

    describe('Listing Status', () => {
        it('narrows to for-sale villas', () => {
            expect(narrows({}, { listingType: 'sale' }, { listingType: 'rent' }, 'sale')).toEqual(['hit']);
        });
        it('narrows to for-rent villas', () => {
            expect(narrows({}, { listingType: 'rent' }, { listingType: 'sale' }, 'rent')).toEqual(['hit']);
        });
        it('keeps both markets on "All"', () => {
            const both = filterProperties(
                [villa({ id: 'a', listingType: 'sale' }), villa({ id: 'b', listingType: 'rent' })],
                villaFilters({}, 'any'),
            );
            expect(both.map(p => p.id).sort()).toEqual(['a', 'b']);
        });
    });

    describe('Price', () => {
        it('applies a minimum', () => {
            expect(narrows({ minPrice: 2000 }, { price: 2500 }, { price: 1500 })).toEqual(['hit']);
        });
        it('applies a maximum', () => {
            expect(narrows({ maxPrice: 2000 }, { price: 1500 }, { price: 2500 })).toEqual(['hit']);
        });
    });

    describe('Beds & Baths', () => {
        it('treats bedrooms as N+', () => {
            expect(narrows({ beds: 4 }, { beds: 5 }, { beds: 3 })).toEqual(['hit']);
        });
        it('treats bathrooms as N+', () => {
            expect(narrows({ baths: 3 }, { baths: 3 }, { baths: 2 })).toEqual(['hit']);
        });
        it('treats living rooms as N+', () => {
            expect(narrows({ livingRooms: 2 }, { livingRooms: 3 }, { livingRooms: 1 })).toEqual(['hit']);
        });
    });

    it('filters by parking spots', () => {
        expect(narrows({ minParking: 2 }, { parking: 3 }, { parking: 1 })).toEqual(['hit']);
    });

    describe('Area', () => {
        it('applies a minimum', () => {
            expect(narrows({ minSqft: 400 }, { sqft: 500 }, { sqft: 300 })).toEqual(['hit']);
        });
        it('applies a maximum', () => {
            expect(narrows({ maxSqft: 400 }, { sqft: 300 }, { sqft: 500 })).toEqual(['hit']);
        });
    });

    it('filters by price per m²', () => {
        // 1000/200 = 5 €/m² vs 1000/100 = 10 €/m²
        expect(narrows({ maxPricePerSqm: 6 }, { price: 1000, sqft: 200 }, { price: 1000, sqft: 100 })).toEqual(['hit']);
    });

    it('filters by year built', () => {
        expect(narrows({ minYearBuilt: 2010 }, { yearBuilt: 2020 }, { yearBuilt: 2000 })).toEqual(['hit']);
        expect(narrows({ maxYearBuilt: 2010 }, { yearBuilt: 2000 }, { yearBuilt: 2020 })).toEqual(['hit']);
    });

    it('filters by floor, including below ground', () => {
        expect(narrows({ minFloorNumber: 1 }, { floorNumber: 2 }, { floorNumber: 0 })).toEqual(['hit']);
        // A basement level is a real floor; the panel must be able to reach it.
        expect(narrows({ maxFloorNumber: -1 }, { floorNumber: -1 }, { floorNumber: 1 })).toEqual(['hit']);
    });

    it('filters by days on market', () => {
        const day = 24 * 60 * 60 * 1000;
        expect(narrows(
            { maxDaysListed: 7 },
            { createdAt: Date.now() - 2 * day },
            { createdAt: Date.now() - 30 * day },
        )).toEqual(['hit']);
    });

    it('filters by who listed it', () => {
        expect(narrows(
            { sellerType: 'agent' },
            { seller: { type: 'agent', name: '', phone: '' } },
            { seller: { type: 'private', name: '', phone: '' } },
        )).toEqual(['hit']);
    });

    it('filters by condition, furnishing, heating and energy rating', () => {
        expect(narrows({ condition: 'new' }, { condition: 'new' }, { condition: 'good' })).toEqual(['hit']);
        expect(narrows({ furnishing: 'furnished' }, { furnishing: 'furnished' }, { furnishing: 'unfurnished' })).toEqual(['hit']);
        expect(narrows({ heatingType: 'solar' }, { heatingType: 'solar' }, { heatingType: 'gas' })).toEqual(['hit']);
        expect(narrows({ energyRating: 'A+' }, { energyRating: 'A+' }, { energyRating: 'C' })).toEqual(['hit']);
    });

    it('filters by view', () => {
        expect(narrows({ viewType: 'sea' }, { viewType: 'sea' }, { viewType: 'city' })).toEqual(['hit']);
    });

    describe('Must haves', () => {
        const cases: { key: keyof Filters; field: keyof Property }[] = [
            { key: 'hasPool', field: 'hasPool' },
            { key: 'hasGarden', field: 'hasGarden' },
            { key: 'hasBalcony', field: 'hasBalcony' },
            { key: 'hasElevator', field: 'hasElevator' },
            { key: 'hasSecurity', field: 'hasSecurity' },
            { key: 'hasAirConditioning', field: 'hasAirConditioning' },
            { key: 'petsAllowed', field: 'petsAllowed' },
        ];
        for (const { key, field } of cases) {
            it(`filters by ${String(key)}`, () => {
                expect(narrows(
                    { [key]: true } as Partial<Filters>,
                    { [field]: true } as Partial<Property>,
                    { [field]: false } as Partial<Property>,
                )).toEqual(['hit']);
            });
        }

        it('filters by 3D tour', () => {
            expect(narrows(
                { has360Tour: true },
                { hasVirtualTour360: true },
                { hasVirtualTour360: false },
            )).toEqual(['hit']);
        });
    });

    describe('Price change', () => {
        it('finds reduced prices', () => {
            expect(narrows({ hasDiscount: true }, { price: 900, originalPrice: 1200 }, { price: 900 })).toEqual(['hit']);
        });
        it('finds increased prices', () => {
            expect(narrows({ hasPriceIncrease: true }, { price: 1500, originalPrice: 1200 }, { price: 900 })).toEqual(['hit']);
        });
    });

    it('filters by distance', () => {
        expect(narrows({ maxDistanceToSea: 2 }, { distanceToSea: 0.5 }, { distanceToSea: 10 })).toEqual(['hit']);
    });

    it('filters by keyword amenities', () => {
        expect(narrows({ amenities: ['sauna'] }, { amenities: ['Private Sauna'] }, { amenities: ['gym'] })).toEqual(['hit']);
    });

    it('filters by country and location query', () => {
        expect(narrows({ country: 'Albania' }, { country: 'Albania' }, { country: 'Croatia' })).toEqual(['hit']);
        expect(narrows({ query: 'Ksamil' }, { city: 'Ksamil' }, { city: 'Tirana' })).toEqual(['hit']);
    });

    it('combines filters conjunctively', () => {
        const result = filterProperties(
            [
                villa({ id: 'both', beds: 5, hasPool: true }),
                villa({ id: 'bedsOnly', beds: 5, hasPool: false }),
                villa({ id: 'poolOnly', beds: 2, hasPool: true }),
            ],
            villaFilters({ beds: 4, hasPool: true }),
        );
        expect(result.map(p => p.id)).toEqual(['both']);
    });
});
