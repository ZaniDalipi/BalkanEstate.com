import { describe, it, expect } from 'vitest';
import { TYPE_ATTRIBUTES, attributesForType, copyTypeAttributes } from '@/shared/property/typeAttributes';
import { validateTypeAttributes } from '@/shared/utils/validation';
import {
    ATTRIBUTE_FIELDS,
    FIELD_ERROR_ORDER,
    initialListingData,
    orderedErrorFields,
    validateListing,
} from '@/src/features/seller/components/ListingFormHelpers';

const t = (_key: string, fallback?: string) => fallback ?? _key;

const submittable = (overrides: Record<string, unknown>) => ({
    listingData: { ...initialListingData, title: 'T', description: 'D', price: 1000, lat: 41.3, lng: 19.8, ...overrides } as never,
    imageCount: 1,
    selectedCountry: 'Albania',
    selectedCity: 'Tirana',
});

/**
 * Every transform between the form and the database used to name the
 * attributes by hand, and each list had lost a different one — a shop's
 * open-plan area and a garage's parking type were collected from the seller
 * and dropped before the write, so the card showed zeroes nobody had entered.
 */
describe('type attributes survive the trip to the API', () => {
    it('carries every attribute the table names', () => {
        const source = Object.fromEntries(TYPE_ATTRIBUTES.map((a, i) => [a, a === 'parkingType' ? 'garage' : i + 1]));
        expect(Object.keys(copyTypeAttributes(source)).sort()).toEqual([...TYPE_ATTRIBUTES].sort());
    });

    it('leaves an attribute the listing does not carry absent, not undefined', () => {
        const copied = copyTypeAttributes({ beds: 2 });
        expect(copied).toEqual({ beds: 2 });
        expect('baths' in copied).toBe(false);
    });

    it('survives a null or missing source', () => {
        expect(copyTypeAttributes(null)).toEqual({});
        expect(copyTypeAttributes(undefined)).toEqual({});
    });

    it("keeps a ground floor's zero rather than dropping it", () => {
        expect(copyTypeAttributes({ floorNumber: 0 })).toEqual({ floorNumber: 0 });
    });
});

/**
 * A rejected attribute used to be reported against `propertyType`, a key the
 * summary list did not contain and no input renders — so submitting a parking
 * space raised "Please fix the errors before submitting" over an empty dialog
 * with nothing on the form marked.
 */
describe('a rejected attribute names a field the seller can fix', () => {
    it('accepts a parking space filled in from the defaults', () => {
        expect(validateListing(submittable({ propertyType: 'parking' }), t)).toEqual({});
    });

    it('reports a bad parking count against the spaces input', () => {
        const errors = validateListing(submittable({ propertyType: 'parking', parking_spots: -1 }), t);
        expect(Object.keys(errors)).toEqual(['parking_spots']);
    });

    it('reports a bad parking type against the parking type input', () => {
        const errors = validateListing(submittable({ propertyType: 'parking', parkingType: 'helipad' }), t);
        expect(Object.keys(errors)).toEqual(['parkingType']);
    });

    it('reports a bad office count against the offices input', () => {
        const errors = validateListing(submittable({ propertyType: 'commercial', offices: 1.5, floorNumber: 1, totalFloors: 1 }), t);
        expect(Object.keys(errors)).toEqual(['offices']);
    });

    it('maps every attribute to an input the summary lists', () => {
        for (const attribute of TYPE_ATTRIBUTES) {
            const field = ATTRIBUTE_FIELDS[attribute];
            expect(field, `${attribute} has no form field`).toBeTruthy();
            expect(FIELD_ERROR_ORDER, `${field} missing from the summary order`).toContain(field);
        }
    });

    it('never drops an error from the summary, whatever it is keyed on', () => {
        expect(orderedErrorFields({ price: 'p', somethingNobodyListed: 'x' })).toEqual(['price', 'somethingNobodyListed']);
    });
});

/** An area is measured, not counted: an open-plan floor really can be 102.5 m². */
describe('areas may be fractional, counts may not', () => {
    it('accepts a fractional open-plan area', () => {
        expect(validateTypeAttributes('commercial', { openPlanArea: 102.5 }).isValid).toBe(true);
        expect(validateListing(submittable({ propertyType: 'commercial', openPlanArea: 102.5, floorNumber: 1, totalFloors: 1 }), t)).toEqual({});
    });

    it('still refuses half an office', () => {
        const result = validateTypeAttributes('commercial', { offices: 1.5 });
        expect(result.isValid).toBe(false);
        expect(result.attribute).toBe('offices');
    });

    it('refuses a negative or absurd area', () => {
        expect(validateTypeAttributes('commercial', { openPlanArea: -1 }).isValid).toBe(false);
        expect(validateTypeAttributes('commercial', { openPlanArea: 100000 }).isValid).toBe(false);
    });

    it('checks only the attributes the type is described by', () => {
        // A bedroom count on a garage is dropped by the write path, not rejected.
        expect(validateTypeAttributes('parking', { beds: -5 }).isValid).toBe(true);
        expect(attributesForType('parking')).not.toContain('beds');
    });
});
