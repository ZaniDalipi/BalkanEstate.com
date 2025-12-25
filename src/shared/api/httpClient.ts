// HTTP Client with automatic token refresh
// Core HTTP client used by all feature API modules

import { API_URL } from './config';
import { tokenService } from './tokenService';

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
  } catch (error) {
    console.error('Token refresh error:', error);
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

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
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
      console.log('Access token expired, attempting to refresh...');
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        console.log('Token refreshed successfully, retrying request...');
        return apiRequest<T>(endpoint, options, 1);
      } else {
        console.log('Token refresh failed, logging out...');
        tokenService.clearTokens();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const error = isJson ? await response.json() : { message: response.statusText };
      const err: any = new Error(error.message || 'An error occurred');
      err.code = error.code || null;
      err.statusCode = response.status;
      err.details = error;
      throw err;
    }

    return isJson ? await response.json() : ({} as T);
  } catch (error: any) {
    console.error('API request error:', error);
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
    throw new Error('Not authorized. Please login again.');
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
    console.log('Access token expired during upload, attempting to refresh...');
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      console.log('Token refreshed successfully, retrying upload...');
      return uploadRequest<T>(endpoint, formData, 1);
    } else {
      console.log('Token refresh failed, logging out...');
      tokenService.clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Upload failed');
  }

  return response.json();
};
