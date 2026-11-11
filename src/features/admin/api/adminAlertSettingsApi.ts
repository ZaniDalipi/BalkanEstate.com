/** Who gets the admin alert emails (new users, new listings, admin role changes). */
import { apiRequest } from '@/src/shared/api';

export type AlertRecipientSource = 'panel' | 'env' | 'admins' | 'none';

export interface AdminAlertSettings {
  /** The list set in the panel; empty means "use the server setting". */
  emails: string[];
  /** Who actually gets the emails right now. */
  recipients: string[];
  source: AlertRecipientSource;
  notifyNewUser: boolean;
  notifyNewProperty: boolean;
  /** ADMIN_NOTIFICATIONS=off on the server. */
  disabled: boolean;
  canEdit: boolean;
  maxEmails: number;
}

export const getAdminAlertSettings = (): Promise<AdminAlertSettings> =>
  apiRequest<AdminAlertSettings>('/admin/alert-settings', { requiresAuth: true });

export const saveAdminAlertEmails = (emails: string[]): Promise<AdminAlertSettings> =>
  apiRequest<AdminAlertSettings>('/admin/alert-settings', { method: 'PUT', body: { emails }, requiresAuth: true });

export const sendTestAdminAlert = (): Promise<{ sent: string[]; failed: string[] }> =>
  apiRequest('/admin/alert-settings/test', { method: 'POST', requiresAuth: true });
