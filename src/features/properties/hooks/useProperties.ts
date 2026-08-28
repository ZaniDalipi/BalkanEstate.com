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
    staleTime: 30 * 1000, // Fresh for 30s; socket events invalidate sooner when something actually changes
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    // Polling is a fallback for missed socket events, not the update mechanism:
    // at 10s every open tab issued 6 listing queries a minute whether or not
    // anything had changed, which is the single biggest source of load at scale.
    refetchInterval: enablePolling ? 2 * 60 * 1000 : false,
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
