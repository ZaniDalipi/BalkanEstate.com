/**
 * Auth React Query Hooks
 * Following architecture guidelines: Use TanStack Query for ALL server state
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApiClient } from '@/src/data/api/AuthApiClient';
import { apiRequest } from '@/src/shared/api';
import { tokenService } from '@/src/shared/api/tokenService';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'currentUser'] as const,
  oauthProviders: () => [...authKeys.all, 'oauthProviders'] as const,
  emailVerification: (token?: string) => [...authKeys.all, 'emailVerification', { token }] as const,
};

// ============================================================================
// AUTH HOOKS
// ============================================================================

/**
 * Get current authenticated user with auto-refresh
 */
export function useCurrentUser(enabled: boolean = true) {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => authApiClient.getCurrentUser(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: 1, // Only retry once for auth
  });
}

/**
 * Get OAuth providers availability
 */
export function useOAuthProviders() {
  return useQuery({
    queryKey: authKeys.oauthProviders(),
    queryFn: () => authApiClient.getOAuthProviders(),
    staleTime: 60 * 60 * 1000, // 1 hour - doesn't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Login mutation
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailOrPhone, password }: { emailOrPhone: string; password: string }) =>
      authApiClient.login(emailOrPhone, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

/**
 * Signup mutation
 */
export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      name: string;
      phone: string;
      role: string;
      licenseNumber?: string;
      agencyInvitationCode?: string;
    }) => authApiClient.signup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

/**
 * Logout mutation
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApiClient.logout(),
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
    },
  });
}

/**
 * Update profile mutation
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: any) => authApiClient.updateProfile(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

/**
 * Switch role mutation
 */
export function useSwitchRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ role, licenseData }: { role: string; licenseData?: any }) =>
      authApiClient.switchRole(role, licenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

/**
 * Request password reset
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => authApiClient.requestPasswordReset(email),
  });
}

/**
 * Reset password with token
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authApiClient.resetPassword(token, newPassword),
  });
}

/**
 * Verify phone
 */
export function useVerifyPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      authApiClient.verifyPhone(phone, code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

/**
 * Verify email with token
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      apiRequest(`/auth/verify-email?token=${token}`, { method: 'GET' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
  });
}

/**
 * Resend email verification
 */
export function useResendEmailVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      apiRequest('/auth/resend-verification', {
        method: 'POST',
        body: { email },
      }),
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Invalidate auth queries
 */
export function useInvalidateAuthQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    invalidateCurrentUser: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
    },
    clearAll: () => {
      queryClient.clear();
    },
  };
}

/**
 * Prefetch current user (useful for initial load optimization)
 */
export function usePrefetchCurrentUser() {
  const queryClient = useQueryClient();

  return () => {
    const token = tokenService.getAccessToken();
    if (token) {
      queryClient.prefetchQuery({
        queryKey: authKeys.currentUser(),
        queryFn: () => authApiClient.getCurrentUser(),
        staleTime: 5 * 60 * 1000,
      });
    }
  };
}
