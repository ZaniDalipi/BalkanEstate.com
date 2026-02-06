// Query Client Configuration for TanStack Query
// Centralized configuration with optimal defaults

import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a Query Client with production-ready defaults
 *
 * Configuration Strategy:
 * - Stale time: 30 seconds - Data considered fresh (fast refresh)
 * - Cache time: 2 minutes - Keep unused data briefly
 * - Retry: Smart retry based on error type
 * - Refetch: On window focus and reconnect
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh (no refetch)
      staleTime: 30 * 1000, // 30 seconds - fast refresh for all data

      // How long unused data stays in cache
      gcTime: 2 * 60 * 1000, // 2 minutes (formerly cacheTime)

      // Retry logic
      retry: (failureCount, error: any) => {
        // Don't retry on 404 or 401 (client errors)
        if (error?.response?.status === 404) return false;
        if (error?.response?.status === 401) return false;
        if (error?.response?.status === 403) return false;

        // Retry up to 3 times for server errors
        return failureCount < 3;
      },

      // Exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch when user returns to tab
      refetchOnWindowFocus: true,

      // Refetch when network reconnects
      refetchOnReconnect: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once on network errors
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false; // Don't retry client errors
        }
        return failureCount < 1; // Retry once for server errors
      },
    },
  },
});
