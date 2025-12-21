import { updateExpiredSubscriptions } from '../services/subscriptionPaymentService';

/**
 * Subscription Expiration Worker
 * Runs daily to check and update expired subscriptions
 * Ensures users lose access immediately when subscriptions expire
 */

/**
 * Run the expiration check
 */
export async function checkExpiredSubscriptions(): Promise<void> {
  try {
    console.log('🔍 Checking for expired subscriptions...');
    const count = await updateExpiredSubscriptions();
    console.log(`✅ Processed ${count} expired subscriptions`);
  } catch (error: any) {
    console.error('❌ Error checking expired subscriptions:', error);
  }
}

/**
 * Schedule the expiration worker to run daily
 */
export function scheduleExpirationWorker(): void {
  // Run every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  // Run immediately on startup
  checkExpiredSubscriptions();

  // Then run every 6 hours
  setInterval(() => {
    checkExpiredSubscriptions();
  }, SIX_HOURS);

  console.log('✅ Subscription expiration worker scheduled (every 6 hours)');
}

export default {
  checkExpiredSubscriptions,
  scheduleExpirationWorker,
};
