/**
 * What a listing's detail page says about it, per type.
 *
 * The page reads the type table rather than assuming every listing is a home,
 * so these assert the outcome that matters to a seller: what they typed into
 * the form appears, and what their type was never asked about does not.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Property } from '@/types';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: unknown) =>
            (typeof fallback === 'string' ? fallback : key.split('.').pop() ?? key),
        i18n: { language: 'en', changeLanguage: vi.fn() },
    }),
    Trans: ({ children }: { children?: React.ReactNode }) => children,
}));

const appContext = {
    state: {
        currentUser: null,
        properties: [],
        searchPageState: { filters: {}, query: '' },
    },
    dispatch: vi.fn(),
};
vi.mock('@/context/AppContext', () => ({ useAppContext: () => appContext }));

const { PropertyInfo } = await import('@/src/components/property/PropertyInfo');

const listing = (overrides: Partial<Property>): Property => ({
    id: 'p1', sellerId: 's1', status: 'active', title: 'A listing',
    price: 100000, address: 'Rruga 1', city: 'Tirana', country: 'Albania',
    sqft: 120, yearBuilt: 2020, description: 'Description',
    specialFeatures: [], materials: [], amenities: [], images: [],
    imageUrl: 'https://example.com/a.jpg', lat: 41.3, lng: 19.8,
    seller: { type: 'private', name: 'Seller', phone: '' },
    propertyType: 'house', listingType: 'sale',
    createdAt: Date.now(), lastRenewed: Date.now(), views: 0, saves: 0, inquiries: 0,
    ...overrides,
} as Property);

describe('a shop is described by its working space', () => {
    it('shows the open-plan area the seller entered', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'commercial', offices: 4, openPlanArea: 102.5, toilets: 2 })} />);

        expect(screen.getByText('102.5 m²')).toBeTruthy();
        expect(screen.getAllByText('Open-plan area').length).toBeGreaterThan(0);
    });

    it('shows a whole-number open-plan area too', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'commercial', offices: 2, openPlanArea: 80 })} />);
        expect(screen.getByText('80 m²')).toBeTruthy();
    });

    it('never describes it by bedrooms or living rooms', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'commercial', offices: 4, openPlanArea: 60 })} />);

        expect(screen.queryByText('Bedrooms')).toBeNull();
        expect(screen.queryByText('Living rooms')).toBeNull();
    });
});

describe('a garage is described by its spaces and arrangement', () => {
    it('shows how it is arranged', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'parking', parking: 2, parkingType: 'underground' })} />);

        expect(screen.getAllByText('Underground').length).toBeGreaterThan(0);
        expect(screen.getByText('2')).toBeTruthy();
    });

    it('never describes it by bedrooms, bathrooms or living rooms', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'parking', parking: 1, parkingType: 'garage' })} />);

        expect(screen.queryByText('Bedrooms')).toBeNull();
        expect(screen.queryByText('Bathrooms')).toBeNull();
        expect(screen.queryByText('Living rooms')).toBeNull();
    });
});

describe('a home is still described by its rooms', () => {
    it('shows bedrooms, bathrooms and the rooms behind them', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'house', beds: 3, baths: 2, livingRooms: 1, kitchens: 1, toilets: 2 })} />);

        expect(screen.getAllByText('Bedrooms').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Bathrooms').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Kitchens').length).toBeGreaterThan(0);
    });

    it('never offers a shop\'s open-plan area', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'house', beds: 3, baths: 2 })} />);
        expect(screen.queryByText('Open-plan area')).toBeNull();
    });
});

/**
 * A blank the seller never filled in is not a zero. Printing it as one put
 * numbers on the page nobody entered — "Parking type 0" on a garage whose
 * arrangement was never recorded, "Open-plan area 0" on a shop that has none.
 */
describe('a field the seller left blank is left out, not shown as 0', () => {
    it('says nothing about an open-plan area that was never given', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'commercial', offices: 3 })} />);

        expect(screen.queryByText('Open-plan area')).toBeNull();
        expect(screen.queryByText('0 m²')).toBeNull();
    });

    it('says nothing about a parking arrangement that was never recorded', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'parking', parking: 150 })} />);

        expect(screen.queryByText('Parking type')).toBeNull();
        expect(screen.getByText('150')).toBeTruthy();
    });

    it('still shows a ground floor, which is a fact rather than a blank', () => {
        render(<PropertyInfo onOpenFloorPlan={vi.fn()} property={listing({ propertyType: 'apartment', beds: 1, baths: 1, floorNumber: 0 })} />);

        expect(screen.getAllByText('Floor').length).toBeGreaterThan(0);
    });
});
