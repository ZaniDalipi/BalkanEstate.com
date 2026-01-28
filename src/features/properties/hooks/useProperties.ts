// useProperties Hook - Get list of properties with filters
// Uses TanStack Query for automatic caching and refetching
// Real-time updates via polling (auto-refresh every 10 seconds)

import { useQuery } from '@tanstack/react-query';
import { propertyKeys, getProperties } from '../api';
import type { Filters } from '@/types';

/**
 * Hook to get list of properties with optional filters
 *
 * Features:
 * - Real-time updates via polling (every 10 seconds)
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
export function useProperties(filters?: Filters, options?: { enablePolling?: boolean }) {
  const { enablePolling = true } = options || {};

  const {
    data: properties = [],
    isLoading,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => getProperties(filters),
    staleTime: 5 * 1000, // 5 seconds - consider stale quickly for real-time feel
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchInterval: enablePolling ? 10 * 1000 : false, // Auto-refresh every 10 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Refresh on component mount
    refetchOnReconnect: true, // Refresh on network reconnect
    enabled: true,
  });

  return {
    properties,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
    isEmpty: !isLoading && properties.length === 0,
  };
}
