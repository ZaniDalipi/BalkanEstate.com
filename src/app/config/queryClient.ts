// Query Client Configuration for TanStack Query
// Centralized configuration with optimal defaults

import { QueryClient, keepPreviousData } from '@tanstack/react-query';

/**
 * Creates a Query Client with production-ready defaults
 *
 * Configuration Strategy:
 * - Stale time: 30 seconds - Data considered fresh (fast refresh)
 * - Cache time: 2 minutes - Keep unused data briefly
 * - Retry: Smart retry based on error type
 * - Refetch: On window focus and reconnect
 * - Placeholder data: keep previous result while a new query key loads, so the
 *   UI never flashes back to a skeleton on filter/pagination/search/locale
 *   changes — content stays put and swaps in smoothly (no flicker).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep showing the last successful data for a query while the next key
      // resolves. Only kicks in when there IS previous data (first load still
      // shows skeletons), so transitions feel seamless instead of jumpy.
      placeholderData: keepPreviousData,

      // How long data is considered fresh (no refetch)
      staleTime: 30 * 1000, // 30 seconds - fast refresh for all data

      // How long unused data stays in cache
      gcTime: 2 * 60 * 1000, // 2 minutes (formerly cacheTime)

      // Retry logic
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;

        // Don't retry client errors — the answer won't change
        if (status === 404 || status === 401 || status === 403) return false;

        // A rate-limited request must not be retried into the limiter
        if (status === 429) return false;

        // A server error usually means the API is already struggling. Retrying
        // three times triples every client's request rate at exactly the wrong
        // moment, turning a partial outage into a full one — so a 5xx gets one
        // more attempt, and network/unknown failures (no status) get two.
        if (status >= 500) return failureCount < 1;
        return failureCount < 2;
      },

      // Exponential backoff with jitter. Without the random component every
      // client that failed together also retries together, re-creating the
      // spike that caused the failure.
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, 30000) + Math.round(Math.random() * 1000),

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
