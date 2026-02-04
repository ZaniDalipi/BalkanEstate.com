// usePasswordReset Hook - Password reset functionality
// Uses TanStack Query mutation for password reset operations

import { useMutation } from '@tanstack/react-query';
import { requestPasswordReset, resetPassword } from '../api';

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
 *   // Log removed
 * };
 * ```
 */
export function usePasswordReset() {
  const requestMutation = useMutation({
    mutationFn: ({ email }: PasswordResetParams) => requestPasswordReset(email),
  });

  const resetMutation = useMutation({
    mutationFn: ({ token, newPassword }: ResetPasswordParams) =>
      resetPassword(token, newPassword),
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
