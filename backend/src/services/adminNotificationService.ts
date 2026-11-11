import User from '../models/User';
import { sendEmail } from './emailService';
import { createNotificationWithPush } from './engagementService';
import { adminLogger } from '../utils/logger';
import { AdminAlertEvent, buildAdminAlert, parseAdminEmails } from '../utils/adminAlert';

/**
 * Tell the site's admins about something that just happened (a new user, a
 * new listing), by email and as an in-app + push notification.
 *
 * Settings (backend env):
 *  - ADMIN_NOTIFICATION_EMAILS: comma-separated addresses that get the email.
 *    Falls back to ADMIN_REPORT_EMAILS, then to every admin account's email.
 *  - ADMIN_NOTIFICATIONS=off turns all of it off.
 *
 * Never throws and never blocks the request that triggered it.
 */

const ADMIN_ROLES = ['admin', 'super_admin'];

const siteUrl = (): string => process.env.FRONTEND_URL || 'https://balkanestateai.com';

async function adminAccounts(): Promise<Array<{ _id: unknown; email: string }>> {
  return User.find({ role: { $in: ADMIN_ROLES } }).select('_id email').lean<Array<{ _id: unknown; email: string }>>();
}

function configuredEmails(): string[] {
  return parseAdminEmails(process.env.ADMIN_NOTIFICATION_EMAILS || process.env.ADMIN_REPORT_EMAILS);
}

async function deliver(event: AdminAlertEvent): Promise<void> {
  const alert = buildAdminAlert(event, siteUrl());
  const admins = await adminAccounts();

  const configured = configuredEmails();
  const recipients = configured.length > 0 ? configured : parseAdminEmails(admins.map((a) => a.email).join(','));

  const results = await Promise.allSettled([
    ...recipients.map((to) =>
      sendEmail({ to, subject: alert.subject, html: alert.html, text: alert.text, category: 'alerts' })
    ),
    ...admins.map((admin) =>
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
  if ((process.env.ADMIN_NOTIFICATIONS || '').toLowerCase() === 'off') return;
  deliver(event).catch((error) => adminLogger.error(`⚠️ Admin alert failed for ${event.kind}:`, error));
}
