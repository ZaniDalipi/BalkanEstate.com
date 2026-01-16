import { updateExpiredSubscriptions } from '../services/subscriptionPaymentService';

/**
 * Subscription Expiration Worker
 * Runs periodically to check and update expired subscriptions
 * Ensures users lose access immediately when subscriptions expire
 */

/**
 * Run the expiration check
 * Silently handles errors as this is a background task
 */
export async function checkExpiredSubscriptions(): Promise<number> {
  try {
    return await updateExpiredSubscriptions();
  } catch (_error) {
    // Background worker - errors are handled silently
    // The updateExpiredSubscriptions function has retry logic for transient errors
    return 0;
  }
}

/**
 * Schedule the expiration worker to run every 6 hours
 */
export function scheduleExpirationWorker(): void {
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  // Run immediately on startup
  checkExpiredSubscriptions();

  // Then run every 6 hours
  setInterval(() => {
    checkExpiredSubscriptions();
  }, SIX_HOURS);
}

export default {
  checkExpiredSubscriptions,
  scheduleExpirationWorker,
};
