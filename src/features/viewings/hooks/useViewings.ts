// useViewings Hook - Get user's viewings
// Uses TanStack Query for automatic caching and refetching

import { useQuery } from '@tanstack/react-query';
import { viewingKeys } from '../api/viewingKeys';
import * as viewingApi from '../api/viewingApi';
import type { GetViewingsOptions } from '../types';

interface UseViewingsOptions extends GetViewingsOptions {
  enabled?: boolean;
}

/**
 * Hook to get user's viewings
 *
 * Features:
 * - Filter by role (agent, buyer, all)
 * - Filter by status
 * - Filter upcoming only
 * - Automatic caching
 *
 * Usage:
 * ```tsx
 * // Get all viewings
 * const { viewings, isLoading } = useViewings();
 *
 * // Get upcoming viewings as buyer
 * const { viewings } = useViewings({ role: 'buyer', upcoming: true });
 *
 * // Get specific status viewings
 * const { viewings } = useViewings({ status: ['scheduled', 'rescheduled'] });
 * ```
 */
export function useViewings(options: UseViewingsOptions = {}) {
  const { enabled = true, ...apiOptions } = options;

  const {
    data: viewings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: viewingKeys.list(apiOptions),
    queryFn: () => viewingApi.getMyViewings(apiOptions),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });

  return {
    viewings: viewings ?? [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get upcoming viewings
 */
export function useUpcomingViewings(role?: 'agent' | 'buyer' | 'all') {
  return useViewings({
    role,
    upcoming: true,
    status: ['scheduled', 'rescheduled'],
  });
}
