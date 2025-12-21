// useMyListings Hook - Get current user's property listings
// Uses TanStack Query for automatic caching

import { useQuery } from '@tanstack/react-query';
import { propertyKeys } from '../api/propertyKeys';
import * as api from '../../../services/apiService';
import { Property } from '../../../types';

/**
 * Hook to get current user's property listings
 *
 * Features:
 * - Automatic caching
 * - Requires authentication
 * - Auto-refetch on window focus
 *
 * Usage:
 * ```tsx
 * const { listings, isLoading, error } = useMyListings();
 * ```
 */
export function useMyListings() {
  const {
    data: listings = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: propertyKeys.myListings(),
    queryFn: async () => {
      return await api.getMyListings();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (not authenticated)
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  return {
    listings,
    isLoading,
    error,
    refetch,
    isEmpty: !isLoading && listings.length === 0,
  };
}
