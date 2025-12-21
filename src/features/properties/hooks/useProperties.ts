// useProperties Hook - Get list of properties with filters
// Uses TanStack Query for automatic caching and refetching

import { useQuery } from '@tanstack/react-query';
import { propertyKeys } from '../api/propertyKeys';
import * as api from '../../../services/apiService';
import { Property, Filters } from '../../../types';

/**
 * Hook to get list of properties with optional filters
 *
 * Features:
 * - Automatic caching per filter combination
 * - Background refetching
 * - Smart retry logic
 * - Optimistic updates support
 *
 * Usage:
 * ```tsx
 * const { properties, isLoading, error, refetch } = useProperties(filters);
 * ```
 */
export function useProperties(filters?: Filters) {
  const {
    data: properties = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: async () => {
      const result = await api.getProperties(filters);
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - properties change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Enable query even without filters
    enabled: true,
  });

  return {
    properties,
    isLoading,
    isFetching,
    error,
    refetch,
    isEmpty: !isLoading && properties.length === 0,
  };
}
