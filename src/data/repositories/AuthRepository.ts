// Auth Repository Implementation
// Implements IAuthRepository using AuthApiClient

import {
  IAuthRepository,
  LoginCredentials,
  SignupData,
  OAuthCredentials,
  PhoneVerificationData,
  AuthResponse,
} from '../../domain/repositories/IAuthRepository';
import { User } from '../../domain/entities/User';
import { authApiClient } from '../api/AuthApiClient';
import { httpClient } from '../api/httpClient';
import { UserMapper } from '../mappers/UserMapper';

export class AuthRepository implements IAuthRepository {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await authApiClient.login(credentials.email, credentials.password);

    // Store token
    httpClient.setToken(response.token);

    // Map user DTO to domain entity
    const user = UserMapper.toDomain(response.user);

    return { user, token: response.token };
  }

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await authApiClient.signup({
      email: data.email,
      password: data.password,
      name: data.name,
      phone: data.phone,
      role: data.role,
    });

    // Store token
    httpClient.setToken(response.token);

    // Map user DTO to domain entity
    const user = UserMapper.toDomain(response.user);

    return { user, token: response.token };
  }

  async loginWithOAuth(credentials: OAuthCredentials): Promise<AuthResponse> {
    // OAuth login is handled via redirect in browser
    // This method would be called after redirect back from OAuth provider
    throw new Error('OAuth login should use loginWithSocial redirect method');
  }

  async verifyPhone(data: PhoneVerificationData): Promise<AuthResponse> {
    const response = await authApiClient.verifyPhone(data.phone, data.code);

    if (response.token) {
      httpClient.setToken(response.token);
    }

    const user = UserMapper.toDomain(response.user);

    return { user, token: response.token || '' };
  }

  async logout(): Promise<void> {
    try {
      await authApiClient.logout();
    } finally {
      // Always remove token even if API call fails
      httpClient.removeToken();
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = httpClient.getToken();
    if (!token) return false;

    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const token = httpClient.getToken();
    if (!token) return null;

    try {
      const response = await authApiClient.getCurrentUser();
      return UserMapper.toDomain(response.user);
    } catch (error) {
      // If token is invalid, remove it
      httpClient.removeToken();
      return null;
    }
  }

  async refreshToken(): Promise<string> {
    // TODO: Implement token refresh endpoint
    throw new Error('Token refresh not yet implemented');
  }

  async requestPasswordReset(email: string): Promise<void> {
    await authApiClient.requestPasswordReset(email);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await authApiClient.resetPassword(token, newPassword);

    // Store new token
    if (response.token) {
      httpClient.setToken(response.token);
    }
  }
}

export const authRepository = new AuthRepository();
