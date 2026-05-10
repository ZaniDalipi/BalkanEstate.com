/**
 * Token Management Service
 * Handles secure storage and retrieval of auth tokens with proactive refresh
 *
 * Security model:
 * - Access token: stored IN-MEMORY ONLY (not in localStorage/sessionStorage)
 *   This prevents XSS attacks from stealing tokens via storage APIs.
 *   Trade-off: token is lost on page refresh, but silently restored via
 *   the httpOnly refresh token cookie.
 * - Refresh token: httpOnly cookie ONLY (set by backend, never accessible to JS)
 * - Automatic token expiry validation
 * - Proactive refresh before expiry
 * - Silent refresh on page load to restore session after refresh/navigation
 */

import { API_URL } from './config';

const LEGACY_ACCESS_TOKEN_KEY = 'balkan_estate_token';
const LEGACY_REFRESH_TOKEN_KEY = 'balkan_estate_refresh_token';
const LEGACY_SESSION_KEY = 'balkan_estate_session';
const SESSION_HINT_KEY = 'balkan_estate_has_session';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let isRefreshing = false;
let onSessionExpired: (() => void) | null = null;
// Tracks whether the user ever had a valid access token in this page session.
// Used to suppress the "Session Expired" modal on first visit when no
// refresh cookie exists (the refresh call fails, but there was no session).
let hadActiveSession = false;

// Must match REFRESH_TOKEN_TTL_MS in backend/src/config/authConstants.ts
// That file is the single source of truth — update there first if the TTL changes.
const SESSION_HINT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if the user has a likely-valid refresh cookie.
 * Stores a timestamp alongside the hint so we can skip the refresh
 * call once the httpOnly cookie has almost certainly expired,
 * preventing the 400 "Refresh token is required" console error.
 */
export const hasLikelyValidSession = (): boolean => hasSessionHint();

const hasSessionHint = (): boolean => {
  try {
    const raw = localStorage.getItem(SESSION_HINT_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Number.isNaN(ts)) {
      // Legacy '1' value — clear it and don't attempt refresh
      localStorage.removeItem(SESSION_HINT_KEY);
      return false;
    }
    return Date.now() - ts < SESSION_HINT_MAX_AGE_MS;
  } catch {
    return false;
  }
};

const setSessionHint = (): void => {
  try {
    localStorage.setItem(SESSION_HINT_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
};

const clearSessionHint = (): void => {
  try {
    localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Ignore storage errors
  }
};

/**
 * In-memory token storage.
 * This is the ONLY place the access token lives on the client.
 * XSS cannot steal it from localStorage/sessionStorage because it's not there.
 */
let inMemoryAccessToken: string | null = null;

/**
 * Clear any legacy tokens from localStorage/sessionStorage.
 * Called once on init to migrate users off the old storage model.
 */
const clearLegacyStorage = (): void => {
  try {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Ignore storage errors (e.g. in SSR or restricted environments)
  }
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

  isRefreshing = true;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 8000);

  try {
    // Refresh token is sent via httpOnly cookie automatically
    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: abortController.signal,
    });

    if (!response.ok) {
      tokenService.clearTokens();
      // Only show "Session Expired" if the user actually had a session.
      // On first visit there's no refresh cookie, so the call fails —
      // but there was never a session to expire.
      if (hadActiveSession) {
        onSessionExpired?.();
      }
      return false;
    }

    const data = await response.json();
    if (data.accessToken) {
      tokenService.setAccessToken(data.accessToken);
      // Refresh token is handled entirely via httpOnly cookie by the backend.
      // We never store it client-side.
      scheduleRefresh(data.accessToken);
      return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
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
  /**
   * Get the current access token from memory.
   * Returns null if no token is available (user not logged in or page just loaded).
   */
  getAccessToken: (): string | null => {
    return inMemoryAccessToken;
  },

  /**
   * Store access token in memory only.
   * The token is NOT written to localStorage/sessionStorage.
   */
  setAccessToken: (token: string): void => {
    inMemoryAccessToken = token;
    hadActiveSession = true;
    setSessionHint();
    scheduleRefresh(token);
  },

  /**
   * @deprecated Refresh token is handled entirely via httpOnly cookie.
   * This method is kept for backward compatibility but is a no-op.
   */
  getRefreshToken: (): string | null => {
    return null;
  },

  /**
   * @deprecated Refresh token is handled entirely via httpOnly cookie.
   * This method is kept for backward compatibility but is a no-op.
   */
  setRefreshToken: (_token: string): void => {
    // No-op: refresh token lives only in httpOnly cookie set by the backend.
    // We never store it client-side.
  },

  clearTokens: (): void => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    inMemoryAccessToken = null;
    // Clear any legacy tokens that may still exist from before this migration
    clearLegacyStorage();
    // Clear session hint so next visit doesn't attempt a pointless refresh
    clearSessionHint();
  },

  hasValidToken: (): boolean => {
    if (!inMemoryAccessToken) return false;

    // Check if token is not expired
    const decoded = decodeToken(inMemoryAccessToken);
    if (!decoded?.exp) return false;

    return decoded.exp * 1000 > Date.now();
  },

  // Check if token needs refresh soon
  needsRefresh: (): boolean => {
    if (!inMemoryAccessToken) return false;
    return isTokenExpiringSoon(inMemoryAccessToken);
  },

  /**
   * Initialize token management on app start.
   * 1. Clears any legacy localStorage tokens (migration)
   * 2. Attempts a silent refresh via the httpOnly cookie to restore the session
   * 3. Schedules proactive refresh for the restored token
   */
  initializeProactiveRefresh: (): void => {
    // Step 1: Clear legacy storage from previous versions
    clearLegacyStorage();

    // Step 2: If we already have a token in memory (e.g. just logged in), schedule refresh
    if (inMemoryAccessToken && !isTokenExpiringSoon(inMemoryAccessToken)) {
      scheduleRefresh(inMemoryAccessToken);
    } else if (hasSessionHint()) {
      // Only attempt silent refresh if the user has logged in before on this browser.
      // This avoids a pointless POST /auth/refresh-token that returns 400 for
      // users who have never authenticated (e.g. first visit, incognito).
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
    if (!inMemoryAccessToken) return null;

    const decoded = decodeToken(inMemoryAccessToken);
    if (!decoded?.exp) return null;

    return new Date(decoded.exp * 1000);
  },
};
