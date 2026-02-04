// Auth API module
// Handles all authentication-related API calls

import { apiRequest } from '@/src/shared/api';
import { tokenService } from '@/src/shared/api/tokenService';
import { API_URL } from '@/src/shared/api/config';
import type { User, UserRole, LoginHistoryEntry } from '@/src/shared/types';

// --- Authentication API ---

export const checkAuth = async (): Promise<User | null> => {
  try {
    const token = tokenService.getAccessToken();
    if (!token) return null;

    const response = await apiRequest<{ user: User }>('/auth/me', { requiresAuth: true });
    return response.user;
  } catch (error) {
    tokenService.clearTokens();
    return null;
  }
};

export const login = async (emailOrPhone: string, password: string): Promise<User> => {
  const isEmail = emailOrPhone.includes('@');
  const body = isEmail
    ? { email: emailOrPhone, password }
    : { phone: emailOrPhone, password };

  const response = await apiRequest<{
    user: User;
    accessToken?: string;
    refreshToken?: string;
    token?: string;
  }>('/auth/login', {
    method: 'POST',
    body,
  });

  const accessToken = response.accessToken || response.token;
  const refreshToken = response.refreshToken;

  if (accessToken) {
    tokenService.setAccessToken(accessToken);
  }
  if (refreshToken) {
    tokenService.setRefreshToken(refreshToken);
  }

  return response.user;
};

export interface SignupOptions {
  name?: string;
  phone?: string;
  role?: 'buyer' | 'private_seller' | 'agent';
  licenseNumber?: string;
  agencyInvitationCode?: string;
}

export const signup = async (
  email: string,
  password: string,
  options?: SignupOptions
): Promise<User> => {
  const response = await apiRequest<{
    user: User;
    accessToken?: string;
    refreshToken?: string;
    token?: string;
  }>('/auth/signup', {
    method: 'POST',
    body: {
      email,
      password,
      name: options?.name || email.split('@')[0],
      phone: options?.phone || '',
      role: options?.role || 'buyer',
      licenseNumber: options?.licenseNumber,
      agencyInvitationCode: options?.agencyInvitationCode,
    },
  });

  const accessToken = response.accessToken || response.token;
  const refreshToken = response.refreshToken;

  if (accessToken) {
    tokenService.setAccessToken(accessToken);
  }
  if (refreshToken) {
    tokenService.setRefreshToken(refreshToken);
  }

  return response.user;
};

export const logout = async (): Promise<void> => {
  const refreshToken = tokenService.getRefreshToken();

  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
      body: { refreshToken },
    });
  } catch {
    // Silently handle logout errors - tokens will be cleared regardless
  }

  tokenService.clearTokens();
};

export const logoutAllDevices = async (): Promise<void> => {
  try {
    await apiRequest('/auth/logout-all', {
      method: 'POST',
      requiresAuth: true,
    });
  } catch {
    // Silently handle logout errors - tokens will be cleared regardless
  }

  tokenService.clearTokens();
};

export const getLoginHistory = async (): Promise<LoginHistoryEntry[]> => {
  const response = await apiRequest<{ loginHistory: LoginHistoryEntry[]; total: number }>(
    '/auth/login-history',
    { requiresAuth: true }
  );
  return response.loginHistory;
};

export const requestPasswordReset = async (
  email: string
): Promise<{ message: string; resetToken?: string }> => {
  return apiRequest<{ message: string; resetToken?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
};

export const resetPassword = async (token: string, newPassword: string): Promise<User> => {
  const response = await apiRequest<{
    user: User;
    accessToken?: string;
    refreshToken?: string;
    token?: string;
  }>('/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
  });

  const accessToken = response.accessToken || response.token;
  const refreshToken = response.refreshToken;

  if (accessToken) {
    tokenService.setAccessToken(accessToken);
  }
  if (refreshToken) {
    tokenService.setRefreshToken(refreshToken);
  }

  return response.user;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> => {
  const response = await apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    requiresAuth: true,
    body: { currentPassword, newPassword },
  });

  tokenService.clearTokens();
  return response;
};

// --- OAuth ---

export const getAvailableOAuthProviders = async (): Promise<{
  google: boolean;
  facebook: boolean;
  apple: boolean;
}> => {
  try {
    const response = await apiRequest<{
      providers: { google: boolean; facebook: boolean; apple: boolean };
    }>('/auth/oauth/providers');
    return response.providers;
  } catch {
    return { google: false, facebook: false, apple: false };
  }
};

export const getOAuthUrl = (provider: 'google' | 'facebook' | 'apple'): string => {
  // Ensure we have a valid absolute URL for OAuth redirects
  let baseUrl = API_URL.replace('/api', '');

  // If the URL doesn't start with http:// or https://, use production fallback
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://api.balkanestateai.com';
  }

  return `${baseUrl}/api/auth/${provider}`;
};

export const loginWithSocial = (provider: 'google' | 'facebook' | 'apple'): void => {
  window.location.href = getOAuthUrl(provider);
};

// --- Phone Auth ---

export const sendPhoneCode = async (_phone: string): Promise<void> => {
  // TODO: Implement phone verification on backend
};

export const verifyPhoneCode = async (
  phone: string,
  code: string
): Promise<{ user: User | null; isNew: boolean }> => {
  throw new Error('Phone verification not yet implemented');
};

export const completePhoneSignup = async (
  phone: string,
  name: string,
  email: string
): Promise<User> => {
  throw new Error('Phone signup not yet implemented');
};

// --- Profile ---

export const updateUser = async (userData: Partial<User>): Promise<User> => {
  const response = await apiRequest<{ user: User }>('/auth/profile', {
    method: 'PUT',
    body: userData,
    requiresAuth: true,
  });
  return response.user;
};

export const setPublicKey = async (publicKey: string): Promise<void> => {
  await apiRequest('/auth/set-public-key', {
    method: 'POST',
    body: { publicKey },
    requiresAuth: true,
  });
};

// --- Role Switching ---

export interface SwitchRoleData {
  licenseNumber?: string;
  agencyInvitationCode?: string;
  agentId?: string;
  languages?: string[];
}

export const switchRole = async (
  role: UserRole,
  licenseData?: SwitchRoleData
): Promise<User> => {
  const response = await apiRequest<{ user: User; message: string }>('/auth/switch-role', {
    method: 'POST',
    body: { role, ...licenseData },
    requiresAuth: true,
  });
  return response.user;
};
