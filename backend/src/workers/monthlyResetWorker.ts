import cron from 'node-cron';
import User from '../models/User';
import { logger } from '../utils/logger';

/**
 * Monthly Reset Worker
 *
 * Cron job that runs at 00:00 UTC on the 1st of each month.
 * Resets the monthly listing counter for all subscribed users.
 */

export function startMonthlyResetWorker(): void {
  // Run at 00:00 UTC on the 1st of each month (0 0 1 * *)
  cron.schedule('0 0 1 * *', async () => {
    try {
      logger.info('Starting monthly reset worker');

      const now = new Date();

      // Reset counters for all subscribed users
      const result = await User.updateMany(
        { isSubscribed: true },
        {
          $set: {
            'subscription.listingsCreatedThisMonth': 0,
            'subscription.monthResetDate': now,
          },
        }
      );

      logger.info('Monthly reset completed', {
        modifiedCount: result.modifiedCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error in monthly reset worker', {
        error: error?.message || String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  logger.info('Monthly reset worker started (monthly at 00:00 UTC on the 1st)');
}
