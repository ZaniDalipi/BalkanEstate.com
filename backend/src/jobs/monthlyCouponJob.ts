import cron from 'node-cron';
import { processMonthlyCouponRefresh } from '../services/monthlyCouponService';
import { sendMonthlyCouponEmail } from '../services/emailService';

/**
 * Monthly Coupon Refresh Cron Job
 *
 * Schedule:
 * - Runs on the 1st of every month at 9:00 AM UTC
 * - Refreshes promotion coupons for all Pro users
 * - Refreshes promotion coupons for all Agency users
 * - Sends email notifications to all subscribers about their new coupons
 *
 * Cron expression: '0 9 1 * *'
 * - 0: minute 0
 * - 9: hour 9 (9:00 AM UTC = 10:00 AM CET)
 * - 1: day 1 (1st of month)
 * - *: every month
 * - *: every day of week
 */

export const startMonthlyCouponJob = (): void => {
  // Run on the 1st of every month at 9:00 AM UTC
  cron.schedule('0 9 1 * *', async () => {
    console.log('[Cron Job] Starting monthly coupon refresh process...');

    try {
      const result = await processMonthlyCouponRefresh();

      console.log(`[Cron Job] Monthly coupon refresh completed:`);
      console.log(`  - Pro users refreshed: ${result.usersRefreshed}`);
      console.log(`  - Agencies refreshed: ${result.agenciesRefreshed}`);
      console.log(`  - Emails sent: ${result.emailsSent}`);

      if (result.errors.length > 0) {
        console.warn(`[Cron Job] ${result.errors.length} errors occurred during refresh`);
      }
    } catch (error) {
      console.error('[Cron Job] Error processing monthly coupon refresh:', error);
    }
  });

  console.log('[Cron Job] Monthly coupon refresh job scheduled (1st of each month at 9:00 AM UTC)');
};

// Export for manual execution (useful for testing)
export const runMonthlyCouponRefreshManually = async (): Promise<void> => {
  console.log('[Manual] Running monthly coupon refresh...');
  const result = await processMonthlyCouponRefresh();
  console.log(`[Manual] Result:`, result);
};

/**
 * Send a test monthly coupon email to a specific address
 * Used for testing the email template
 */
export const sendTestMonthlyCouponEmail = async (email: string, userName: string): Promise<void> => {
  console.log(`[Test] Sending test monthly coupon email to ${email}...`);

  await sendMonthlyCouponEmail({
    email,
    userName,
    planName: 'Pro Yearly',
    totalCoupons: 5,
    newCoupons: 3,
    rolledOver: 2,
    breakdown: {
      highlighted: 2,
      premium: 1,
      featured: 0,
    },
  });

  console.log(`[Test] Test email sent to ${email}`);
};

/**
 * Send a test agency monthly coupon email
 */
export const sendTestAgencyCouponEmail = async (email: string, userName: string, agencyName: string): Promise<void> => {
  console.log(`[Test] Sending test agency coupon email to ${email}...`);

  await sendMonthlyCouponEmail({
    email,
    userName,
    planName: 'Enterprise',
    totalCoupons: 5,
    newCoupons: 5,
    rolledOver: 0,
    breakdown: {
      highlighted: 2,
      premium: 2,
      featured: 1,
    },
    isAgency: true,
    agencyName,
  });

  console.log(`[Test] Test agency email sent to ${email}`);
};
