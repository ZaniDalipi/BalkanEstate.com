// useMyListingsInfinite - the current user's listings, loaded in chunks as they scroll
// Uses TanStack Query's infinite queries; filtering and sorting happen on the server
// so every chunk is in the right order and the tab counts cover all listings.

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { propertyKeys } from '@/src/shared/query/queryKeys';
import type { Property } from '@/src/shared/types';
import { getMyListingsPage, type MyListingsCounts, type MyListingsFilters, type MyListingsPage } from '../api';

export const MY_LISTINGS_PAGE_SIZE = 20;

const EMPTY_COUNTS: MyListingsCounts = { all: 0, sale: 0, rent: 0, private_seller: 0, agent: 0 };

/** Whether a loaded listing still belongs to the server's result for these filters */
const matchesFilters = (p: Property, f: MyListingsFilters) =>
  (!f.status || f.status === 'all' || p.status === f.status) &&
  (!f.role || p.createdAsRole === f.role) &&
  (!f.listingType || (p.listingType || 'sale') === f.listingType);

/**
 * Usage:
 * ```tsx
 * const { listings, counts, hasMore, fetchNextPage } = useMyListingsInfinite({ status: 'active' });
 * ```
 */
export function useMyListingsInfinite(filters: MyListingsFilters, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();
  const queryKey = propertyKeys.myListingsPages(filters as Record<string, unknown>);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      getMyListingsPage({ ...filters, offset: pageParam, limit: MY_LISTINGS_PAGE_SIZE }),
    initialPageParam: 0,
    // The next chunk starts after the loaded listings that still match the
    // filters: one whose status was just changed here has left the server's
    // result set and must not shift the offset.
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore
        ? pages.reduce((n, page) => n + page.properties.filter(p => matchesFilters(p, filters)).length, 0)
        : undefined,
    enabled: options?.enabled ?? true,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    // Show cached chunks instantly, but always refresh when the page opens
    // (e.g. coming back after editing a listing)
    refetchOnMount: 'always',
  });

  const listings = useMemo(() => {
    const seen = new Set<string>();
    const result: Property[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const p of page.properties) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          result.push(p);
        }
      }
    }
    return result;
  }, [query.data]);

  /**
   * Optimistically update the loaded listings. The updater runs on each chunk,
   * so use it for per-listing changes (map / filter).
   */
  const setListings = useCallback(
    (updater: (listings: Property[]) => Property[]) => {
      queryClient.setQueriesData<InfiniteData<MyListingsPage, number>>(
        { queryKey: propertyKeys.myListingsPagesAll() },
        old => old && { ...old, pages: old.pages.map(page => ({ ...page, properties: updater(page.properties) })) }
      );
    },
    [queryClient]
  );

  /** Optimistically adjust the tab counts (e.g. after a delete) */
  const setCounts = useCallback(
    (updater: (counts: MyListingsCounts) => MyListingsCounts) => {
      queryClient.setQueriesData<InfiniteData<MyListingsPage, number>>(
        { queryKey: propertyKeys.myListingsPagesAll() },
        old =>
          old && {
            ...old,
            pages: old.pages.map((page, i) =>
              i === 0 && page.counts ? { ...page, counts: updater(page.counts) } : page
            ),
          }
      );
    },
    [queryClient]
  );

  return {
    listings,
    counts: query.data?.pages[0]?.counts ?? EMPTY_COUNTS,
    isLoading: query.isPending,
    isFetchingNextPage: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    setListings,
    setCounts,
  };
}
