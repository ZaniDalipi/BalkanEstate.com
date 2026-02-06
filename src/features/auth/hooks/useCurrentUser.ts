// useCurrentUser Hook - Replaces AuthContext for current user
// Uses TanStack Query for automatic caching and refetching

import { useQuery } from '@tanstack/react-query';
import { authKeys, checkAuth } from '../api';

/**
 * Hook to get the current authenticated user
 *
 * Features:
 * - Automatic caching (30s fresh, 2 min cache)
 * - Polls every 30 seconds for near-instant admin change detection
 * - Refetch on window focus
 * - Refetch on network reconnect
 * - No manual state management needed
 *
 * Usage:
 * ```tsx
 * const { user, isLoading, isAuthenticated } = useCurrentUser();
 * ```
 */
export function useCurrentUser() {
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: checkAuth,
    // Don't retry on 401 (not authenticated)
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
    // Keep user data fresh for fast admin change detection
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Poll every 30 seconds to detect admin changes
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
  };
}
