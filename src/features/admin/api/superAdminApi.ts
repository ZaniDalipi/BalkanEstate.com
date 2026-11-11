/** Claiming the site's first super admin role from the admin panel. */
import { apiRequest } from '@/src/shared/api';

export interface SuperAdminStatus {
  superAdminCount: number;
  /** True only for an admin while the site has no super admin. */
  canClaim: boolean;
}

export const getSuperAdminStatus = (): Promise<SuperAdminStatus> =>
  apiRequest<SuperAdminStatus>('/admin/super-admin/status', { requiresAuth: true });

export const claimSuperAdmin = (): Promise<{ message: string; user: { role: string } }> =>
  apiRequest('/admin/super-admin/claim', { method: 'POST', requiresAuth: true });
