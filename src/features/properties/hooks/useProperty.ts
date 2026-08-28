// useProperty Hook - Get single property by ID
// Uses TanStack Query for automatic caching and refetching
// Real-time updates via polling (auto-refresh every 30 seconds)

import { useQuery } from '@tanstack/react-query';
import { propertyKeys, getProperty } from '../api';

interface UsePropertyOptions {
  enabled?: boolean;
  /** Enable polling for real-time updates (default: true) */
  enablePolling?: boolean;
}

/**
 * Hook to get a single property by ID
 *
 * Features:
 * - Real-time updates via polling (every 30 seconds)
 * - Automatic caching per property
 * - Auto-refetch on window focus
 * - Can be disabled with enabled option
 *
 * Usage:
 * ```tsx
 * const { property, isLoading, error } = useProperty(propertyId);
 *
 * // Conditional fetching
 * const { property } = useProperty(propertyId, { enabled: !!propertyId });
 *
 * // Disable polling for static views
 * const { property } = useProperty(propertyId, { enablePolling: false });
 * ```
 */
export function useProperty(propertyId: string | null | undefined, options?: UsePropertyOptions) {
  const { enabled = true, enablePolling = true } = options || {};

  const {
    data: property,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: propertyKeys.detail(propertyId || ''),
    queryFn: () => {
      if (!propertyId) throw new Error('Property ID is required');
      return getProperty(propertyId);
    },
    // Distinct-entity detail view: don't carry over the previous property's
    // data when the id changes (would briefly show the wrong listing). Opts
    // out of the global keepPreviousData default — show its own loading state.
    placeholderData: undefined,
    staleTime: 10 * 1000, // 10 seconds - consider stale quickly for real-time feel
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    // Socket events patch this entry directly, so polling is only a safety net
    // for missed events. At 30s every open detail page issued two requests a
    // minute per viewer — pure load for a page that rarely changes.
    refetchInterval: enablePolling ? 2 * 60 * 1000 : false,
    refetchIntervalInBackground: false, // Pause polling when tab is hidden
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Refresh on component mount
    refetchOnReconnect: true, // Refresh on network reconnect
    enabled: !!propertyId && enabled !== false,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (property not found)
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

  return {
    property: property ?? null,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
    isNotFound: error?.response?.status === 404,
  };
}
