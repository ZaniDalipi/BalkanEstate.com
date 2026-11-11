import { processMonthlyCouponRefresh } from '../services/monthlyCouponService';
import { sendMonthlyCouponEmail } from '../services/emailService';
import { cronLogger } from '../utils/logger';

/**
 * Monthly coupon helpers for manual/admin use.
 *
 * The scheduled refresh (1st of each month, 09:00 UTC) lives in `src/cron/index.ts`
 * only — it used to be scheduled here as well, which sent every coupon email twice.
 */

// Export for manual execution (useful for testing)
export const runMonthlyCouponRefreshManually = async (): Promise<void> => {
  cronLogger.info('[Manual] Running monthly coupon refresh...');
  const result = await processMonthlyCouponRefresh();
  cronLogger.info(`[Manual] Result:`, result);
};

/**
 * Send a test monthly coupon email to a specific address
 * Used for testing the email template
 */
export const sendTestMonthlyCouponEmail = async (email: string, userName: string): Promise<void> => {
  cronLogger.info(`[Test] Sending test monthly coupon email to ${email}...`);

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

  cronLogger.info(`[Test] Test email sent to ${email}`);
};

/**
 * Send a test agency monthly coupon email
 */
export const sendTestAgencyCouponEmail = async (email: string, userName: string, agencyName: string): Promise<void> => {
  cronLogger.info(`[Test] Sending test agency coupon email to ${email}...`);

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

  cronLogger.info(`[Test] Test agency email sent to ${email}`);
};
