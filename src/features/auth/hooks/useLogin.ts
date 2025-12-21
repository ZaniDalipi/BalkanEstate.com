// useLogin Hook - Replaces login logic from AppContext
// Uses TanStack Query mutation for login operations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../api/authKeys';
import * as api from '../../../../services/apiService';
import { User } from '../../../../types';

interface LoginParams {
  emailOrPhone: string;
  password: string;
}

/**
 * Hook for user login
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation
 * - Error handling
 * - Loading states
 *
 * Usage:
 * ```tsx
 * const { login, isLoading, error } = useLogin();
 *
 * const handleLogin = async () => {
 *   try {
 *     const user = await login({ emailOrPhone: 'user@example.com', password: '123' });
 *     console.log('Logged in:', user);
 *   } catch (err) {
 *     console.error('Login failed:', err);
 *   }
 * };
 * ```
 */
export function useLogin() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ emailOrPhone, password }: LoginParams): Promise<User> => {
      return await api.login(emailOrPhone, password);
    },
    onSuccess: (user) => {
      // Update the current user cache immediately
      queryClient.setQueryData(authKeys.currentUser(), user);

      // Invalidate all auth queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error: any) => {
      console.error('Login error:', error);
    },
  });

  return {
    login: mutation.mutateAsync,
    loginSync: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
