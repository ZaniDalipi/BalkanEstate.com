// usePasswordReset Hook - Password reset functionality
// Uses TanStack Query mutation for password reset operations

import { useMutation } from '@tanstack/react-query';
import * as api from '../../../services/apiService';

interface PasswordResetParams {
  email: string;
}

interface ResetPasswordParams {
  token: string;
  newPassword: string;
}

/**
 * Hook for requesting password reset
 *
 * Usage:
 * ```tsx
 * const { requestReset, isLoading } = usePasswordReset();
 *
 * const handleForgotPassword = async () => {
 *   const result = await requestReset({ email: 'user@example.com' });
 *   console.log(result.message);
 * };
 * ```
 */
export function usePasswordReset() {
  const requestMutation = useMutation({
    mutationFn: async ({ email }: PasswordResetParams) => {
      return await api.requestPasswordReset(email);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async ({ token, newPassword }: ResetPasswordParams) => {
      return await api.resetPassword(token, newPassword);
    },
  });

  return {
    // Request reset email
    requestReset: requestMutation.mutateAsync,
    requestResetSync: requestMutation.mutate,
    isRequestingReset: requestMutation.isPending,
    requestError: requestMutation.error,

    // Reset password with token
    resetPassword: resetMutation.mutateAsync,
    resetPasswordSync: resetMutation.mutate,
    isResettingPassword: resetMutation.isPending,
    resetError: resetMutation.error,
  };
}
