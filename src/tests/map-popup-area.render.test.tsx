/**
 * The size a map popup shows.
 *
 * The popups are handed whatever row the map loaded, which does not always
 * come through an API transform — so they cannot trust `property.sqft` the
 * way a page that fetched through `transformBackendProperty` can. A flat
 * quoted "98 m² gross, 77 m² net" with no stated total was reaching the
 * popup as the raw row and printing the `0` the field holds, on a card whose
 * detail page said 98 m².
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Property } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const { default: GoogleMapPropertyPopup } = await import(
  '@/src/features/map/components/GoogleMapPropertyPopup'
);

/** A row exactly as the API sends it: a breakdown, and a total nobody filled in. */
const rawRow = (overrides: Partial<Property>) => ({
  id: 'p1',
  title: 'Shitet apartament 2+1',
  address: 'Rruga 1',
  city: 'Tirana',
  country: 'Albania',
  price: 161700,
  beds: 1,
  baths: 1,
  sqft: 0,
  propertyType: 'apartment',
  listingType: 'sale',
  lat: 41.3,
  lng: 19.8,
  images: [],
  ...overrides,
}) as unknown as Property;

const renderPopup = (property: Property) =>
  render(
    <GoogleMapPropertyPopup property={property} onClose={() => {}} onViewDetails={() => {}} />,
  );

describe('a flat quoted only in gross and net', () => {
    it('shows its gross area, not the 0 the raw row carries', () => {
        renderPopup(rawRow({ grossArea: 98, netArea: 77 } as Partial<Property>));

        expect(screen.getByText(/98/)).toBeTruthy();
        expect(screen.queryByText(/📐 0$/)).toBeNull();
    });

    it('falls back to net when that is all there is', () => {
        renderPopup(rawRow({ netArea: 77 } as Partial<Property>));
        expect(screen.getByText(/77/)).toBeTruthy();
    });
});

describe('a listing with no size anywhere', () => {
    it('shows no area chip at all rather than "0"', () => {
        const { container } = renderPopup(rawRow({}));

        expect(container.textContent).not.toMatch(/📐/);
    });

    it('drops the chip on a plot too, where the area is the only stat', () => {
        const { container } = renderPopup(rawRow({ propertyType: 'land' } as Partial<Property>));

        expect(container.textContent).not.toMatch(/📐/);
    });
});

describe('a listing that states its own total', () => {
    it('still shows it', () => {
        renderPopup(rawRow({ sqft: 120 } as Partial<Property>));
        expect(screen.getByText(/120/)).toBeTruthy();
    });
});
