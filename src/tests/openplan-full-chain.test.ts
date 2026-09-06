/**
 * The whole journey of one field, in one test.
 *
 * Open-plan area kept coming back as 0 on a shop that had one, and every
 * individual link checked out on its own. This walks the value through all of
 * them in order — form state, the client's write transform, the server's
 * write allow-list, the Mongoose document, the response sanitizer, the
 * client's read transform, and what the page finally decides to show — so a
 * break anywhere names the step it happened at instead of the symptom.
 */

import { describe, it, expect } from 'vitest';
import { stripAttributesForType, attributeEntries, statsForType } from '@/shared/property/typeAttributes';
import { transformBackendProperty, transformToBackendProperty } from '@/src/features/properties/api/propertyApi';
import { ALLOWED_PROPERTY_FIELDS } from '@/backend/src/controllers/propertyController';
import { normalizeTypeAttributes } from '@/backend/src/config/typeAttributes';
import { sanitizeProperty } from '@/backend/src/utils/responseSanitizer';
import type { Property } from '@/types';

/** What the seller typed into the commercial form. */
const formState = {
    propertyType: 'commercial' as const,
    offices: 4,
    openPlanArea: 102.5,
    toilets: 2,
    kitchens: 1,
    storageRooms: 1,
    floorNumber: 2,
    totalFloors: 5,
    // Attributes commercial does not carry, still sitting in form state.
    beds: 3,
    baths: 2,
    livingRooms: 1,
    parking: 9,
};

const commonFields = {
    id: 'listing-1', sellerId: 'seller-1', status: 'active' as const,
    title: 'A shop', price: 120000, address: 'Rruga 1', city: 'Tirana', country: 'Albania',
    sqft: 220, yearBuilt: 2020, description: 'D', imageUrl: 'https://x/y.jpg',
    images: [], specialFeatures: [], materials: [], amenities: [],
    lat: 41.3, lng: 19.8, listingType: 'sale' as const,
    seller: { type: 'private' as const, name: 'S', phone: '' },
    createdAt: Date.now(), lastRenewed: Date.now(), views: 0, saves: 0, inquiries: 0,
};

describe('an open-plan area survives every step between the form and the page', () => {
    // 1. The form strips what this type does not carry.
    const submitted = stripAttributesForType(formState.propertyType, { ...commonFields, ...formState });

    it('1. the form keeps it and drops the bedrooms a shop has no use for', () => {
        expect(submitted.openPlanArea).toBe(102.5);
        expect(submitted.beds).toBeUndefined();
    });

    // 2. The client's write transform builds the request body.
    const requestBody = transformToBackendProperty(submitted as unknown as Property);

    it('2. the request body carries it', () => {
        expect(requestBody.openPlanArea).toBe(102.5);
    });

    // 3. The server's allow-list decides what may be written.
    const sanitizedBody: Record<string, unknown> = {};
    for (const field of ALLOWED_PROPERTY_FIELDS) {
        if (requestBody[field] !== undefined) sanitizedBody[field] = requestBody[field];
    }

    it('3. the write allow-list admits it', () => {
        expect(sanitizedBody.openPlanArea).toBe(102.5);
    });

    // 4. The schema hook normalises the type attributes before saving.
    const normalized = normalizeTypeAttributes(sanitizedBody.propertyType, sanitizedBody);

    it('4. the schema accepts a fractional area and stores it', () => {
        expect(normalized.ok).toBe(true);
        expect(normalized.fields.openPlanArea).toBe(102.5);
    });

    // 5. The stored document goes back out through the response sanitizer.
    const stored = { ...sanitizedBody, ...normalized.fields, _id: '507f1f77bcf86cd799439011' };
    const response = sanitizeProperty({ ...stored }, 'detail');

    it('5. the response sanitizer does not strip it', () => {
        expect(response.openPlanArea).toBe(102.5);
    });

    // 6. The client's read transform turns it back into a Property.
    const received = transformBackendProperty({ ...response, createdAt: Date.now(), lastRenewed: Date.now() });

    it('6. the read transform carries it back', () => {
        expect(received.openPlanArea).toBe(102.5);
    });

    // 7. The page decides what to show.
    it('7. the page shows it, in the row a shop leads with', () => {
        const headline = attributeEntries(
            received as unknown as Record<string, unknown>,
            statsForType(received.propertyType).filter((s) => s !== 'sqft') as never,
        );

        expect(headline).toEqual([
            { attribute: 'offices', value: 4 },
            { attribute: 'openPlanArea', value: 102.5 },
        ]);
    });

    it('7b. and lists the rest of what the shop carries below it', () => {
        const shown = attributeEntries(received as unknown as Record<string, unknown>).map((e) => e.attribute);

        expect(shown).toContain('openPlanArea');
        expect(shown).toContain('toilets');
        expect(shown).not.toContain('beds');
    });
});
