/**
 * What the listing form submits as a listing's total area.
 *
 * The form asks a type with its own breakdown (an apartment's gross and net,
 * a villa's plot and build, a shop's open-plan floor) for that breakdown, and
 * hides the generic "Area" box — so for those types `sq_meters` holds only
 * what was loaded into state behind the seller's back: the stored `sqft` when
 * editing, or the AI's guess when generating from photos. These pin that the
 * fields a seller can actually see are the ones the listing is sized by.
 */

import { describe, it, expect, vi } from 'vitest';
import type { ListingData } from '@/src/features/seller/components/ListingFormHelpers';

vi.mock('@/services/geminiService', () => ({
    generateDescriptionFromImages: vi.fn(),
    calculatePropertyDistances: vi.fn(),
}));
vi.mock('@/context/AppContext', () => ({ useAppContext: vi.fn() }));
vi.mock('@/context/AlertContext', () => ({ useAlert: vi.fn() }));
vi.mock('@/services/apiService', () => ({}));
vi.mock('browser-image-compression', () => ({ default: vi.fn() }));

const { buildPreviewProperty } = await import('@/src/features/seller/components/useListingForm');
const { initialListingData } = await import('@/src/features/seller/components/ListingFormHelpers');

const blankImage = { file: null, previewUrl: '' } as never;

/** Run form state through the real preview builder and read the area off it. */
const submittedArea = (overrides: Partial<ListingData>): number =>
    buildPreviewProperty(
        { ...initialListingData, ...overrides } as ListingData,
        [],
        blankImage,
        'Albania',
        'Tirana',
        'private_seller' as never,
        { id: 'u1', name: 'Seller' },
        null,
    ).sqft;

describe('a type that shows its own breakdown is sized by that breakdown', () => {
    it("takes an apartment's gross area, not the total-area box it never saw", () => {
        expect(submittedArea({ propertyType: 'apartment', grossArea: 79, netArea: 70 })).toBe(79);
    });

    it('lets a corrected gross area win over the stale total loaded for editing', () => {
        // The edit path fills sq_meters from the stored sqft. The seller
        // fixes the gross area to 85 and never sees that box — saving 79
        // again would silently discard the correction.
        expect(submittedArea({
            propertyType: 'apartment', sq_meters: 79, grossArea: 85, netArea: 74,
        })).toBe(85);
    });

    it("takes a villa's whole plot over its building area and over a stale total", () => {
        expect(submittedArea({
            propertyType: 'luxury-villa', sq_meters: 9999, landArea: 1500, buildingArea: 500,
        })).toBe(1500);
    });

    it("takes a shop's open-plan floor", () => {
        expect(submittedArea({ propertyType: 'commercial', sq_meters: 999, openPlanArea: 102.5 })).toBe(102.5);
    });

    it('falls back to net when only net was filled in', () => {
        expect(submittedArea({ propertyType: 'apartment', netArea: 70 })).toBe(70);
    });

    it("takes a house's whole plot over its building area", () => {
        expect(submittedArea({ propertyType: 'house', landArea: 600, buildingArea: 140 })).toBe(600);
    });
});

describe('a listing that predates its breakdown keeps the area it has', () => {
    // The edit path loads sq_meters from the stored sqft and the breakdown
    // fields as 0. A listing first published before gross/net (or land/
    // building) were asked for therefore arrives with a real total and an
    // empty breakdown — and must not be saved back as 0 m², which is the
    // very fault this whole change set exists to fix.
    it('keeps an apartment that only ever had a total', () => {
        expect(submittedArea({ propertyType: 'apartment', sq_meters: 79 })).toBe(79);
    });

    it('keeps a villa that only ever had a total', () => {
        expect(submittedArea({ propertyType: 'villa', sq_meters: 220 })).toBe(220);
    });

    it('keeps a house that only ever had a total', () => {
        expect(submittedArea({ propertyType: 'house', sq_meters: 150 })).toBe(150);
    });

    it('still prefers the breakdown the moment the seller fills one in', () => {
        expect(submittedArea({ propertyType: 'house', sq_meters: 150, landArea: 600 })).toBe(600);
    });
});

describe('a type with no breakdown is sized by the plain area box', () => {
    it('takes what a parking space was asked for', () => {
        expect(submittedArea({ propertyType: 'parking', sq_meters: 18 })).toBe(18);
    });

    it('takes what a house and a plot of land were asked for', () => {
        expect(submittedArea({ propertyType: 'house', sq_meters: 120 })).toBe(120);
        expect(submittedArea({ propertyType: 'land', sq_meters: 400 })).toBe(400);
    });

    it('stays 0 when a seller genuinely gave no measurement', () => {
        expect(submittedArea({ propertyType: 'parking' })).toBe(0);
    });
});
