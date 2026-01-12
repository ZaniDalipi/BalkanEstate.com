// Token management service
// Handles storage and retrieval of auth tokens with proactive refresh
// Includes basic obfuscation to protect tokens from casual inspection

import { API_URL } from './config';

const ACCESS_TOKEN_KEY = 'balkan_estate_token';
const REFRESH_TOKEN_KEY = 'balkan_estate_refresh_token';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const STORAGE_VERSION = 'v2'; // Used to invalidate old storage format

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let isRefreshing = false;
let onSessionExpired: (() => void) | null = null;

// Simple obfuscation for token storage (not encryption, but adds a layer of protection)
// This prevents casual inspection of tokens in DevTools
const obfuscate = (value: string): string => {
  try {
    // Base64 encode with timestamp prefix
    const timestamp = Date.now().toString(36);
    const combined = `${STORAGE_VERSION}:${timestamp}:${value}`;
    return btoa(combined.split('').reverse().join(''));
  } catch {
    return value;
  }
};

const deobfuscate = (value: string): string => {
  try {
    const decoded = atob(value).split('').reverse().join('');
    const parts = decoded.split(':');
    if (parts.length >= 3 && parts[0] === STORAGE_VERSION) {
      // Remove version and timestamp, return the token
      return parts.slice(2).join(':');
    }
    // Legacy format - return as-is (will be upgraded on next write)
    return value;
  } catch {
    return value;
  }
};

// Secure storage wrapper
const secureStorage = {
  getItem: (key: string): string | null => {
    const value = localStorage.getItem(key);
    if (!value) return null;
    return deobfuscate(value);
  },
  setItem: (key: string, value: string): void => {
    localStorage.setItem(key, obfuscate(value));
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
};

// Decode JWT without verification (for client-side expiry check)
const decodeToken = (token: string): { exp?: number; id?: string } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// Check if token is about to expire (within buffer time)
const isTokenExpiringSoon = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;

  const expiresAt = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  return expiresAt - now < REFRESH_BUFFER_MS;
};

// Get time until token expires (in milliseconds)
const getTimeUntilExpiry = (token: string): number => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return 0;

  const expiresAt = decoded.exp * 1000;
  return Math.max(0, expiresAt - Date.now());
};

// Proactive token refresh
const refreshTokenProactively = async (): Promise<boolean> => {
  if (isRefreshing) return false;

  const refreshToken = secureStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      tokenService.clearTokens();
      onSessionExpired?.();
      return false;
    }

    const data = await response.json();
    if (data.accessToken) {
      tokenService.setAccessToken(data.accessToken);
      if (data.refreshToken) {
        tokenService.setRefreshToken(data.refreshToken);
      }
      scheduleRefresh(data.accessToken);
      return true;
    }

    return false;
  } catch (error) {
    return false;
  } finally {
    isRefreshing = false;
  }
};

// Schedule next token refresh
const scheduleRefresh = (token: string): void => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const timeUntilExpiry = getTimeUntilExpiry(token);
  if (timeUntilExpiry <= 0) return;

  // Schedule refresh 5 minutes before expiry
  const refreshIn = Math.max(0, timeUntilExpiry - REFRESH_BUFFER_MS);


  refreshTimer = setTimeout(() => {
    refreshTokenProactively();
  }, refreshIn);
};

export const tokenService = {
  getAccessToken: (): string | null => {
    return secureStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken: (token: string): void => {
    secureStorage.setItem(ACCESS_TOKEN_KEY, token);
    scheduleRefresh(token);
  },

  getRefreshToken: (): string | null => {
    return secureStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    secureStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  clearTokens: (): void => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    secureStorage.removeItem(ACCESS_TOKEN_KEY);
    secureStorage.removeItem(REFRESH_TOKEN_KEY);
    // Also clear any legacy unobfuscated tokens
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  hasValidToken: (): boolean => {
    const token = secureStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return false;

    // Check if token is not expired
    const decoded = decodeToken(token);
    if (!decoded?.exp) return false;

    return decoded.exp * 1000 > Date.now();
  },

  // Check if token needs refresh soon
  needsRefresh: (): boolean => {
    const token = secureStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return false;
    return isTokenExpiringSoon(token);
  },

  // Initialize proactive refresh on app start
  initializeProactiveRefresh: (): void => {
    const token = secureStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && !isTokenExpiringSoon(token)) {
      scheduleRefresh(token);
    } else if (token) {
      // Token is expiring soon, refresh immediately
      refreshTokenProactively();
    }
  },

  // Set callback for session expiration
  onSessionExpired: (callback: () => void): void => {
    onSessionExpired = callback;
  },

  // Force refresh token now
  forceRefresh: (): Promise<boolean> => {
    return refreshTokenProactively();
  },

  // Get token expiry time
  getTokenExpiryTime: (): Date | null => {
    const token = secureStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;

    const decoded = decodeToken(token);
    if (!decoded?.exp) return null;

    return new Date(decoded.exp * 1000);
  },
};
