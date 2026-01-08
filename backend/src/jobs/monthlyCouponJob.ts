import cron from 'node-cron';
import { processMonthlyCouponRefresh } from '../services/monthlyCouponService';

/**
 * Monthly Coupon Refresh Cron Job
 *
 * Schedule:
 * - Runs on the 1st of every month at 00:05 AM UTC
 * - Refreshes promotion coupons for all Pro users
 * - Refreshes promotion coupons for all Agency users
 * - Sends email notifications to all subscribers about their new coupons
 *
 * Cron expression: '5 0 1 * *'
 * - 5: minute 5
 * - 0: hour 0 (midnight)
 * - 1: day 1 (1st of month)
 * - *: every month
 * - *: every day of week
 */

export const startMonthlyCouponJob = (): void => {
  // Run on the 1st of every month at 00:05 AM UTC
  cron.schedule('5 0 1 * *', async () => {
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

  console.log('[Cron Job] Monthly coupon refresh job scheduled (1st of each month at 00:05 UTC)');
};

// Export for manual execution (useful for testing)
export const runMonthlyCouponRefreshManually = async (): Promise<void> => {
  console.log('[Manual] Running monthly coupon refresh...');
  const result = await processMonthlyCouponRefresh();
  console.log(`[Manual] Result:`, result);
};
