/**
 * My Listings loads 20 listings at a time: each chunk asks the server for the
 * next offset, and listings changed on the page (optimistic updates) don't
 * shift that offset.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getMyListingsPage = vi.fn();
vi.mock('@/src/features/properties/api', () => ({
    getMyListingsPage: (...args: unknown[]) => getMyListingsPage(...args),
}));

const { useMyListingsInfinite, MY_LISTINGS_PAGE_SIZE } = await import('@/src/features/properties/hooks/useMyListingsInfinite');

const listing = (i: number, status = 'active') => ({ id: `p${i}`, status, listingType: 'sale' }) as never;
const counts = { all: 45, sale: 45, rent: 0, private_seller: 0, agent: 45 };

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getMyListingsPage.mockReset();
    getMyListingsPage.mockImplementation(async ({ offset, limit }: { offset: number; limit: number }) => ({
        properties: Array.from({ length: Math.min(limit, 45 - offset) }, (_, i) => listing(offset + i)),
        total: 45,
        hasMore: offset + limit < 45,
        ...(offset === 0 ? { counts } : {}),
    }));
});

describe('useMyListingsInfinite', () => {
    it('loads the first 20, then the next chunk on demand', async () => {
        const { result } = renderHook(() => useMyListingsInfinite({ status: 'all' }), { wrapper });
        await waitFor(() => expect(result.current.listings).toHaveLength(MY_LISTINGS_PAGE_SIZE));
        expect(getMyListingsPage).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 20 }));
        expect(result.current.counts).toEqual(counts);
        expect(result.current.hasMore).toBe(true);

        await act(() => result.current.fetchNextPage());
        await waitFor(() => expect(result.current.listings).toHaveLength(40));
        expect(getMyListingsPage).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20 }));

        await act(() => result.current.fetchNextPage());
        await waitFor(() => expect(result.current.listings).toHaveLength(45));
        expect(result.current.hasMore).toBe(false);
    });

    it('does not count a listing that left the filter toward the next offset', async () => {
        const { result } = renderHook(() => useMyListingsInfinite({ status: 'active' }), { wrapper });
        await waitFor(() => expect(result.current.listings).toHaveLength(20));

        // Marked as sold on the page: no longer part of the server's "active" results
        act(() => result.current.setListings(ls => ls.map(p => (p.id === 'p3' ? { ...p, status: 'sold' } : p))));
        await act(() => result.current.fetchNextPage());
        expect(getMyListingsPage).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 19, status: 'active' }));
    });

    it('applies optimistic removals and count changes', async () => {
        const { result } = renderHook(() => useMyListingsInfinite({}), { wrapper });
        await waitFor(() => expect(result.current.listings).toHaveLength(20));

        act(() => {
            result.current.setListings(ls => ls.filter(p => p.id !== 'p0'));
            result.current.setCounts(c => ({ ...c, all: c.all - 1 }));
        });
        await waitFor(() => expect(result.current.listings.map(p => p.id)).not.toContain('p0'));
        expect(result.current.counts.all).toBe(44);
    });
});
