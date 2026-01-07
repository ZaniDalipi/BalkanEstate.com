// usePhoneAuth Hook - Phone authentication functionality
// Uses TanStack Query mutation for phone verification

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '../api/authKeys';
import * as api from '@/services/apiService';
import { User } from '@/types';

interface SendCodeParams {
  phone: string;
}

interface VerifyCodeParams {
  phone: string;
  code: string;
}

interface CompleteSignupParams {
  phone: string;
  name: string;
  email: string;
}

interface VerifyCodeResult {
  user: User | null;
  isNew: boolean;
}

/**
 * Hook for phone authentication
 *
 * Three-step process for new users:
 * 1. Send verification code to phone
 * 2. Verify code - returns { user, isNew }
 * 3. If isNew, complete signup with name and email
 *
 * Usage:
 * ```tsx
 * const { sendCode, verifyCode, completeSignup, isSendingCode, isVerifying, isCompletingSignup } = usePhoneAuth();
 *
 * // Step 1: Send code
 * await sendCode({ phone: '+1234567890' });
 *
 * // Step 2: Verify code
 * const { user, isNew } = await verifyCode({ phone: '+1234567890', code: '123456' });
 *
 * // Step 3 (if new user): Complete signup
 * if (isNew) {
 *   const newUser = await completeSignup({ phone: '+1234567890', name: 'John', email: 'john@example.com' });
 * }
 * ```
 */
export function usePhoneAuth() {
  const queryClient = useQueryClient();

  const sendCodeMutation = useMutation({
    mutationFn: async ({ phone }: SendCodeParams): Promise<{ expiresAt: Date }> => {
      return await api.sendPhoneCode(phone);
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async ({ phone, code }: VerifyCodeParams): Promise<VerifyCodeResult> => {
      return await api.verifyPhoneCode(phone, code);
    },
    onSuccess: (result) => {
      if (result.user) {
        // Update the current user cache
        queryClient.setQueryData(authKeys.currentUser(), result.user);
        // Invalidate all auth queries
        queryClient.invalidateQueries({ queryKey: authKeys.all });
      }
    },
  });

  const completeSignupMutation = useMutation({
    mutationFn: async ({ phone, name, email }: CompleteSignupParams): Promise<User> => {
      return await api.completePhoneSignup(phone, name, email);
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

    // Complete signup (for new users)
    completeSignup: completeSignupMutation.mutateAsync,
    completeSignupSync: completeSignupMutation.mutate,
    isCompletingSignup: completeSignupMutation.isPending,
    completeSignupError: completeSignupMutation.error,
  };
}
