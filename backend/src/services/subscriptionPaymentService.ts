import mongoose from 'mongoose';
import User from '../models/User';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import Agency from '../models/Agency';
import { sendSubscriptionExpired, sendSubscriptionExpiringSoon, sendRenewalReminderEmail } from './emailService';
import { grantPaidPeriod } from './subscriptions/grantPaidPeriod';
import { generateEnterpriseAgentCoupons, generateProSubscriptionCoupons } from './subscriptions/planBenefits';
import { addDays, GRACE_PERIOD_DAYS } from '../utils/billingPeriod';
import { newOrderReference } from '../utils/orderReference';
import { createNotificationWithPush } from './engagementService';
import { paymentLogger } from '../utils/logger';
import { FREE_TIER_LIMITS } from '../config/subscriptionConstants';

/**
 * Secure Subscription Payment Service
 * Handles atomic operations for payment -> subscription -> user updates
 * Ensures data consistency and prevents partial updates
 */

interface ProcessPaymentParams {
  userId: mongoose.Types.ObjectId | string;
  productId: string;
  store: 'google' | 'apple' | 'web' | 'stripe' | 'paddle';
  amount: number;
  currency: string;
  purchaseToken?: string;
  transactionId?: string;
  startDate?: Date;
  discountCode?: string;
  originalAmount?: number;
}

interface ProcessPaymentResult {
  success: boolean;
  subscription?: any;
  paymentRecord?: any;
  user?: any;
  message: string;
  paymentId?: string;
  subscriptionId?: string;
  skipped?: boolean;
}

/**
 * @deprecated Kept for the legacy Stripe handlers in paymentController.ts.
 * Every grant goes through grantPaidPeriod (services/subscriptions/grantPaidPeriod.ts);
 * this only maps the old parameters onto it.
 */
export async function processSubscriptionPayment(
  params: ProcessPaymentParams
): Promise<ProcessPaymentResult> {
  const result = await grantPaidPeriod({
    userId: params.userId,
    productId: params.productId,
    amount: params.amount,
    currency: params.currency,
    reference: params.transactionId || params.purchaseToken || newOrderReference('BE'),
    method: params.store === 'stripe' ? 'stripe' : 'paysera',
    store: params.store,
    discountCode: params.discountCode,
    originalAmount: params.originalAmount,
    now: params.startDate,
  });
  return {
    success: true,
    subscription: result.subscription,
    paymentRecord: result.paymentRecord,
    subscriptionId: String(result.subscription._id),
    paymentId: String(result.paymentRecord._id),
    message: result.alreadyGranted ? 'Payment already processed' : 'Payment processed and subscription activated',
  };
}

/**
 * Cancel a subscription and update all related records
 */
export async function cancelSubscriptionSecurely(
  subscriptionId: string | mongoose.Types.ObjectId,
  userId: string | mongoose.Types.ObjectId,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId,
    }).session(session);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update subscription
    subscription.status = 'pending_cancellation';
    subscription.autoRenewing = false;
    subscription.willCancelAt = subscription.expirationDate;
    subscription.canceledAt = new Date();
    subscription.cancellationReason = reason;
    await subscription.save({ session });

    // Update user (but don't clear subscription fields until it actually expires)
    const user = await User.findById(userId).session(session);
    if (user) {
      user.subscriptionStatus = 'canceled';
      // Keep subscription fields active until expiration
      await user.save({ session });
    }

    // Create event
    await SubscriptionEvent.create(
      [
        {
          subscriptionId: subscription._id,
          userId,
          eventType: 'subscription_canceled',
          store: subscription.store,
          metadata: {
            reason,
            willExpireAt: subscription.expirationDate,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      message: 'Subscription will be canceled at the end of the billing period',
    };
  } catch (error: any) {
    await session.abortTransaction();
    throw new Error(`Cancellation failed: ${error.message}`);
  } finally {
    session.endSession();
  }
}

/**
 * Revoke an agency-coupon subscription when an agent leaves or is removed from an agency.
 * Immediately cancels the subscription, downgrades to free tier, and frees the coupon.
 * Only affects store='agency_coupon' subscriptions — self-paid subscriptions are untouched.
 * All operations are atomic within a MongoDB transaction.
 */
export async function revokeAgencyCouponSubscription(
  userId: string | mongoose.Types.ObjectId,
  agencyId: string | mongoose.Types.ObjectId
): Promise<{ revoked: boolean; message: string }> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Handle both ObjectId and string userId formats for compatibility
    // (getCurrentSubscription uses the same pattern — without this, the query
    // may silently miss the document when called with a plain string from
    // req.params, leaving an orphaned active Subscription behind.)
    const userIdVariants = [userId, String(userId)];
    try {
      userIdVariants.push(new mongoose.Types.ObjectId(String(userId)));
    } catch { /* invalid ObjectId string — ignore */ }

    const subscription = await Subscription.findOne({
      userId: { $in: userIdVariants },
      store: 'agency_coupon',
      status: { $in: ['active', 'pending_cancellation', 'grace'] },
    }).session(session);

    let subscriptionCanceled = false;

    if (subscription) {
      // Cancel the subscription immediately (not pending_cancellation)
      subscription.status = 'canceled';
      subscription.autoRenewing = false;
      subscription.canceledAt = new Date();
      subscription.expirationDate = new Date(); // Expire immediately so /subscriptions/current won't return it
      subscription.cancellationReason = 'Agent left/removed from agency';
      await subscription.save({ session });
      subscriptionCanceled = true;

      // Create audit event
      await SubscriptionEvent.create(
        [{
          subscriptionId: subscription._id,
          userId,
          eventType: 'subscription_canceled',
          store: 'agency_coupon',
          metadata: {
            reason: 'Agent left/removed from agency',
            agencyId: String(agencyId),
            immediateRevocation: true,
          },
        }],
        { session }
      );
    }

    // Downgrade user to free tier (always, even if no subscription found)
    const user = await User.findById(userId).session(session);
    if (user) {
      user.subscription = {
        ...user.subscription,
        tier: 'free' as any,
        status: 'expired' as any,
        listingsLimit: FREE_TIER_LIMITS.LISTINGS,
        savedSearchesLimit: FREE_TIER_LIMITS.SAVED_SEARCHES,
        promotionCoupons: {
          monthly: FREE_TIER_LIMITS.PROMOTION_COUPONS,
          available: FREE_TIER_LIMITS.PROMOTION_COUPONS,
          used: 0,
          rollover: 0,
          lastRefresh: new Date(),
        },
        expiresAt: undefined,
      };
      user.subscriptionStatus = 'expired';
      await user.save({ session });
    }

    // Free up the agency coupon for reassignment (always, regardless of subscription)
    const agency = await Agency.findById(agencyId).session(session);
    if (agency?.agentCoupons) {
      const coupon = agency.agentCoupons.find(
        (c: any) => c.usedBy && String(c.usedBy) === String(userId) && c.status === 'used'
      );
      if (coupon) {
        coupon.status = 'available';
        coupon.usedBy = undefined;
        coupon.usedAt = undefined;
        await agency.save({ session });
        paymentLogger.info(`Agency coupon ${coupon.code} freed for reassignment (user ${userId})`);
      }
    }

    await session.commitTransaction();

    paymentLogger.info(`Agency coupon subscription revoked for user ${userId} (agency ${agencyId}), subscription canceled: ${subscriptionCanceled}`);
    return { revoked: true, message: 'Agency coupon subscription revoked and user downgraded to free tier' };
  } catch (error: any) {
    await session.abortTransaction();
    paymentLogger.error(`Failed to revoke agency coupon subscription for user ${userId}:`, error);
    throw new Error(`Agency coupon revocation failed: ${error.message}`);
  } finally {
    session.endSession();
  }
}

/**
 * Check and update expired subscriptions
 * Should be run by a cron job daily
 * Includes retry logic for MongoDB transient transaction errors (WriteConflict)
 */
const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'https://balkanestateai.com';

export async function updateExpiredSubscriptions(maxRetries = 3): Promise<number> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    const expiredUsers: { userId: string; email: string; name: string; planName: string }[] = [];
    const gracePeriodUsers: { userId: string; email: string; name: string; planName: string; gracePeriodEndDate: Date }[] = [];

    try {
      const now = new Date();
      let updatedCount = 0;

      // Handle 'active' subscriptions: respect autoRenewing flag
      const activeExpired = await Subscription.find({
        status: 'active',
        expirationDate: { $lt: now },
      }).session(session);

      for (const subscription of activeExpired) {
        const user = await User.findById(subscription.userId).session(session);

        // Web plans are prepaid: when one ends, the user keeps access for the
        // grace period, counted from the plan's own end, and is asked to renew.
        if (subscription.store === 'web') {
          const gracePeriodEndDate = addDays(subscription.expirationDate, GRACE_PERIOD_DAYS);

          subscription.status = 'grace';
          subscription.gracePeriodEndDate = gracePeriodEndDate;
          await subscription.save({ session });

          if (user && String(user.activeSubscriptionId) === String(subscription._id)) {
            // Keep user's subscription active during grace period
            if (user.subscription) {
              user.subscription.status = 'grace';
              user.markModified('subscription');
            }
            user.subscriptionStatus = 'grace';
            await user.save({ session });

            gracePeriodUsers.push({
              userId: String(user._id),
              email: user.email,
              name: user.name || 'Customer',
              planName: user.subscriptionProductName || subscription.productId || 'subscription',
              gracePeriodEndDate,
            });
          }

          await SubscriptionEvent.create([{
            subscriptionId: subscription._id,
            userId: subscription.userId,
            eventType: 'subscription_grace_period_started',
            store: subscription.store,
            metadata: { gracePeriodEndDate, reason: 'auto_renewal_pending' },
          }], { session });

          updatedCount++;
        } else {
          // Other stores renew or expire on their own side: expire immediately
          subscription.status = 'expired';
          await subscription.save({ session });

          if (user && String(user.activeSubscriptionId) === String(subscription._id)) {
            expiredUsers.push({
              userId: String(user._id),
              email: user.email,
              name: user.name || 'Customer',
              planName: subscription.productId || 'subscription',
            });

            user.isSubscribed = false;
            user.subscriptionStatus = 'expired';
            user.subscriptionPlan = undefined;
            user.subscriptionProductName = undefined;
            user.subscriptionSource = undefined;
            user.activeSubscriptionId = undefined;

            if (user.subscription) {
              user.subscription.tier = 'free';
              user.subscription.status = 'expired';
              user.subscription.listingsLimit = FREE_TIER_LIMITS.LISTINGS;
              user.subscription.expiresAt = undefined;
              user.markModified('subscription');
            }
            user.activeListingsLimit = FREE_TIER_LIMITS.LISTINGS;
            await user.save({ session });
          }

          await SubscriptionEvent.create([{
            subscriptionId: subscription._id,
            userId: subscription.userId,
            eventType: 'subscription_expired',
            store: subscription.store,
            metadata: { expiredAt: now },
          }], { session });

          updatedCount++;
        }
      }

      // Handle 'grace' subscriptions whose grace period has ended
      const graceExpired = await Subscription.find({
        status: 'grace',
        gracePeriodEndDate: { $lt: now },
      }).session(session);

      for (const subscription of graceExpired) {
        subscription.status = 'expired';
        await subscription.save({ session });

        const user = await User.findById(subscription.userId).session(session);
        if (user && String(user.activeSubscriptionId) === String(subscription._id)) {
          expiredUsers.push({
            userId: String(user._id),
            email: user.email,
            name: user.name || 'Customer',
            planName: user.subscriptionProductName || subscription.productId || 'subscription',
          });

          user.isSubscribed = false;
          user.subscriptionStatus = 'expired';
          user.subscriptionPlan = undefined;
          user.subscriptionProductName = undefined;
          user.subscriptionSource = undefined;
          user.activeSubscriptionId = undefined;

          if (user.subscription) {
            user.subscription.tier = 'free';
            user.subscription.status = 'expired';
            user.subscription.listingsLimit = FREE_TIER_LIMITS.LISTINGS;
            user.subscription.expiresAt = undefined;
            user.markModified('subscription');
          }
          user.activeListingsLimit = FREE_TIER_LIMITS.LISTINGS;
          await user.save({ session });
        }

        await SubscriptionEvent.create([{
          subscriptionId: subscription._id,
          userId: subscription.userId,
          eventType: 'subscription_expired',
          store: subscription.store,
          metadata: { expiredAt: now, reason: 'grace_period_ended' },
        }], { session });

        updatedCount++;
      }

      await session.commitTransaction();
      session.endSession();

      // Post-commit: send grace period renewal reminders
      for (const { email, name, planName, gracePeriodEndDate } of gracePeriodUsers) {
        try {
          await sendRenewalReminderEmail({
            email,
            userName: name,
            planName,
            gracePeriodEndDate,
            renewalUrl: `${FRONTEND_BASE_URL}/account?tab=subscription`,
          });
        } catch (emailError) {
          paymentLogger.error(`Failed to send renewal reminder email to ${email}:`, emailError);
        }
      }

      // Post-commit: send expiration notifications
      for (const { userId, email, name, planName } of expiredUsers) {
        try {
          await sendSubscriptionExpired(email, name, planName);
        } catch (emailError) {
          paymentLogger.error(`Failed to send subscription expired email to ${email}:`, emailError);
        }

        try {
          await createNotificationWithPush({
            userId,
            type: 'subscription_expiring',
            title: 'Subscription Expired',
            message: `Your ${planName} subscription has expired. Your account has been downgraded to the free plan.`,
            icon: 'alert-circle',
            priority: 'high',
            data: { actionUrl: '/account', actionLabel: 'Resubscribe' },
          });
        } catch (notifError) {
          paymentLogger.error(`Failed to create subscription expired notification for user ${userId}:`, notifError);
        }
      }

      return updatedCount;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      lastError = error;

      const isTransientError =
        error.errorLabels?.includes('TransientTransactionError') ||
        error.code === 112;

      if (isTransientError && attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Verify payment integrity - ensures payment records match subscriptions
 */
export async function verifyPaymentIntegrity(
  userId: string | mongoose.Types.ObjectId
): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const user = await User.findById(userId);
    if (!user) {
      issues.push('User not found');
      return { valid: false, issues };
    }

    // Check if user claims to be subscribed
    if (user.isSubscribed) {
      // Verify active subscription exists
      const subscription = await Subscription.findById(user.activeSubscriptionId);
      if (!subscription) {
        issues.push('User has isSubscribed=true but no active subscription found');
      }

      // Verify subscription is actually active
      if (subscription && !subscription.isActive()) {
        issues.push('User has isSubscribed=true but subscription is not active');
      }

      // Verify expiration date matches
      if (
        user.subscriptionExpiresAt &&
        subscription &&
        user.subscriptionExpiresAt.getTime() !== subscription.expirationDate.getTime()
      ) {
        issues.push('User expiration date does not match subscription expiration date');
      }

      // Verify at least one payment exists
      const paymentCount = await PaymentRecord.countDocuments({
        userId,
        subscriptionId: subscription?._id,
        status: 'completed',
      });

      if (paymentCount === 0) {
        issues.push('Active subscription found but no completed payments');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (error: any) {
    issues.push(`Verification error: ${error.message}`);
    return { valid: false, issues };
  }
}


/**
 * Find subscriptions expiring within the next 5 hours and send warning emails/notifications.
 * Marks each subscription so the warning is only sent once.
 */
export async function checkExpiringSoonSubscriptions(): Promise<number> {
  const now = new Date();
  const fiveHoursFromNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  // Find active subscriptions expiring within 5 hours that haven't received the warning yet
  const expiringSoon = await Subscription.find({
    status: { $in: ['active', 'grace'] },
    expirationDate: { $gt: now, $lte: fiveHoursFromNow },
    expiryWarningSent: { $ne: true },
  });

  let notified = 0;
  for (const subscription of expiringSoon) {
    try {
      const user = await User.findById(subscription.userId).select('email name').lean();
      if (!user) continue;

      const planName = subscription.productId || 'Pro';

      // Send warning email (non-blocking)
      sendSubscriptionExpiringSoon(user.email, user.name || 'there', planName, subscription.expirationDate).catch(
        err => paymentLogger.error(`Failed to send expiry warning email to ${user.email}:`, err)
      );

      // Send in-app notification
      createNotificationWithPush({
        userId: String(subscription.userId),
        type: 'subscription_expiring',
        title: 'Subscription Expiring Soon',
        message: `Your ${planName} subscription expires in less than 5 hours. Renew now to keep your premium access.`,
        icon: 'clock',
        priority: 'high',
        data: {
          actionUrl: '/account',
          actionLabel: 'Renew Now',
        },
      }).catch(err =>
        paymentLogger.error(`Failed to send expiry warning notification for user ${String(subscription.userId)}:`, err)
      );

      // Mark warning as sent
      await Subscription.updateOne({ _id: subscription._id }, { $set: { expiryWarningSent: true } });
      notified++;
    } catch (err) {
      paymentLogger.error(`Error processing expiry warning for subscription ${String(subscription._id)}:`, err);
    }
  }

  return notified;
}

export { generateEnterpriseAgentCoupons, generateProSubscriptionCoupons };

export default {
  processSubscriptionPayment,
  cancelSubscriptionSecurely,
  updateExpiredSubscriptions,
  checkExpiringSoonSubscriptions,
  verifyPaymentIntegrity,
  generateEnterpriseAgentCoupons,
  generateProSubscriptionCoupons,
};
