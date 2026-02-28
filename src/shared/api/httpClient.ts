// HTTP Client with automatic token refresh
// Core HTTP client used by all feature API modules

import { API_URL } from './config';
import { tokenService } from './tokenService';
import {
  generateResponseKey,
  decryptResponse,
  invalidatePublicKey,
  type ResponseKeyInfo,
} from './payloadEncryption';

/**
 * Read the CSRF token from the __csrf cookie set by the backend.
 * Used for double-submit cookie CSRF protection: the value must be
 * included in the X-CSRF-Token header on every mutation request.
 */
export const getCsrfToken = (): string | undefined => {
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]*)/);
  return match ? match[1] : undefined;
};

/** Return the X-CSRF-Token header object (empty if cookie not set). */
export const csrfHeaders = (): Record<string, string> => {
  const t = getCsrfToken();
  return t ? { 'X-CSRF-Token': t } : {};
};

/** HTTP methods that mutate state and require a CSRF token */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Ensure the __csrf cookie is set before sending a mutation.
 * The cookie is set by the backend on any GET response. If it's
 * absent (first visit, expired, cleared), one GET to /health
 * bootstraps it so subsequent POSTs pass CSRF validation.
 */
let _csrfBootstrap: Promise<void> | null = null;
export const ensureCsrfToken = (): Promise<void> => {
  if (getCsrfToken()) return Promise.resolve();
  if (!_csrfBootstrap) {
    _csrfBootstrap = fetch(`${API_URL}/health`, { credentials: 'include' })
      .catch(() => {/* ignore errors — worst case CSRF header is absent */})
      .finally(() => { _csrfBootstrap = null; }) as Promise<void>;
  }
  return _csrfBootstrap;
};

export interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  /** Encrypt the server response (only use for sensitive endpoints like auth, profile) */
  encryptResponse?: boolean;
}

// Refresh the access token using the refresh token (sent via httpOnly cookie)
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include', // Sends httpOnly cookie automatically
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.accessToken) {
      tokenService.setAccessToken(data.accessToken);
      if (data.refreshToken) {
        tokenService.setRefreshToken(data.refreshToken);
      }
      return data.accessToken;
    }

    return null;
  } catch {
    return null;
  }
};

// Main API request function
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {},
  retryCount = 0
): Promise<T> => {
  const { method = 'GET', body, headers = {}, requiresAuth = false, encryptResponse: shouldEncrypt = false } = options;

  // Only generate response encryption key for sensitive endpoints
  let keyInfo: ResponseKeyInfo | null = null;
  if (shouldEncrypt) {
    keyInfo = await generateResponseKey();
  }

  // Ensure the CSRF cookie is present before any mutation
  if (MUTATION_METHODS.has(method)) {
    await ensureCsrfToken();
  }

  // Include CSRF token on mutation requests (double-submit cookie pattern)
  const csrfHeaders: Record<string, string> = {};
  if (MUTATION_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      csrfHeaders['X-CSRF-Token'] = csrfToken;
    }
  }

  const config: RequestInit = {
    method,
    credentials: 'include', // Send httpOnly cookies (refresh token)
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
      ...headers,
      ...(keyInfo ? { 'X-Response-Key': keyInfo.encryptedKeyBase64 } : {}),
    },
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = tokenService.getAccessToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  // Add body if present
  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && requiresAuth && retryCount === 0) {
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        return apiRequest<T>(endpoint, options, 1);
      } else {
        tokenService.clearTokens();
        // Emit custom event for session expiration
        window.dispatchEvent(new CustomEvent('session-expired'));
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const rawError = isJson ? await response.json() : { message: response.statusText };
      let error = rawError;
      if (keyInfo && rawError?.__encrypted) {
        try { error = await decryptResponse(rawError, keyInfo.rawKey); } catch { /* use raw */ }
      }
      const err: any = new Error(error.message || 'An error occurred');
      err.code = error.code || null;
      err.statusCode = response.status;
      err.details = error;
      throw err;
    }

    const rawData = isJson ? await response.json() : ({} as any);

    // Decrypt response if it came back encrypted
    if (keyInfo && rawData?.__encrypted) {
      try {
        return await decryptResponse(rawData, keyInfo.rawKey) as T;
      } catch {
        // Key mismatch (server restarted?) — invalidate and retry once
        invalidatePublicKey();
        if (retryCount === 0) {
          return apiRequest<T>(endpoint, options, 1);
        }
        return rawData as T;
      }
    }

    return rawData as T;
  } catch (error: any) {
    throw error;
  }
};

// Helper for file uploads with automatic token refresh
export const uploadRequest = async <T>(
  endpoint: string,
  formData: FormData,
  retryCount = 0,
  method: 'POST' | 'PUT' = 'POST'
): Promise<T> => {
  let token = tokenService.getAccessToken();
  if (!token) {
    // Try to refresh the token before giving up
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
    } else {
      tokenService.clearTokens();
      window.dispatchEvent(new CustomEvent('session-expired'));
      throw new Error('Not authorized. Please login again.');
    }
  }

  // Ensure the CSRF cookie is present before upload mutations
  await ensureCsrfToken();

  // Include CSRF token for upload mutations (double-submit cookie pattern)
  const csrfToken = getCsrfToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: formData,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retryCount === 0) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      return uploadRequest<T>(endpoint, formData, 1, method);
    } else {
      tokenService.clearTokens();
      // Emit custom event for session expiration
      window.dispatchEvent(new CustomEvent('session-expired'));
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Upload failed');
  }

  return response.json();
};
