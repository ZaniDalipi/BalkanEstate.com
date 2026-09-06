/**
 * A card with no seller photo used to render a flat user glyph, so every
 * seller looked like the same anonymous account. It now renders the seller's
 * own generated character — which only works if the fields that describe that
 * character survive the trip from the API, and if the id seeding it survives a
 * round trip through the recently-viewed snapshot.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { transformBackendProperty } from '@/src/features/properties/api/propertyApi';
import { useRecentlyViewed } from '@/src/hooks/useRecentlyViewed';
import type { Property } from '@/types';

const avatarOptions = JSON.stringify({ skinColor: 'edb98a', top: 'bob' });

const backendProperty = {
    id: 'prop-1',
    title: 'Villa',
    price: 700000,
    city: 'Palasë',
    country: 'Albania',
    createdAsRole: 'private_seller',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastRenewed: '2026-01-01T00:00:00.000Z',
    sellerId: {
        id: 'seller-1',
        name: 'Kamelahoxhallari85',
        phone: '',
        avatarOptions,
        gender: 'female',
    },
};

describe('the seller avatar survives the trip to the card', () => {
    it('carries the seller\'s saved character off the API payload', () => {
        const property = transformBackendProperty(backendProperty);

        expect(property.seller.avatarOptions).toBe(avatarOptions);
        expect(property.seller.gender).toBe('female');
        expect(property.sellerId).toBe('seller-1');
    });

    it('leaves the fields undefined when the API sends no seller', () => {
        const property = transformBackendProperty({ ...backendProperty, sellerId: undefined });

        expect(property.seller.avatarOptions).toBeUndefined();
        expect(property.seller.gender).toBeUndefined();
    });
});

describe('the recently-viewed snapshot keeps the seller identifiable', () => {
    beforeEach(() => localStorage.clear());

    const viewed = transformBackendProperty(backendProperty) as Property;

    it('remembers the id that seeds the generated face', () => {
        const { result } = renderHook(() => useRecentlyViewed());
        act(() => result.current.trackView(viewed));

        const [stored] = result.current.recentlyViewed;
        expect(stored.sellerId).toBe('seller-1');
        expect(stored.seller.avatarOptions).toBe(avatarOptions);
    });

    it('keeps the id when a thinner re-track arrives without one', () => {
        const { result } = renderHook(() => useRecentlyViewed());
        act(() => result.current.trackView(viewed));
        act(() => result.current.trackView({ ...viewed, sellerId: '' } as Property));

        const [stored] = result.current.recentlyViewed;
        expect(stored.sellerId).toBe('seller-1');
    });
});
