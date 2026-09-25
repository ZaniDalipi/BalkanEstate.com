/**
 * My Listings shows one page of 20 listings at a time ("Page 2 of 5").
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const getMyListingsPage = vi.fn();
vi.mock('@/src/features/properties/api', () => ({
    getMyListingsPage: (...args: unknown[]) => getMyListingsPage(...args),
}));

const { useMyListingsPaged } = await import('@/src/features/properties/hooks/useMyListingsPaged');

const TOTAL = 45;
const counts = { all: TOTAL, sale: TOTAL, rent: 0, private_seller: 0, agent: TOTAL };
const listing = (i: number) => ({ id: `p${i}`, status: 'active', listingType: 'sale' }) as never;

let queryClient: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    getMyListingsPage.mockReset();
    getMyListingsPage.mockImplementation(async ({ offset, limit }: { offset: number; limit: number }) => ({
        properties: Array.from({ length: Math.max(0, Math.min(limit, TOTAL - offset)) }, (_, i) => listing(offset + i)),
        total: TOTAL,
        hasMore: offset + limit < TOTAL,
        counts,
    }));
});

describe('useMyListingsPaged', () => {
    it('loads one page of 20 and knows how many pages there are', async () => {
        const { result } = renderHook(() => useMyListingsPaged({ status: 'all' }, 1), { wrapper });
        await waitFor(() => expect(result.current.listings).toHaveLength(20));
        expect(getMyListingsPage).toHaveBeenCalledWith(expect.objectContaining({ offset: 0, limit: 20 }));
        expect(result.current.total).toBe(45);
        expect(result.current.totalPages).toBe(3);
        expect(result.current.counts).toEqual(counts);
    });

    it('asks for the right slice for a later page, keeping the previous page shown meanwhile', async () => {
        const { result, rerender } = renderHook(({ page }) => useMyListingsPaged({}, page), {
            wrapper,
            initialProps: { page: 1 },
        });
        await waitFor(() => expect(result.current.listings).toHaveLength(20));

        rerender({ page: 3 });
        // Still showing page 1 while page 3 loads
        expect(result.current.listings[0]).toMatchObject({ id: 'p0' });
        await waitFor(() => expect(result.current.listings.map(p => p.id)).toEqual(['p40', 'p41', 'p42', 'p43', 'p44']));
        expect(getMyListingsPage).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 40 }));
    });

    it('applies optimistic removals to the listings, total and counts', async () => {
        const { result } = renderHook(() => useMyListingsPaged({}, 1), { wrapper });
        await waitFor(() => expect(result.current.listings).toHaveLength(20));

        act(() => {
            result.current.setListings(ls => ls.filter(p => p.id !== 'p0'));
            result.current.setCounts(c => ({ ...c, all: c.all - 1 }));
        });
        await waitFor(() => expect(result.current.listings.map(p => p.id)).not.toContain('p0'));
        expect(result.current.total).toBe(44);
        expect(result.current.counts.all).toBe(44);
    });
});
