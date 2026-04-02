import { updateExpiredSubscriptions, checkExpiringSoonSubscriptions } from '../services/subscriptionPaymentService';

/**
 * Subscription Expiration Worker
 * - Every 6 hours: marks expired subscriptions and sends expiry emails
 * - Every 1 hour: sends 5-hour-before-expiry warning emails/notifications
 */

export async function checkExpiredSubscriptions(): Promise<number> {
  try {
    return await updateExpiredSubscriptions();
  } catch (_error) {
    return 0;
  }
}

async function checkExpiringSoon(): Promise<void> {
  try {
    await checkExpiringSoonSubscriptions();
  } catch (_error) {
    // Background worker — silently ignore errors
  }
}

/**
 * Schedule the expiration worker:
 *   - Runs expired-subscription check every 6 hours
 *   - Runs expiring-soon (5h) check every 1 hour
 */
export function scheduleExpirationWorker(): void {
  const ONE_HOUR = 60 * 60 * 1000;
  const SIX_HOURS = 6 * ONE_HOUR;

  // Run both immediately on startup
  checkExpiredSubscriptions();
  checkExpiringSoon();

  // Expired check every 6 hours
  setInterval(() => {
    checkExpiredSubscriptions();
  }, SIX_HOURS);

  // Expiring-soon check every hour
  setInterval(() => {
    checkExpiringSoon();
  }, ONE_HOUR);
}

export default {
  checkExpiredSubscriptions,
  scheduleExpirationWorker,
};
