// useLogout Hook - Replaces logout logic from AppContext
// Uses TanStack Query mutation for logout operations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../api/authKeys';
import * as api from '../../../services/apiService';

/**
 * Hook for user logout
 *
 * Features:
 * - Clears all auth cache
 * - Clears all user-related queries
 * - Error handling
 *
 * Usage:
 * ```tsx
 * const { logout, isLoading } = useLogout();
 *
 * const handleLogout = async () => {
 *   await logout();
 *   // User is now logged out, cache is cleared
 * };
 * ```
 */
export function useLogout() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await api.logout();
    },
    onSuccess: () => {
      // Clear current user from cache
      queryClient.setQueryData(authKeys.currentUser(), null);

      // Clear all auth queries
      queryClient.invalidateQueries({ queryKey: authKeys.all });

      // Clear all cached queries (user data, saved homes, etc.)
      queryClient.clear();
    },
    onError: (error: any) => {
      console.error('Logout error:', error);

      // Even on error, clear local cache
      queryClient.setQueryData(authKeys.currentUser(), null);
      queryClient.clear();
    },
  });

  return {
    logout: mutation.mutateAsync,
    logoutSync: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
