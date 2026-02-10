// HTTP Client with automatic token refresh
// Core HTTP client used by all feature API modules

import { API_URL } from './config';
import { tokenService } from './tokenService';
import { generateResponseKey, decryptResponse, invalidatePublicKey } from './payloadEncryption';

export interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

// Refresh the access token using the refresh token
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = tokenService.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
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
  const { method = 'GET', body, headers = {}, requiresAuth = false } = options;

  // Generate AES key for response encryption on every request
  const keyInfo = await generateResponseKey();

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
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
        try { error = await decryptResponse(rawError, keyInfo.rawKey); } catch { invalidatePublicKey(); }
      }
      const err: any = new Error(error.message || 'An error occurred');
      err.code = error.code || null;
      err.statusCode = response.status;
      err.details = error;
      throw err;
    }

    const rawData = isJson ? await response.json() : ({} as any);

    if (keyInfo && rawData?.__encrypted) {
      try {
        return await decryptResponse(rawData, keyInfo.rawKey) as T;
      } catch {
        invalidatePublicKey();
        return apiRequest<T>(endpoint, options, retryCount);
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
  retryCount = 0
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

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && retryCount === 0) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      return uploadRequest<T>(endpoint, formData, 1);
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
