// useCurrentUser Hook - Replaces AuthContext for current user
// Uses TanStack Query for automatic caching and refetching

import { useQuery } from '@tanstack/react-query';
import { authKeys } from '../api/authKeys';
import * as api from '../../../services/apiService';
import { User } from '../../../types';

/**
 * Hook to get the current authenticated user
 *
 * Features:
 * - Automatic caching (5 min fresh, 10 min cache)
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
    queryFn: async () => {
      const user = await api.checkAuth();
      return user;
    },
    // Don't retry on 401 (not authenticated)
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
    // Keep user data fresh
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
  };
}
