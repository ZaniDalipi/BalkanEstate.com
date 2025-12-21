// Domain Repository Interface: IAuthRepository
// Defines authentication data operations contract

import { User } from '../entities/User';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
}

export interface OAuthCredentials {
  provider: 'google' | 'facebook' | 'apple';
  token: string;
  name?: string;
  email?: string;
}

export interface PhoneVerificationData {
  phone: string;
  code: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Repository interface for authentication operations
 * Implementations should handle API calls, token storage, etc.
 */
export interface IAuthRepository {
  /**
   * Login with email and password
   */
  login(credentials: LoginCredentials): Promise<AuthResponse>;

  /**
   * Sign up a new user
   */
  signup(data: SignupData): Promise<AuthResponse>;

  /**
   * Login with OAuth provider
   */
  loginWithOAuth(credentials: OAuthCredentials): Promise<AuthResponse>;

  /**
   * Verify phone number with code
   */
  verifyPhone(data: PhoneVerificationData): Promise<AuthResponse>;

  /**
   * Logout current user
   */
  logout(): Promise<void>;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get current authenticated user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Refresh authentication token
   */
  refreshToken(): Promise<string>;

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Promise<void>;

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Promise<void>;
}
