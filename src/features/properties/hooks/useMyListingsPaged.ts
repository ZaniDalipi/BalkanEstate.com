// useMyListingsPaged - one page of the current user's listings ("Page 2 of 5")
// Uses TanStack Query; filtering, search and sorting happen on the server so
// every page is in the right order and the tab counts cover all listings.

import { useCallback } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '@/src/shared/query/queryKeys';
import type { Property } from '@/src/shared/types';
import { getMyListingsPage, type MyListingsCounts, type MyListingsFilters, type MyListingsPage } from '../api';

export const MY_LISTINGS_PAGE_SIZE = 20;

const EMPTY_COUNTS: MyListingsCounts = { all: 0, sale: 0, rent: 0, private_seller: 0, agent: 0 };
const EMPTY_LISTINGS: Property[] = [];

/**
 * Usage:
 * ```tsx
 * const { listings, page, totalPages } = useMyListingsPaged({ status: 'active' }, page);
 * ```
 */
export function useMyListingsPaged(filters: MyListingsFilters, page: number, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: propertyKeys.myListingsPages({ ...filters, page } as Record<string, unknown>),
    queryFn: () =>
      getMyListingsPage({ ...filters, offset: (page - 1) * MY_LISTINGS_PAGE_SIZE, limit: MY_LISTINGS_PAGE_SIZE }),
    enabled: options?.enabled ?? true,
    // Keep the current page on screen while the next one loads (no flash of skeletons)
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    // Show the cached page instantly, but always refresh when the page opens
    // (e.g. coming back after editing a listing)
    refetchOnMount: 'always',
  });

  /** Optimistically update the listings in every cached page (map / filter per listing) */
  const setListings = useCallback(
    (updater: (listings: Property[]) => Property[]) => {
      queryClient.setQueriesData<MyListingsPage>(
        { queryKey: propertyKeys.myListingsPagesAll() },
        old => {
          if (!old) return old;
          const properties = updater(old.properties);
          const removed = old.properties.length - properties.length;
          return { ...old, properties, total: Math.max(0, old.total - Math.max(0, removed)) };
        }
      );
    },
    [queryClient]
  );

  /** Optimistically adjust the tab counts (e.g. after a delete) */
  const setCounts = useCallback(
    (updater: (counts: MyListingsCounts) => MyListingsCounts) => {
      queryClient.setQueriesData<MyListingsPage>(
        { queryKey: propertyKeys.myListingsPagesAll() },
        old => old && old.counts ? { ...old, counts: updater(old.counts) } : old
      );
    },
    [queryClient]
  );

  const total = query.data?.total ?? 0;

  return {
    listings: query.data?.properties ?? EMPTY_LISTINGS,
    counts: query.data?.counts ?? EMPTY_COUNTS,
    total,
    totalPages: Math.max(1, Math.ceil(total / MY_LISTINGS_PAGE_SIZE)),
    /** First load only; switching pages keeps the previous page visible */
    isLoading: query.isPending,
    /** A different page/filter is loading while the previous one is shown */
    isChangingPage: query.isPlaceholderData && query.isFetching,
    refetch: query.refetch,
    setListings,
    setCounts,
  };
}
