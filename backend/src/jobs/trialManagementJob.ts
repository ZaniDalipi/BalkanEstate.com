import cron from 'node-cron';
import { processTrialManagement } from '../services/trialManagementService';
import { cleanupAllExpiredTokens } from '../services/refreshTokenService';
import { cronLogger } from '../utils/logger';

/**
 * Trial Management Cron Job
 *
 * Schedule:
 * - Runs daily at 9:00 AM UTC
 * - Sends reminders to users whose trials expire in 3 days
 * - Expires trials and downgrades users automatically
 * - Cleans up expired refresh tokens
 *
 * To use a different schedule, modify the cron expression below.
 * Format: second minute hour day month weekday
 * Examples: Daily at 9AM, Every 6 hours, Daily at midnight
 */

export const startTrialManagementJob = (): void => {
  // Run daily at 9:00 AM UTC
  cron.schedule('0 9 * * *', async () => {
    cronLogger.info('[Cron Job] Starting trial management process...');

    try {
      const result = await processTrialManagement();

      cronLogger.info(`[Cron Job] Trial management completed:`);
      cronLogger.info(`  - Reminders sent: ${result.remindersSent}`);
      cronLogger.info(`  - Trials expired: ${result.trialsExpired}`);
    } catch (error) {
      cronLogger.error('[Cron Job] Error processing trial management:', error);
    }
  });

  // Clean up expired refresh tokens every 12 hours
  cron.schedule('0 */12 * * *', async () => {
    cronLogger.info('[Cron Job] Cleaning up expired refresh tokens...');

    try {
      const cleanedCount = await cleanupAllExpiredTokens();
      cronLogger.info(`[Cron Job] Cleaned up ${cleanedCount} expired refresh tokens`);
    } catch (error) {
      cronLogger.error('[Cron Job] Error cleaning up refresh tokens:', error);
    }
  });

  cronLogger.info('[Cron Job] Trial management job scheduled');
  cronLogger.info('[Cron Job] Token cleanup job scheduled');
};

// Export for manual execution (useful for testing)
export const runTrialManagementManually = async (): Promise<void> => {
  cronLogger.info('[Manual] Running trial management...');
  const result = await processTrialManagement();
  cronLogger.info(`[Manual] Result:`, result);
};

export const runTokenCleanupManually = async (): Promise<void> => {
  cronLogger.info('[Manual] Running token cleanup...');
  const cleanedCount = await cleanupAllExpiredTokens();
  cronLogger.info(`[Manual] Cleaned up ${cleanedCount} tokens`);
};
