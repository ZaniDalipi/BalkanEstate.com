// useSignup Hook - Replaces signup logic from AppContext
// Uses TanStack Query mutation for signup operations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../api/authKeys';
import * as api from '../../../services/apiService';
import { User } from '../../../types';

interface SignupParams {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  role?: 'buyer' | 'seller' | 'agent';
}

/**
 * Hook for user signup
 *
 * Features:
 * - Automatic cache updates
 * - Error handling
 * - Loading states
 *
 * Usage:
 * ```tsx
 * const { signup, isLoading, error } = useSignup();
 *
 * const handleSignup = async () => {
 *   try {
 *     const user = await signup({
 *       email: 'user@example.com',
 *       password: '123',
 *       name: 'John Doe'
 *     });
 *     console.log('Signed up:', user);
 *   } catch (err) {
 *     console.error('Signup failed:', err);
 *   }
 * };
 * ```
 */
export function useSignup() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ email, password, name, phone, role }: SignupParams): Promise<User> => {
      return await api.signup(email, password, { name, phone, role });
    },
    onSuccess: (user) => {
      // Update the current user cache immediately
      queryClient.setQueryData(authKeys.currentUser(), user);

      // Invalidate all auth queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error: any) => {
      console.error('Signup error:', error);
    },
  });

  return {
    signup: mutation.mutateAsync,
    signupSync: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
