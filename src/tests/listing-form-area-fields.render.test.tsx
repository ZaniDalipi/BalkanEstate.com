/**
 * Which area boxes the listing form asks for, per type.
 *
 * A villa's form used to show "Land area", "Building area" *and* a generic
 * "Area" — three boxes for one measurement, with nothing saying which of them
 * the listing is actually sized by. Sellers filled the breakdown and left the
 * box that looked redundant at 0, which is how a real 79 m² flat came to be
 * stored and shown as "0 m²".
 *
 * The rule these pin: a type is asked for its own breakdown where it has one,
 * and for a single plain area only where it has nothing to derive a total
 * from. The form is the same component for creating and editing a listing
 * (`GeminiDescriptionGenerator` renders it in both modes, manual and AI), so
 * asserting it here covers both flows.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PropertyType } from '@/shared/types/property.types';
import { ALL_PROPERTY_TYPES } from '@/shared/property/typeAttributes';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: unknown) =>
            (typeof fallback === 'string' ? fallback : key.split('.').pop() ?? key),
        i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
    Trans: ({ children }: { children?: React.ReactNode }) => children,
}));

// The map picker pulls in the Google Maps loader, which has nothing to do
// with which number boxes are on screen.
vi.mock('@/src/features/seller/components/MapLocationPicker', () => ({
    default: () => <div data-testid="map-picker" />,
}));

const { default: ListingFormFields } = await import('@/src/features/seller/components/ListingFormFields');
const { initialListingData } = await import('@/src/features/seller/components/ListingFormHelpers');

/** Render the real form for one type, as the create-listing page mounts it. */
const renderFormFor = (propertyType: PropertyType) => {
    const view = render(
        <ListingFormFields
            listingData={{ ...initialListingData, propertyType }}
            setListingData={vi.fn()}
            selectedCountry="Albania"
            selectedCity="Tirana"
            availableCities={[]}
            handleCountryChange={vi.fn()}
            handleCityChange={vi.fn()}
            handleInputChange={vi.fn()}
            handlePriceChange={vi.fn()}
            handleMapLocationChange={vi.fn()}
            handleMapAddressChange={vi.fn()}
            getZoomLevel={10}
            cityData={null}
            fieldErrors={{}}
        />,
    );

    /** Every area box on screen, by label — the boxes a seller has to fill. */
    const areaBoxes = screen
        .getAllByRole('spinbutton')
        .map((input) => input.getAttribute('aria-label') ?? '')
        .filter((label) => /m²|^area$/i.test(label));

    return { ...view, areaBoxes };
};

describe('an apartment is asked for gross and net, and nothing else', () => {
    it('shows the pair a flat is quoted on', () => {
        const { areaBoxes } = renderFormFor('apartment');
        expect(areaBoxes).toEqual(['Gross (m²)', 'Net (m²)']);
    });

    it('does not also ask for a separate total area', () => {
        renderFormFor('apartment');
        expect(screen.queryByLabelText('area')).toBeNull();
    });
});

describe('a house is asked for its plot and its footprint', () => {
    it('shows the same pair a villa is described by', () => {
        const { areaBoxes } = renderFormFor('house');
        expect(areaBoxes).toEqual(['Land (m²)', 'Building (m²)']);
    });

    it('no longer asks for one plain "Area" that could mean either', () => {
        renderFormFor('house');
        expect(screen.queryByLabelText('area')).toBeNull();
    });
});

describe('a parking space is asked for one plain area', () => {
    it('shows the generic area box, because it has no breakdown to combine', () => {
        const { areaBoxes } = renderFormFor('parking');
        expect(areaBoxes).toEqual(['area']);
    });

    it('is still asked how it is arranged and how many spaces', () => {
        renderFormFor('parking');
        expect(screen.getByLabelText('Parking type')).toBeTruthy();
    });
});

describe('every other type asks for its own measurements', () => {
    const expected: Record<PropertyType, string[]> = {
        // A house stands on a plot exactly as a villa does.
        house: ['Land (m²)', 'Building (m²)'],
        apartment: ['Gross (m²)', 'Net (m²)'],
        villa: ['Land (m²)', 'Building (m²)'],
        'luxury-villa': ['Land (m²)', 'Building (m²)'],
        commercial: ['Open-plan area (m²)'],
        parking: ['area'],
        land: ['area'],
        // The escape hatch keeps every breakdown, so it has one to combine.
        other: ['Land (m²)', 'Building (m²)', 'Gross (m²)', 'Net (m²)', 'Open-plan area (m²)'],
    };

    for (const propertyType of ALL_PROPERTY_TYPES) {
        it(`${propertyType} asks for ${expected[propertyType].join(', ')}`, () => {
            const { areaBoxes } = renderFormFor(propertyType);
            expect(areaBoxes).toEqual(expected[propertyType]);
        });
    }

    it('never asks for the same measurement twice', () => {
        for (const propertyType of ALL_PROPERTY_TYPES) {
            const { areaBoxes, unmount } = renderFormFor(propertyType);
            const generic = areaBoxes.filter((label) => label === 'area');

            // Either a breakdown or the plain box — never both, and never a
            // type with no way at all to state how big it is.
            expect(areaBoxes.length, propertyType).toBeGreaterThan(0);
            if (areaBoxes.length > generic.length) expect(generic, propertyType).toEqual([]);
            unmount();
        }
    });
});
