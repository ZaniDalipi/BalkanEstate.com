import { describe, it, expect } from 'vitest';
import type { Property } from '@/types';
import {
    getStreetLine,
    getLocalityLine,
    getFullPropertyName,
    getFactsLine,
    getHomeTypeLabel,
    getListingStatusLabel,
    type Translate,
} from '@/shared/utils/propertyNaming';

/** Stand-in for i18next: always returns the inline English default. */
const t: Translate = (key, defaultValue, options) => {
    let out = defaultValue ?? key;
    if (options) {
        for (const [k, v] of Object.entries(options)) {
            out = out.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        }
    }
    return out;
};

const villa = (overrides: Partial<Property> = {}): Property => ({
    id: 'v1',
    sellerId: 's1',
    listingType: 'rent',
    status: 'active',
    price: 1200,
    address: 'Rruga e Kavajës 42',
    city: 'Tirana',
    country: 'Albania',
    beds: 4,
    baths: 3,
    livingRooms: 1,
    sqft: 420,
    yearBuilt: 2019,
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
    ...overrides,
} as Property);

describe('Zillow-style property naming', () => {
    it('names a listing by its street address', () => {
        expect(getStreetLine(villa(), t)).toBe('Rruga e Kavajës 42');
        expect(getLocalityLine(villa())).toBe('Tirana, Albania');
        expect(getFullPropertyName(villa(), t)).toBe('Rruga e Kavajës 42, Tirana, Albania');
    });

    it('prefers the address over a seller-written title', () => {
        expect(getStreetLine(villa({ title: 'Sunset Dream Estate' }), t)).toBe('Rruga e Kavajës 42');
    });

    it('falls back to the title when there is no street address', () => {
        expect(getStreetLine(villa({ address: '', title: 'Sunset Dream Estate' }), t))
            .toBe('Sunset Dream Estate');
    });

    it('rejects an address that only repeats the locality', () => {
        // Imported listings routinely put the city or "City, Country" in
        // `address`, which would head the card with the line beneath it.
        expect(getStreetLine(villa({ address: 'Tirana' }), t)).toBe('Luxury Villa in Tirana');
        expect(getStreetLine(villa({ address: 'Tirana, Albania' }), t)).toBe('Luxury Villa in Tirana');
        expect(getStreetLine(villa({ address: 'Albania' }), t)).toBe('Luxury Villa in Tirana');
        expect(getStreetLine(villa({ address: '  1234  ' }), t)).toBe('Luxury Villa in Tirana');
    });

    it('never repeats the locality in the full name', () => {
        const p = villa({ address: '', title: '' });
        expect(getFullPropertyName(p, t)).toBe('Luxury Villa in Tirana, Albania');
    });

    it('builds the abbreviated facts line', () => {
        expect(getFactsLine(villa(), t)).toBe('4 bds · 3 ba · 420 m² · Luxury Villa · For Rent');
    });

    it('drops missing counts rather than printing zeroes', () => {
        expect(getFactsLine(villa({ beds: 0, baths: 0, sqft: 0 }), t, { includeStatus: false }))
            .toBe('Luxury Villa');
    });

    it('omits the status when the surface already shows a badge', () => {
        expect(getFactsLine(villa(), t, { includeStatus: false }))
            .toBe('4 bds · 3 ba · 420 m² · Luxury Villa');
    });

    it('lets sold and rented win over the market', () => {
        expect(getListingStatusLabel(villa({ listingType: 'sale' }), t)).toBe('For Sale');
        expect(getListingStatusLabel(villa({ listingType: 'sale', status: 'sold' }), t)).toBe('Sold');
        expect(getListingStatusLabel(villa({ status: 'rented' }), t)).toBe('Rented');
        expect(getListingStatusLabel(villa({ status: 'pending' }), t)).toBe('Pending');
    });

    it('uses the home-type vocabulary for each property type', () => {
        expect(getHomeTypeLabel(villa({ propertyType: 'house' }), t)).toBe('House');
        expect(getHomeTypeLabel(villa({ propertyType: 'apartment' }), t)).toBe('Apartment');
        expect(getHomeTypeLabel(villa({ propertyType: 'land' }), t)).toBe('Lot / Land');
        expect(getHomeTypeLabel(villa(), t)).toBe('Luxury Villa');
    });
});
