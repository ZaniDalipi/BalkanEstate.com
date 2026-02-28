// Base HTTP Client
// Handles all HTTP requests with authentication
// Now delegates token management to the shared tokenService and
// supports httpOnly cookie credentials and response encryption.

import { API_URL } from '@/src/shared/api/config';
import { tokenService } from '@/src/shared/api/tokenService';
import {
  generateResponseKey,
  decryptResponse,
  invalidatePublicKey,
  encryptSensitiveFields,
  type ResponseKeyInfo,
} from '@/src/shared/api/payloadEncryption';

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  /** Encrypt the server response (for sensitive endpoints) */
  encryptResponse?: boolean;
  /** Fields in body to encrypt with RSA before sending */
  encryptFields?: string[];
}

export class HttpClient {
  private static instance: HttpClient;

  private constructor() {}

  static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  // Token management - delegates to shared tokenService
  getToken(): string | null {
    return tokenService.getAccessToken();
  }

  setToken(token: string): void {
    tokenService.setAccessToken(token);
  }

  removeToken(): void {
    tokenService.clearTokens();
  }

  // HTTP request method
  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      requiresAuth = false,
      encryptResponse: shouldEncrypt = false,
      encryptFields,
    } = config;

    // Generate response encryption key if requested
    let keyInfo: ResponseKeyInfo | null = null;
    if (shouldEncrypt) {
      keyInfo = await generateResponseKey();
    }

    // Encrypt sensitive request fields if specified
    let processedBody = body;
    if (encryptFields && body && typeof body === 'object') {
      processedBody = await encryptSensitiveFields(body, encryptFields);
    }

    const requestConfig: RequestInit = {
      method,
      credentials: 'include', // Send httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(keyInfo ? { 'X-Response-Key': keyInfo.encryptedKeyBase64 } : {}),
      },
    };

    // Add authorization header if required
    if (requiresAuth) {
      const token = this.getToken();
      if (token) {
        requestConfig.headers = {
          ...requestConfig.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    // Add body if present
    if (processedBody) {
      requestConfig.body = JSON.stringify(processedBody);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, requestConfig);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      if (!response.ok) {
        const rawError = isJson ? await response.json() : { message: response.statusText };
        let error = rawError;
        if (keyInfo && rawError?.__encrypted) {
          try { error = await decryptResponse(rawError, keyInfo.rawKey); } catch { /* use raw */ }
        }
        throw new Error(error.message || 'An error occurred');
      }

      const rawData = isJson ? await response.json() : ({} as any);

      // Decrypt response if encrypted
      if (keyInfo && rawData?.__encrypted) {
        try {
          return await decryptResponse(rawData, keyInfo.rawKey) as T;
        } catch {
          invalidatePublicKey();
          return rawData as T;
        }
      }

      return rawData as T;
    } catch (error) {
      throw error;
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, requiresAuth = false, encryptResponse = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth, encryptResponse });
  }

  async post<T>(endpoint: string, body?: any, requiresAuth = false, encryptResponse = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, requiresAuth, encryptResponse });
  }

  async put<T>(endpoint: string, body?: any, requiresAuth = false, encryptResponse = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, requiresAuth, encryptResponse });
  }

  async patch<T>(endpoint: string, body?: any, requiresAuth = false, encryptResponse = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, requiresAuth, encryptResponse });
  }

  async delete<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }

  // File upload method
  async uploadFile<T>(endpoint: string, formData: FormData, requiresAuth = true): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {};

    if (requiresAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const httpClient = HttpClient.getInstance();
