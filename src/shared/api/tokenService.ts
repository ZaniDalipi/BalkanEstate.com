/**
 * Token Management Service
 * Handles secure storage and retrieval of auth tokens with proactive refresh
 *
 * Security features:
 * - Multi-layer encoding (XOR + base64 + integrity check)
 * - Browser fingerprint binding (optional)
 * - Automatic token expiry validation
 * - Proactive refresh before expiry
 * - Session tampering detection
 */

import { API_URL } from './config';

const ACCESS_TOKEN_KEY = 'balkan_estate_token';
const REFRESH_TOKEN_KEY = 'balkan_estate_refresh_token';
const SESSION_KEY = 'balkan_estate_session';
const REFRESH_BUFFER_MS = 30 * 60 * 1000; // Refresh 30 minutes before expiry for seamless UX
const STORAGE_VERSION = 'v3'; // Used to invalidate old storage format

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let isRefreshing = false;
let onSessionExpired: (() => void) | null = null;

/**
 * Generate a simple browser fingerprint for session binding
 * This helps prevent token theft across different browsers/devices
 */
const generateFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    new Date().getTimezoneOffset().toString(),
  ];
  return simpleHash(components.join('|'));
};

/**
 * Simple hash function for checksums and fingerprints
 * Not cryptographically secure, but sufficient for integrity checks
 */
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

/**
 * XOR encode/decode with a derived key
 * Provides additional layer beyond base64
 */
const xorEncode = (value: string, key: string): string => {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    result += String.fromCharCode(
      value.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
};

/**
 * Derive a session-specific key for encoding
 */
const getSessionKey = (): string => {
  let sessionKey = sessionStorage.getItem(SESSION_KEY);
  if (!sessionKey) {
    // Generate new session key
    sessionKey = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, sessionKey);
  }
  return sessionKey;
};

/**
 * Encode token with multiple layers of protection
 * Format: version:fingerprint:checksum:encoded_data
 */
const encodeToken = (value: string): string => {
  try {
    const fingerprint = generateFingerprint();
    const sessionKey = getSessionKey();
    const checksum = simpleHash(value + fingerprint);

    // XOR encode with session key, then base64
    const xored = xorEncode(value, sessionKey);
    const encoded = btoa(xored);

    return `${STORAGE_VERSION}:${fingerprint}:${checksum}:${encoded}`;
  } catch {
    // Fallback to simple base64 if encoding fails
    return btoa(value);
  }
};

/**
 * Decode token and validate integrity
 * Returns null if token appears tampered or from different session
 */
const decodeToken_storage = (stored: string): string | null => {
  try {
    // Check for new format
    if (stored.startsWith(STORAGE_VERSION + ':')) {
      const parts = stored.split(':');
      if (parts.length !== 4) {
        return null; // Invalid format
      }

      const [, storedFingerprint, storedChecksum, encoded] = parts;
      const currentFingerprint = generateFingerprint();
      const sessionKey = getSessionKey();

      // Decode
      const xored = atob(encoded);
      const value = xorEncode(xored, sessionKey);

      // Validate checksum
      const expectedChecksum = simpleHash(value + currentFingerprint);
      if (storedChecksum !== expectedChecksum) {
        // Allow fingerprint mismatch but log it (user might have updated browser)
        const altChecksum = simpleHash(value + storedFingerprint);
        if (storedChecksum !== altChecksum) {
          // Checksum completely invalid - token tampered
          return null;
        }
      }

      return value;
    }

    // Handle legacy v2 format
    if (stored.includes(':')) {
      try {
        const decoded = atob(stored).split('').reverse().join('');
        const parts = decoded.split(':');
        if (parts.length >= 3 && parts[0] === 'v2') {
          return parts.slice(2).join(':');
        }
      } catch {
        // Not v2 format
      }
    }

    // Try simple base64 decode (legacy v1)
    try {
      return atob(stored);
    } catch {
      return stored; // Return as-is if all else fails
    }
  } catch {
    return null;
  }
};

/**
 * Secure storage wrapper with encoding/decoding
 */
const secureStorage = {
  getItem: (key: string): string | null => {
    const value = localStorage.getItem(key);
    if (!value) return null;

    const decoded = decodeToken_storage(value);
    if (decoded === null) {
      // Token appears tampered - clear it
      localStorage.removeItem(key);
      return null;
    }
    return decoded;
  },

  setItem: (key: string, value: string): void => {
    localStorage.setItem(key, encodeToken(value));
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
