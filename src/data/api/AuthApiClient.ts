// Auth API Client
// Handles all authentication-related API calls

import { httpClient } from './httpClient';

export class AuthApiClient {
  async login(emailOrPhone: string, password: string): Promise<any> {
    const isEmail = emailOrPhone.includes('@');
    const body = isEmail
      ? { email: emailOrPhone, password }
      : { phone: emailOrPhone, password };

    return await httpClient.post('/auth/login', body);
  }

  async signup(data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    role: string;
    licenseNumber?: string;
    agencyInvitationCode?: string;
  }): Promise<any> {
    return await httpClient.post('/auth/signup', data);
  }

  async logout(): Promise<void> {
    await httpClient.post('/auth/logout', undefined, true);
  }

  async getCurrentUser(): Promise<any> {
    return await httpClient.get('/auth/me', true);
  }

  async requestPasswordReset(email: string): Promise<any> {
    return await httpClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<any> {
    return await httpClient.post('/auth/reset-password', { token, newPassword });
  }

  async getOAuthProviders(): Promise<any> {
    try {
      return await httpClient.get('/auth/oauth/providers');
    } catch (error) {
      return { providers: { google: false, facebook: false, apple: false } };
    }
  }

  getOAuthUrl(provider: 'google' | 'facebook' | 'apple'): string {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}/api/auth/${provider}`;
  }

  async verifyPhone(phone: string, code: string): Promise<any> {
    return await httpClient.post('/auth/verify-phone', { phone, code });
  }

  async updateProfile(userData: any): Promise<any> {
    return await httpClient.put('/auth/profile', userData, true);
  }

  async switchRole(role: string, licenseData?: any): Promise<any> {
    return await httpClient.post('/auth/switch-role', { role, ...licenseData }, true);
  }
}

export const authApiClient = new AuthApiClient();
