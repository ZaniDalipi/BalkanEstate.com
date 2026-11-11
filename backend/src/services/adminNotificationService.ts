import User from '../models/User';
import SystemSettings from '../models/SystemSettings';
import emailService, { sendEmail } from './emailService';
import { createNotificationWithPush } from './engagementService';
import { adminLogger } from '../utils/logger';
import {
  AdminAlertEvent,
  AlertRecipientSource,
  buildAdminAlert,
  isAlertEnabled,
  resolveAlertRecipients,
} from '../utils/adminAlert';

/**
 * Tell the site's admins about something that just happened (a new user, a
 * new listing, an admin role change), by email and as an in-app + push
 * notification.
 *
 * Settings:
 *  - Admin panel › Settings › Notifications: who gets the emails, and the
 *    "New user" / "New property" switches.
 *  - Backend env, used when the panel list is empty: ADMIN_NOTIFICATION_EMAILS,
 *    then ADMIN_REPORT_EMAILS; with neither, every admin account's email.
 *  - ADMIN_NOTIFICATIONS=off on the server turns all of it off.
 *
 * Never throws and never blocks the request that triggered it.
 */

const ADMIN_ROLES = ['admin', 'super_admin'];

const siteUrl = (): string => process.env.FRONTEND_URL || 'https://balkanestateai.com';
const envEmails = (): string | undefined => process.env.ADMIN_NOTIFICATION_EMAILS || process.env.ADMIN_REPORT_EMAILS;
export const adminAlertsOff = (): boolean => (process.env.ADMIN_NOTIFICATIONS || '').toLowerCase() === 'off';

async function adminAccounts(): Promise<Array<{ _id: unknown; email: string }>> {
  return User.find({ role: { $in: ADMIN_ROLES } }).select('_id email').lean<Array<{ _id: unknown; email: string }>>();
}

/** The list set in the panel, who actually gets the emails now, and the switches. */
export async function adminAlertSettings() {
  const [settings, admins] = await Promise.all([SystemSettings.getSettings(), adminAccounts()]);
  const panelEmails = settings.adminNotificationEmails ?? [];
  const { recipients, source } = resolveAlertRecipients({
    panel: panelEmails,
    env: envEmails(),
    adminAccountEmails: admins.map((a) => a.email),
  });
  return {
    panelEmails,
    recipients,
    source,
    admins,
    notifyNewUser: settings.notifyNewUser,
    notifyNewProperty: settings.notifyNewProperty,
    disabled: adminAlertsOff(),
  };
}

async function deliver(event: AdminAlertEvent): Promise<void> {
  const settings = await adminAlertSettings();
  if (!isAlertEnabled(event.kind, settings)) return;

  const alert = buildAdminAlert(event, siteUrl());
  const results = await Promise.allSettled([
    ...settings.recipients.map((to) =>
      sendEmail({ to, subject: alert.subject, html: alert.html, text: alert.text, category: 'alerts' })
    ),
    ...settings.admins.map((admin) =>
      createNotificationWithPush({
        userId: String(admin._id),
        type: 'admin_alert',
        title: alert.title,
        message: alert.message,
        priority: 'normal',
        data: { actionUrl: alert.actionUrl, adminEvent: event.kind },
      })
    ),
  ]);

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    adminLogger.error(`⚠️ ${failed.length} admin alert(s) failed for ${event.kind}:`, (failed[0] as PromiseRejectedResult).reason);
  }
}

export function notifyAdmins(event: AdminAlertEvent): void {
  if (adminAlertsOff()) return;
  deliver(event).catch((error) => adminLogger.error(`⚠️ Admin alert failed for ${event.kind}:`, error));
}

export type TestAlertResult =
  | { ok: true; sent: string[]; failed: string[]; source: AlertRecipientSource }
  | { ok: false; reason: 'NO_EMAIL_PROVIDER' | 'NO_RECIPIENTS' };

/** Send a sample alert to everyone who would get one now, and say who got it. */
export async function sendTestAdminAlert(requestedBy: string): Promise<TestAlertResult> {
  // Without a provider the email service only logs, so a "sent" would be untrue.
  if (!emailService.isConfigured) return { ok: false, reason: 'NO_EMAIL_PROVIDER' };
  const settings = await adminAlertSettings();
  if (settings.recipients.length === 0) return { ok: false, reason: 'NO_RECIPIENTS' };
  const alert = buildAdminAlert(
    {
      kind: 'user_registered',
      userId: 'test',
      name: 'Test alert',
      email: 'test@example.com',
      role: 'buyer',
      provider: `test sent by ${requestedBy}`,
    },
    siteUrl()
  );
  const subject = `[Test] ${alert.subject}`;
  const results = await Promise.allSettled(
    settings.recipients.map((to) =>
      emailService.sendEmailDirect({ to, subject, html: alert.html, text: alert.text, category: 'alerts' })
    )
  );
  const sent: string[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => (r.status === 'fulfilled' ? sent : failed).push(settings.recipients[i]));
  if (failed.length > 0) adminLogger.error(`⚠️ Test admin alert failed for ${failed.join(', ')}`);
  return { ok: true, sent, failed, source: settings.source };
}
