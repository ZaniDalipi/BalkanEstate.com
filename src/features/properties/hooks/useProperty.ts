// useProperty Hook - Get single property by ID
// Uses TanStack Query for automatic caching and refetching

import { useQuery } from '@tanstack/react-query';
import { propertyKeys } from '../api/propertyKeys';
import * as api from '../../../services/apiService';
import { Property } from '../../../types';

interface UsePropertyOptions {
  enabled?: boolean;
}

/**
 * Hook to get a single property by ID
 *
 * Features:
 * - Automatic caching per property
 * - Longer cache time (properties don't change often)
 * - Can be disabled with enabled option
 *
 * Usage:
 * ```tsx
 * const { property, isLoading, error } = useProperty(propertyId);
 *
 * // Conditional fetching
 * const { property } = useProperty(propertyId, { enabled: !!propertyId });
 * ```
 */
export function useProperty(propertyId: string | null | undefined, options?: UsePropertyOptions) {
  const {
    data: property,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: propertyKeys.detail(propertyId || ''),
    queryFn: async () => {
      if (!propertyId) throw new Error('Property ID is required');
      return await api.getProperty(propertyId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!propertyId && (options?.enabled !== false),
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (property not found)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

  return {
    property: property ?? null,
    isLoading,
    error,
    refetch,
    isNotFound: error?.response?.status === 404,
  };
}
