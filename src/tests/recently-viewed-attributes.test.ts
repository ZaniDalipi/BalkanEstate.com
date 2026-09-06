/**
 * The recently-viewed carousel reads its cards from localStorage, not from the
 * API. Its snapshot named the fields to keep by hand and had never heard of
 * offices, open-plan area or how a garage is arranged — so a shop the live
 * search showed with four offices came back from the carousel as
 * "0 Office / study · 0 Open-plan area", numbers nobody had entered.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TYPE_ATTRIBUTES } from '@/shared/property/typeAttributes';
import { useRecentlyViewed } from '@/src/hooks/useRecentlyViewed';
import type { Property } from '@/types';

const shop = {
    id: 'shop-1', title: 'A shop', price: 120000, imageUrl: 'https://x/y.jpg',
    city: 'Tirana', country: 'Albania', address: 'Rruga 1', sqft: 120,
    propertyType: 'commercial', listingType: 'sale', status: 'active',
    lat: 41.3, lng: 19.8, description: 'D', yearBuilt: 2020,
    seller: { type: 'private', name: 'Seller', phone: '' },
    offices: 4, openPlanArea: 102.5, toilets: 2, kitchens: 1, floorNumber: 1, totalFloors: 3,
} as unknown as Property;

const garage = {
    ...shop, id: 'garage-1', propertyType: 'parking',
    offices: undefined, openPlanArea: undefined,
    parking: 150, parkingType: 'underground',
} as unknown as Property;

describe('the recently-viewed snapshot keeps what the card has to show', () => {
    beforeEach(() => localStorage.clear());

    it('remembers a shop by its offices and open-plan area', () => {
        const { result } = renderHook(() => useRecentlyViewed());
        act(() => result.current.trackView(shop));

        const [stored] = result.current.recentlyViewed as unknown as Record<string, unknown>[];
        expect(stored.offices).toBe(4);
        expect(stored.openPlanArea).toBe(102.5);
        expect(stored.toilets).toBe(2);
    });

    it('remembers how a garage is arranged', () => {
        const { result } = renderHook(() => useRecentlyViewed());
        act(() => result.current.trackView(garage));

        const [stored] = result.current.recentlyViewed as unknown as Record<string, unknown>[];
        expect(stored.parking).toBe(150);
        expect(stored.parkingType).toBe('underground');
    });

    it('writes them into the stored payload, not just into memory', () => {
        // The carousel reads this back on the next page load, so what is
        // serialised is what matters — asserting on state alone would pass
        // even if the write dropped the fields again.
        const setItem = vi.mocked(localStorage.setItem);
        setItem.mockClear();

        const { result } = renderHook(() => useRecentlyViewed());
        act(() => result.current.trackView(shop));

        const lastWrite = setItem.mock.calls.at(-1);
        expect(lastWrite, 'nothing was written to storage').toBeTruthy();
        const [entry] = JSON.parse(String(lastWrite![1])) as Record<string, unknown>[];
        expect(entry.openPlanArea).toBe(102.5);
        expect(entry.offices).toBe(4);
    });

    it('keeps every attribute the type table can ask a card to show', () => {
        const everything = {
            ...shop,
            propertyType: 'other',
            ...Object.fromEntries(TYPE_ATTRIBUTES.map((a) => [a, a === 'parkingType' ? 'garage' : 7])),
        } as unknown as Property;

        const { result } = renderHook(() => useRecentlyViewed());
        act(() => result.current.trackView(everything));

        const [stored] = result.current.recentlyViewed as unknown as Record<string, unknown>[];
        for (const attribute of TYPE_ATTRIBUTES) {
            expect(stored[attribute], `${attribute} was not remembered`).toBeDefined();
        }
    });

    it('does not invent an attribute the listing never had', () => {
        const { result } = renderHook(() => useRecentlyViewed());
        act(() => result.current.trackView(garage));

        const [stored] = result.current.recentlyViewed as unknown as Record<string, unknown>[];
        expect('beds' in stored).toBe(false);
        expect('openPlanArea' in stored).toBe(false);
    });
});
