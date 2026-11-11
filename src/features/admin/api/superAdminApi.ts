/** Claiming the site's first super admin role from the admin panel. */
import { apiRequest } from '@/src/shared/api';

export interface SuperAdminStatus {
  superAdminCount: number;
  /** True only for an admin while the site has no super admin. */
  canClaim: boolean;
}

export const getSuperAdminStatus = (): Promise<SuperAdminStatus> =>
  apiRequest<SuperAdminStatus>('/admin/super-admin/status', { requiresAuth: true });

/** Needs the code emailed by requestClaimEmailCode (and an authenticator code, asked for by the client). */
export const claimSuperAdmin = (confirmation: { challengeId: string; emailCode: string }): Promise<{ message: string; user: { role: string } }> =>
  apiRequest('/admin/super-admin/claim', { method: 'POST', body: confirmation, requiresAuth: true });
