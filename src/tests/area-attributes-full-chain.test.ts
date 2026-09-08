/**
 * Land / building and gross / net areas, walked through every step.
 *
 * Modelled on `openplan-full-chain.test.ts`, for the same reason: an area is
 * collected by the form, filtered by two type tables, admitted by a write
 * allow-list, normalised, stored, sanitized on the way out and transformed
 * back before a page ever sees it. Any one of those links dropping the value
 * shows up as "the number I typed came back as 0", so the chain is asserted
 * step by step and a break names where it happened.
 *
 * Both pairs are measured, not counted: 101.5 m² is a real plot, and a villa's
 * land runs well past the count bound the room fields share.
 */

import { describe, it, expect } from 'vitest';
import {
    stripAttributesForType,
    attributeEntries,
    attributesForType,
    MEASURED_ATTRIBUTES,
} from '@/shared/property/typeAttributes';
import { validateTypeAttributes, MAX_ATTRIBUTE_AREA } from '@/shared/utils/validation';
import { transformBackendProperty, transformToBackendProperty } from '@/src/features/properties/api/propertyApi';
import { ALLOWED_PROPERTY_FIELDS } from '@/backend/src/controllers/propertyController';
import { normalizeTypeAttributes } from '@/backend/src/config/typeAttributes';
import { sanitizeProperty } from '@/backend/src/utils/responseSanitizer';
import type { Property } from '@/types';

const commonFields = {
    id: 'listing-1', sellerId: 'seller-1', status: 'active' as const,
    title: 'A place', price: 250000, address: 'Rruga 1', city: 'Tirana', country: 'Albania',
    sqft: 220, yearBuilt: 2020, description: 'D', imageUrl: 'https://x/y.jpg',
    images: [], specialFeatures: [], materials: [], amenities: [],
    lat: 41.3, lng: 19.8, listingType: 'sale' as const,
    seller: { type: 'private' as const, name: 'S', phone: '' },
    createdAt: Date.now(), lastRenewed: Date.now(), views: 0, saves: 0, inquiries: 0,
};

/** Run one listing through form → API → database → API → page. */
const walkTheChain = (formState: Record<string, unknown>) => {
    const submitted = stripAttributesForType(formState.propertyType, { ...commonFields, ...formState });
    const requestBody = transformToBackendProperty(submitted as unknown as Property);

    const sanitizedBody: Record<string, unknown> = {};
    for (const field of ALLOWED_PROPERTY_FIELDS) {
        if (requestBody[field] !== undefined) sanitizedBody[field] = requestBody[field];
    }

    const normalized = normalizeTypeAttributes(sanitizedBody.propertyType, sanitizedBody);
    const stored = { ...sanitizedBody, ...normalized.fields, _id: '507f1f77bcf86cd799439011' };
    const response = sanitizeProperty({ ...stored }, 'detail');
    const received = transformBackendProperty({ ...response, createdAt: Date.now(), lastRenewed: Date.now() });

    return { submitted, requestBody, sanitizedBody, normalized, response, received };
};

describe("a villa's land and building areas survive the round trip", () => {
    const chain = walkTheChain({
        propertyType: 'luxury-villa' as const,
        landArea: 5550.5,
        buildingArea: 516,
        beds: 4, baths: 3,
        // A villa does not carry these; they are still sitting in form state.
        openPlanArea: 80, parkingType: 'garage',
    });

    it('1. the form keeps both areas and drops what a villa has no use for', () => {
        expect(chain.submitted.landArea).toBe(5550.5);
        expect(chain.submitted.buildingArea).toBe(516);
        expect(chain.submitted.openPlanArea).toBeUndefined();
    });

    it('2. the request body carries them', () => {
        expect(chain.requestBody.landArea).toBe(5550.5);
        expect(chain.requestBody.buildingArea).toBe(516);
    });

    it('3. the write allow-list admits them', () => {
        expect(chain.sanitizedBody.landArea).toBe(5550.5);
        expect(chain.sanitizedBody.buildingArea).toBe(516);
    });

    it('4. the schema accepts a plot far larger than any room count', () => {
        expect(chain.normalized.ok).toBe(true);
        expect(chain.normalized.fields.landArea).toBe(5550.5);
        expect(chain.normalized.fields.buildingArea).toBe(516);
    });

    it('5. the response sanitizer does not strip them', () => {
        expect(chain.response.landArea).toBe(5550.5);
        expect(chain.response.buildingArea).toBe(516);
    });

    it('6. the read transform carries them back', () => {
        expect(chain.received.landArea).toBe(5550.5);
        expect(chain.received.buildingArea).toBe(516);
    });

    it('7. the page lists them, land before building, before the room counts', () => {
        const shown = attributeEntries(chain.received as unknown as Record<string, unknown>);

        expect(shown.slice(0, 2)).toEqual([
            { attribute: 'landArea', value: 5550.5 },
            { attribute: 'buildingArea', value: 516 },
        ]);
        expect(shown.map((e) => e.attribute)).toContain('beds');
    });
});

describe("an apartment's gross and net areas survive the round trip", () => {
    const chain = walkTheChain({
        propertyType: 'apartment' as const,
        grossArea: 101.5,
        netArea: 87.25,
        beds: 2, baths: 1, floorNumber: 3,
        // An apartment is not described by a plot.
        landArea: 400,
    });

    it('keeps the pair a flat is quoted on and drops the plot', () => {
        expect(chain.submitted.grossArea).toBe(101.5);
        expect(chain.submitted.netArea).toBe(87.25);
        expect(chain.submitted.landArea).toBeUndefined();
    });

    it('stores both, to the fraction', () => {
        expect(chain.normalized.ok).toBe(true);
        expect(chain.normalized.fields.grossArea).toBe(101.5);
        expect(chain.normalized.fields.netArea).toBe(87.25);
    });

    it('comes back out and reaches the page', () => {
        expect(chain.received.grossArea).toBe(101.5);
        expect(chain.received.netArea).toBe(87.25);

        const shown = attributeEntries(chain.received as unknown as Record<string, unknown>);
        expect(shown.slice(0, 2)).toEqual([
            { attribute: 'grossArea', value: 101.5 },
            { attribute: 'netArea', value: 87.25 },
        ]);
    });
});

describe('the two tables and the two validators agree about areas', () => {
    it('the client and the server give a villa and a flat the same areas', () => {
        // Imported under an alias so the two copies of the table are compared,
        // not one copy with itself.
        const serverFor = (type: string) =>
            Object.keys(normalizeTypeAttributes(type, {
                landArea: 1, buildingArea: 1, grossArea: 1, netArea: 1, openPlanArea: 1,
            }).fields).sort();

        for (const type of ['villa', 'luxury-villa', 'apartment', 'commercial', 'land']) {
            const client = attributesForType(type)
                .filter((a) => MEASURED_ATTRIBUTES.has(a))
                .slice()
                .sort();
            expect(serverFor(type), type).toEqual(client);
        }
    });

    it('rejects a negative area and one past the bound, on both sides', () => {
        expect(validateTypeAttributes('villa', { landArea: -1 }).isValid).toBe(false);
        expect(normalizeTypeAttributes('villa', { landArea: -1 }).ok).toBe(false);

        const tooBig = MAX_ATTRIBUTE_AREA + 1;
        expect(validateTypeAttributes('villa', { landArea: tooBig }).isValid).toBe(false);
        expect(normalizeTypeAttributes('villa', { landArea: tooBig }).ok).toBe(false);
    });

    it('accepts a plot that would be an absurd room count', () => {
        // 5550 m² of land is ordinary; 5550 bedrooms is a typo. Before areas had
        // their own bound this was rejected as "must be between 0 and 999".
        expect(validateTypeAttributes('villa', { landArea: 5550.5 }).isValid).toBe(true);
        expect(normalizeTypeAttributes('villa', { landArea: 5550.5 }).ok).toBe(true);
        expect(validateTypeAttributes('villa', { beds: 5550 }).isValid).toBe(false);
    });
});
