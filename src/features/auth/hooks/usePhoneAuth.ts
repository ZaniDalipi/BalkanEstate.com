// usePhoneAuth Hook - Phone authentication functionality
// Uses TanStack Query mutation for phone verification

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../api/authKeys';
import * as api from '../../../services/apiService';
import { User } from '../../../types';

interface SendCodeParams {
  phone: string;
}

interface VerifyCodeParams {
  phone: string;
  code: string;
}

/**
 * Hook for phone authentication
 *
 * Two-step process:
 * 1. Send verification code to phone
 * 2. Verify code to complete authentication
 *
 * Usage:
 * ```tsx
 * const { sendCode, verifyCode, isSendingCode, isVerifying } = usePhoneAuth();
 *
 * // Step 1: Send code
 * await sendCode({ phone: '+1234567890' });
 *
 * // Step 2: Verify code
 * const user = await verifyCode({ phone: '+1234567890', code: '123456' });
 * ```
 */
export function usePhoneAuth() {
  const queryClient = useQueryClient();

  const sendCodeMutation = useMutation({
    mutationFn: async ({ phone }: SendCodeParams): Promise<void> => {
      return await api.sendPhoneCode(phone);
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ phone, code }: VerifyCodeParams): Promise<User> => {
      return await api.verifyPhoneCode(phone, code);
    },
    onSuccess: (user) => {
      // Update the current user cache
      queryClient.setQueryData(authKeys.currentUser(), user);

      // Invalidate all auth queries
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });

  return {
    // Send verification code
    sendCode: sendCodeMutation.mutateAsync,
    sendCodeSync: sendCodeMutation.mutate,
    isSendingCode: sendCodeMutation.isPending,
    sendCodeError: sendCodeMutation.error,

    // Verify code
    verifyCode: verifyCodeMutation.mutateAsync,
    verifyCodeSync: verifyCodeMutation.mutate,
    isVerifying: verifyCodeMutation.isPending,
    verifyError: verifyCodeMutation.error,
  };
}
