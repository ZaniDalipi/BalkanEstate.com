/**
 * Listing form validation tests
 * Covers the required-field rules used when creating or editing a listing,
 * most importantly the "at least one photo" rule.
 */

import { describe, it, expect } from 'vitest';
import { validateListing, initialListingData, FIELD_ERROR_ORDER } from '../features/seller/components/ListingFormHelpers';

// Messages are irrelevant here - return the fallback so assertions stay readable
const t = (key: string, fallback?: string) => fallback ?? key;

const completeListing = {
    listingData: {
        ...initialListingData,
        title: 'Sunny apartment in the old town',
        description: 'A bright two bedroom apartment close to everything.',
        price: 120000,
        propertyType: 'apartment' as const,
        totalFloors: 5,
        floorNumber: 3,
        hasElevator: true,
        lat: 42.44,
        lng: 19.26,
    },
    imageCount: 3,
    selectedCountry: 'Montenegro',
    selectedCity: 'Podgorica',
};

describe('validateListing', () => {
    it('accepts a complete listing', () => {
        expect(validateListing(completeListing, t)).toEqual({});
    });

    it('rejects a listing without any photo', () => {
        const errors = validateListing({ ...completeListing, imageCount: 0 }, t);
        expect(errors.images).toBe('Please upload at least one image.');
    });

    it('accepts a listing with a single photo', () => {
        const errors = validateListing({ ...completeListing, imageCount: 1 }, t);
        expect(errors.images).toBeUndefined();
    });

    it('flags every missing required field at once', () => {
        const errors = validateListing({
            listingData: { ...initialListingData, propertyType: 'house' },
            imageCount: 0,
            selectedCountry: '',
            selectedCity: '',
        }, t);

        // Floors default to 1, so only the fields the user must fill in are flagged
        expect(Object.keys(errors).sort()).toEqual(
            ['city', 'country', 'description', 'images', 'price', 'title'].sort()
        );
    });

    it('requires a location on the map once a city is picked', () => {
        const errors = validateListing({
            ...completeListing,
            listingData: { ...completeListing.listingData, lat: 0, lng: 0 },
        }, t);
        expect(errors.city).toBe('Please set the property location on the map');
    });

    it('allows an empty price only when the listing is by negotiation', () => {
        const withoutPrice = { ...completeListing.listingData, price: 0 };
        expect(validateListing({ ...completeListing, listingData: withoutPrice }, t).price).toBeDefined();
        expect(validateListing({
            ...completeListing,
            listingData: { ...withoutPrice, isNegotiable: true },
        }, t).price).toBeUndefined();
    });

    it('skips floor rules for land', () => {
        const errors = validateListing({
            ...completeListing,
            listingData: {
                ...completeListing.listingData,
                propertyType: 'land',
                totalFloors: 0,
                floorNumber: 0,
                hasElevator: undefined,
            },
        }, t);
        expect(errors).toEqual({});
    });

    it('requires floors and elevator info for apartments', () => {
        const errors = validateListing({
            ...completeListing,
            listingData: {
                ...completeListing.listingData,
                totalFloors: 0,
                floorNumber: 0,
                hasElevator: undefined,
            },
        }, t);
        expect(errors.totalFloors).toBeDefined();
        expect(errors.floorNumber).toBeDefined();
        expect(errors.hasElevator).toBeDefined();
    });

    it('rejects a floor above the building height', () => {
        const errors = validateListing({
            ...completeListing,
            listingData: { ...completeListing.listingData, totalFloors: 2, floorNumber: 5 },
        }, t);
        expect(errors.floorNumber).toBe('Floor number cannot exceed the total number of floors.');
    });

    it('can order every reported field for the error summary', () => {
        const errors = validateListing({
            listingData: { ...initialListingData, propertyType: 'apartment' },
            imageCount: 0,
            selectedCountry: '',
            selectedCity: '',
        }, t);
        const ordered = FIELD_ERROR_ORDER.filter(field => errors[field]);
        expect(ordered.length).toBe(Object.keys(errors).length);
    });
});
