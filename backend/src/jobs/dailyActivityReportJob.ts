import cron from 'node-cron';
import { activityLogger } from '../services/activityLogger';
import emailService from '../services/emailService';

/**
 * Daily Activity Report Job
 *
 * Sends a daily email summary of important platform activity to admins.
 * Runs every day at 8:00 AM.
 */

// Admin email(s) to receive daily reports
const getAdminEmails = (): string[] => {
  const emails = process.env.ADMIN_REPORT_EMAILS;
  if (!emails) return [];
  return emails.split(',').map((e) => e.trim()).filter(Boolean);
};

/**
 * Generate HTML email content for daily report
 */
function generateReportHtml(summary: Awaited<ReturnType<typeof activityLogger.getDailySummary>>): string {
  const {
    totalEvents,
    byCategory,
    bySeverity,
    recentCritical,
    newSignups,
    newSubscriptions,
    canceledSubscriptions,
    failedPayments,
    refunds,
    securityEvents,
  } = summary;

  const criticalSection = recentCritical.length > 0
    ? `
      <h3 style="color: #dc2626; margin-top: 20px;">⚠️ Critical Events</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr style="background: #fee2e2;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Time</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Action</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">User</th>
        </tr>
        ${recentCritical.map((event: any) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date(event.createdAt).toLocaleString()}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${event.action}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${event.userEmail || 'N/A'}</td>
          </tr>
        `).join('')}
      </table>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Activity Report - Balkan Estate</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
      <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #1f2937; margin-bottom: 20px;">📊 Daily Activity Report</h1>
        <p style="color: #6b7280;">Report for the last 24 hours</p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 20px;">
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #0369a1;">${newSignups}</div>
            <div style="color: #0369a1; font-size: 14px;">New Signups</div>
          </div>
          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #047857;">${newSubscriptions}</div>
            <div style="color: #047857; font-size: 14px;">New Subscriptions</div>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #b45309;">${canceledSubscriptions}</div>
            <div style="color: #b45309; font-size: 14px;">Cancellations</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px;">
          <div style="background: #fee2e2; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${failedPayments}</div>
            <div style="color: #dc2626; font-size: 14px;">Failed Payments</div>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #b45309;">${refunds}</div>
            <div style="color: #b45309; font-size: 14px;">Refunds</div>
          </div>
          <div style="background: #fce7f3; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #be185d;">${securityEvents}</div>
            <div style="color: #be185d; font-size: 14px;">Security Events</div>
          </div>
        </div>

        <h3 style="margin-top: 30px; color: #374151;">Activity by Category</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Category</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Events</th>
          </tr>
          ${Object.entries(byCategory).map(([cat, count]) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; text-transform: capitalize;">${cat}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${count}</td>
            </tr>
          `).join('')}
          <tr style="background: #f3f4f6; font-weight: bold;">
            <td style="padding: 10px; border: 1px solid #ddd;">Total</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${totalEvents}</td>
          </tr>
        </table>

        <h3 style="margin-top: 20px; color: #374151;">Events by Severity</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Severity</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Count</th>
          </tr>
          ${Object.entries(bySeverity).map(([sev, count]) => {
            const colors: Record<string, string> = {
              info: '#3b82f6',
              warning: '#f59e0b',
              error: '#ef4444',
              critical: '#dc2626',
            };
            return `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">
                  <span style="color: ${colors[sev] || '#374151'}; text-transform: capitalize;">${sev}</span>
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${count}</td>
              </tr>
            `;
          }).join('')}
        </table>

        ${criticalSection}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated report from Balkan Estate.<br>
            View detailed logs in the <a href="${process.env.FRONTEND_URL}/admin/activity-logs" style="color: #3b82f6;">Admin Dashboard</a>.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send daily activity report
 */
export async function sendDailyActivityReport(): Promise<void> {
  const adminEmails = getAdminEmails();

  if (adminEmails.length === 0) {
    return;
  }

  try {
    const summary = await activityLogger.getDailySummary();

    // Skip sending if no events
    if (summary.totalEvents === 0) {
      return;
    }

    const html = generateReportHtml(summary);
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Send to each admin
    for (const email of adminEmails) {
      await emailService.sendEmail({
        to: email,
        subject: `📊 Daily Activity Report - ${today}`,
        html,
      });
    }

    // Log that report was sent
    await activityLogger.log({
      category: 'system',
      action: 'daily_report_sent',
      metadata: {
        recipients: adminEmails,
        totalEvents: summary.totalEvents,
      },
    });
  } catch (error) {
    // Log error but don't throw
    await activityLogger.logSystemError('Failed to send daily activity report', { error: String(error) });
  }
}

/**
 * Initialize the daily report cron job
 * Runs every day at 8:00 AM
 */
export function initDailyActivityReportJob(): void {
  const schedule = process.env.DAILY_REPORT_SCHEDULE || '0 8 * * *'; // Default: 8:00 AM daily

  cron.schedule(schedule, async () => {
    await sendDailyActivityReport();
  });
}

/**
 * Manually trigger the daily report (for testing)
 */
export async function triggerDailyReportManually(): Promise<void> {
  await sendDailyActivityReport();
}

export default {
  sendDailyActivityReport,
  initDailyActivityReportJob,
  triggerDailyReportManually,
};
