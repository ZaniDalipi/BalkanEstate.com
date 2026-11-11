/** The admin's authenticator app and the emailed codes that confirm admin role grants. */
import { apiRequest } from '@/src/shared/api';

export interface AuthenticatorStatus {
  enabled: boolean;
  enabledAt?: string;
}

export interface EmailCodeSent {
  challengeId: string;
  /** Masked address the code went to, e.g. "bo••@example.com". */
  sentTo: string;
  expiresAt: string;
}

export interface AuthenticatorSetupStart extends EmailCodeSent {
  /** Base32 key, for typing into the app by hand. */
  secret: string;
  /** otpauth:// link the QR code holds. */
  otpauthUri: string;
}

export const getAuthenticatorStatus = (): Promise<AuthenticatorStatus> =>
  apiRequest('/admin/security/authenticator', { requiresAuth: true });

export const startAuthenticatorSetup = (): Promise<AuthenticatorSetupStart> =>
  apiRequest('/admin/security/authenticator/setup', { method: 'POST', requiresAuth: true });

export const confirmAuthenticatorSetup = (input: { challengeId: string; emailCode: string; appCode: string }): Promise<AuthenticatorStatus> =>
  apiRequest('/admin/security/authenticator/confirm', { method: 'POST', body: input, requiresAuth: true });

export const resetUserAuthenticator = (userId: string): Promise<{ message: string }> =>
  apiRequest(`/admin/users/${userId}/authenticator`, { method: 'DELETE', requiresAuth: true });

export const requestRoleEmailCode = (userId: string, role: string): Promise<EmailCodeSent> =>
  apiRequest(`/admin/users/${userId}/role/email-code`, { method: 'POST', body: { role }, requiresAuth: true });

export const requestClaimEmailCode = (): Promise<EmailCodeSent> =>
  apiRequest('/admin/super-admin/claim/email-code', { method: 'POST', requiresAuth: true });
