// useSignup Hook - Replaces signup logic from AppContext
// Uses TanStack Query mutation for signup operations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys, signup } from '../api';
import type { User } from '@/types';

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
 *     // Log removed
 *   } catch (err) {
 *     // Error removed
 *   }
 * };
 * ```
 */
export function useSignup() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ email, password, name, phone, role }: SignupParams): Promise<User> =>
      signup(email, password, { name, phone, role }),
    onSuccess: (user) => {
      // Update the current user cache immediately
      queryClient.setQueryData(authKeys.currentUser(), user);

      // Invalidate all auth queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: () => {
      // Error is available via mutation.error
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
