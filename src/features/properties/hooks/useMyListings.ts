// useMyListings Hook - Get current user's property listings
// Uses TanStack Query for automatic caching
// Real-time updates via polling (auto-refresh every 10 seconds)

import { useQuery } from '@tanstack/react-query';
import { propertyKeys, getMyListings } from '../api';

/**
 * Hook to get current user's property listings
 *
 * Features:
 * - Real-time updates via polling (every 10 seconds)
 * - Automatic caching
 * - Requires authentication
 * - Auto-refetch on window focus
 *
 * Usage:
 * ```tsx
 * const { listings, isLoading, error } = useMyListings();
 * ```
 */
export function useMyListings(options?: { enablePolling?: boolean }) {
  const { enablePolling = true } = options || {};

  const {
    data: listings = [],
    isLoading,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: propertyKeys.myListings(),
    queryFn: getMyListings,
    staleTime: 5 * 1000, // 5 seconds - consider stale quickly for real-time feel
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchInterval: enablePolling ? 10 * 1000 : false, // Auto-refresh every 10 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Refresh on component mount
    refetchOnReconnect: true, // Refresh on network reconnect
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (not authenticated)
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  return {
    listings,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
    isEmpty: !isLoading && listings.length === 0,
  };
}
