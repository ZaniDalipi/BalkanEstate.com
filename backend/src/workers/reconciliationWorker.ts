import Subscription from '../models/Subscription';
import SubscriptionEvent from '../models/SubscriptionEvent';
import { getGooglePlayService } from '../services/googlePlayService';
import { getAppStoreService } from '../services/appStoreService';

/**
 * Daily reconciliation worker
 * Syncs all active subscriptions with their respective stores to ensure data accuracy
 */

interface ReconciliationResult {
  totalProcessed: number;
  updated: number;
  expired: number;
  errors: number;
  details: Array<{
    subscriptionId: string;
    status: string;
    message: string;
  }>;
}

/**
 * Run reconciliation for all active subscriptions
 * Handles transient errors with retry logic
 */
export async function runReconciliation(maxRetries = 3): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    totalProcessed: 0,
    updated: 0,
    expired: 0,
    errors: 0,
    details: [],
  };

  try {
    // Get all subscriptions that need reconciliation
    // Focus on active, grace period, and pending cancellation subscriptions
    const subscriptions = await Subscription.find({
      status: { $in: ['active', 'grace', 'pending_cancellation'] },
    });

    for (const subscription of subscriptions) {
      result.totalProcessed++;

      // Retry logic for individual subscription reconciliation
      // let lastError: any;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Skip web subscriptions (they don't need store validation)
          if (subscription.store === 'web' || subscription.store === 'stripe') {
            // Just check expiration date
            if (subscription.expirationDate < new Date()) {
              subscription.status = 'expired';
              await subscription.save();
              result.expired++;
              result.details.push({
                subscriptionId: String(subscription._id),
                status: 'expired',
                message: 'Web subscription expired',
              });
            }
            break;
          }

          

          // Reconcile Google Play subscriptions
          if (subscription.store === 'google' && subscription.purchaseToken) {
            await reconcileGooglePlaySubscription(subscription, result);
          }

          // Reconcile App Store subscriptions
          if (subscription.store === 'apple' && subscription.transactionId) {
            await reconcileAppStoreSubscription(subscription, result);
          }

          break; // Success - exit retry loop
        } catch (error: any) {
          // lastError = error;

          // Check for transient errors that can be retried
          const isTransientError =
            error.errorLabels?.includes('TransientTransactionError') ||
            error.code === 112; // WriteConflict

          if (isTransientError && attempt < maxRetries) {
            // Exponential backoff: 100ms, 200ms, 400ms...
            const delay = Math.pow(2, attempt - 1) * 100;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Non-transient error or max retries reached
          result.errors++;
          result.details.push({
            subscriptionId: String(subscription._id),
            status: 'error',
            message: error.message,
          });
          break;
        }
      }
    }

    return result;
  } catch (_error) {
    // Fatal error - return partial results
    return result;
  }
}

/**
 * Reconcile a Google Play subscription
 */
async function reconcileGooglePlaySubscription(
  subscription: any,
  result: ReconciliationResult
): Promise<void> {
  const googlePlayService = getGooglePlayService();

  // Validate with Google Play
  const purchaseData = await googlePlayService.validateSubscription(
    subscription.googlePlayProductId!,
    subscription.purchaseToken!
  );

  // Parse dates
  const expiryDate = new Date(parseInt(purchaseData.expiryTimeMillis));
  const now = new Date();

  let statusChanged = false;
  const oldStatus = subscription.status;

  // Update expiration date if changed
  if (subscription.expirationDate.getTime() !== expiryDate.getTime()) {
    subscription.expirationDate = expiryDate;
    subscription.renewalDate = expiryDate;
    statusChanged = true;
  }

  // Update auto-renewing status
  if (subscription.autoRenewing !== purchaseData.autoRenewing) {
    subscription.autoRenewing = purchaseData.autoRenewing;
    statusChanged = true;
  }

  // Check subscription state
  if (purchaseData.purchaseState === 0) {
    // Subscription is active
    if (expiryDate > now) {
      if (subscription.status !== 'active') {
        subscription.status = 'active';
        statusChanged = true;
      }
    } else {
      // Expired
      if (subscription.status !== 'expired') {
        subscription.status = 'expired';
        statusChanged = true;
        result.expired++;
      }
    }
  } else if (purchaseData.purchaseState === 1) {
    // Subscription is canceled
    if (subscription.status !== 'canceled' && subscription.status !== 'expired') {
      subscription.status = expiryDate > now ? 'pending_cancellation' : 'canceled';
      subscription.canceledAt = new Date(
        parseInt(purchaseData.userCancellationTimeMillis || String(Date.now()))
      );
      statusChanged = true;
    }
  }

  // Check for grace period
  if (purchaseData.paymentState === 0) {
    // Payment received
    if (subscription.status === 'grace') {
      subscription.status = 'active';
      subscription.gracePeriodEndDate = undefined;
      statusChanged = true;
    }
  } else if (purchaseData.paymentState === 1) {
    // Payment pending (grace period)
    if (subscription.status !== 'grace') {
      subscription.status = 'grace';
      subscription.gracePeriodEndDate = expiryDate;
      statusChanged = true;
    }
  }

  if (statusChanged) {
    await subscription.save();
    result.updated++;

    result.details.push({
      subscriptionId: String(subscription._id),
      status: 'updated',
      message: `Status changed from ${oldStatus} to ${subscription.status}`,
    });

    // Log the status change
    await SubscriptionEvent.create({
      subscriptionId: subscription._id,
      userId: subscription.userId,
      eventType: 'subscription_reconciled',
      store: 'google',
      eventDate: new Date(),
      hasFinancialImpact: false,
      isReconciliationEvent: true,
      reconciliationDate: new Date(),
      previousStatus: oldStatus,
      newStatus: subscription.status,
      metadata: {
        oldStatus,
        newStatus: subscription.status,
        expirationDate: subscription.expirationDate,
      },
    });
  }
}

/**
 * Reconcile an App Store subscription
 */
async function reconcileAppStoreSubscription(
  subscription: any,
  result: ReconciliationResult
): Promise<void> {
  const appStoreService = getAppStoreService();

  // Get subscription status from App Store
  const statusData = await appStoreService.getSubscriptionStatus(
    subscription.transactionId!
  );

  let statusChanged = false;
  const oldStatus = subscription.status;

  // Parse the response (structure depends on App Store API)
  // This is a simplified version - actual implementation depends on response format
  if (statusData.data && statusData.data.length > 0) {
    const latestInfo = statusData.data[0];

    // Decode the latest transaction info
    const transactionInfo = appStoreService.decodeNotification(
      latestInfo.lastTransactions?.[0]?.signedTransactionInfo
    );

    if (transactionInfo) {
      const expiryDate = new Date(transactionInfo.expiresDate);
      const now = new Date();

      // Update expiration date
      if (subscription.expirationDate.getTime() !== expiryDate.getTime()) {
        subscription.expirationDate = expiryDate;
        subscription.renewalDate = expiryDate;
        statusChanged = true;
      }

      // Update status based on expiration
      if (expiryDate > now) {
        if (subscription.status !== 'active') {
          subscription.status = 'active';
          statusChanged = true;
        }
      } else {
        if (subscription.status !== 'expired') {
          subscription.status = 'expired';
          statusChanged = true;
          result.expired++;
        }
      }

      // Check renewal status
      const renewalInfo = latestInfo.lastTransactions?.[0]?.signedRenewalInfo;
      if (renewalInfo) {
        const renewalData = appStoreService.decodeNotification(renewalInfo);
        if (renewalData.autoRenewStatus === 0) {
          subscription.autoRenewing = false;
          if (subscription.status === 'active') {
            subscription.status = 'pending_cancellation';
            subscription.willCancelAt = subscription.expirationDate;
            statusChanged = true;
          }
        } else {
          subscription.autoRenewing = true;
        }
      }
    }
  }

  if (statusChanged) {
    await subscription.save();
    result.updated++;

    result.details.push({
      subscriptionId: String(subscription._id),
      status: 'updated',
      message: `Status changed from ${oldStatus} to ${subscription.status}`,
    });

    // Log the status change
    await SubscriptionEvent.create({
      subscriptionId: subscription._id,
      userId: subscription.userId,
      eventType: 'subscription_reconciled',
      store: 'apple',
      eventDate: new Date(),
      hasFinancialImpact: false,
      isReconciliationEvent: true,
      reconciliationDate: new Date(),
      previousStatus: oldStatus,
      newStatus: subscription.status,
      metadata: {
        oldStatus,
        newStatus: subscription.status,
        expirationDate: subscription.expirationDate,
      },
    });
  }
}

/**
 * Schedule reconciliation to run daily
 */
export function scheduleReconciliation(): void {
  // Run every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  // Run immediately on startup
  runReconciliation().catch(() => {
    // Initial reconciliation failed silently - will retry on next schedule
  });

  // Then run every 24 hours
  setInterval(() => {
    runReconciliation().catch(() => {
      // Scheduled reconciliation failed silently - will retry on next schedule
    });
  }, TWENTY_FOUR_HOURS);
}

// Export for manual triggering
export default {
  runReconciliation,
  scheduleReconciliation,
};
