import mongoose from 'mongoose';
import User from '../models/User';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import Product from '../models/Product';
import Agency from '../models/Agency';
import { sendAgentRegistrationCouponsEmail, sendEnterpriseWelcomeEmail } from './emailService';
import { generateSecureRandomString } from '../utils/secureRandom';
import logger from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Secure Subscription Payment Service
 * Handles atomic operations for payment -> subscription -> user updates
 * Ensures data consistency and prevents partial updates
 */

interface ProcessPaymentParams {
  userId: mongoose.Types.ObjectId | string;
  productId: string;
  store: 'google' | 'apple' | 'stripe' | 'lemonsqueezy' | 'web';
  amount: number;
  currency: string;
  purchaseToken?: string;
  transactionId?: string;
  startDate?: Date;
}

interface ProcessPaymentResult {
  success: boolean;
  subscription: any;
  paymentRecord: any;
  user: any;
  message: string;
}

/**
 * Process a subscription payment with full atomicity
 * This ensures that if any step fails, all changes are rolled back
 */
export async function processSubscriptionPayment(
  params: ProcessPaymentParams
): Promise<ProcessPaymentResult> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      userId,
      productId,
      store,
      amount,
      currency,
      purchaseToken,
      transactionId,
      startDate = new Date(),
    } = params;

    // 1. Find the product
    const product = await Product.findOne({ productId }).session(session);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // 2. Find the user
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // 3. Calculate expiration date
    const expirationDate = new Date(startDate);
    if (product.billingPeriod === 'monthly') {
      expirationDate.setMonth(expirationDate.getMonth() + 1);
    } else if (product.billingPeriod === 'yearly') {
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    } else {
      expirationDate.setMonth(expirationDate.getMonth() + 1); // Default to monthly
    }

    // 4. Create or update subscription
    if (!isProduction) console.log('🔍 Checking for existing subscription...');
    let subscription = await Subscription.findOne({
      userId,
      productId,
      status: { $in: ['active', 'grace', 'pending_cancellation'] },
    }).session(session);

    if (subscription) {
      if (!isProduction) console.log('🔄 Renewing existing subscription:', subscription._id);
      // Renew existing subscription
      subscription.expirationDate = expirationDate;
      subscription.renewalDate = expirationDate;
      subscription.status = 'active';
      subscription.autoRenewing = true;
      subscription.lastUpdated = new Date();
      await subscription.save({ session });
      if (!isProduction) console.log('✅ Subscription renewed successfully');
    } else {
      if (!isProduction) console.log('➕ Creating new subscription...');

      // Generate unique tokens for web subscriptions if not provided (using secure random)
      // This prevents duplicate key errors when multiple users create free subscriptions
      const webPurchaseToken = store === 'web' && !purchaseToken
        ? `web_${userId}_${Date.now()}_${generateSecureRandomString(8).toLowerCase()}`
        : purchaseToken;

      const webTransactionId = store === 'web' && !transactionId
        ? `web_txn_${userId}_${Date.now()}_${generateSecureRandomString(8).toLowerCase()}`
        : transactionId;

      // Create new subscription
      const subscriptionData: any = {
        userId,
        store,
        productId,
        googlePlayProductId: product.googlePlayProductId,
        appStoreProductId: product.appStoreProductId,
        stripeProductId: product.stripeProductId,
        startDate,
        expirationDate,
        renewalDate: expirationDate,
        status: 'active',
        autoRenewing: true,
        price: amount,
        currency,
      };

      // Only include purchaseToken/transactionId if they exist
      // This prevents setting null values that would violate unique constraints
      if (webPurchaseToken) {
        subscriptionData.purchaseToken = webPurchaseToken;
      }
      if (webTransactionId) {
        subscriptionData.transactionId = webTransactionId;
      }

      const [newSubscription] = await Subscription.create(
        [subscriptionData],
        { session }
      );
      subscription = newSubscription;
      if (!isProduction) console.log('✅ New subscription created:', subscription._id);
    }

    // 5. Create payment record
    if (!isProduction) console.log('💳 Creating payment record...');

    // Use the subscription's tokens or generate a unique transaction ID (secure random)
    const paymentTransactionId = subscription.transactionId
      || subscription.purchaseToken
      || `web_payment_${userId}_${Date.now()}_${generateSecureRandomString(8).toLowerCase()}`;

    const [paymentRecord] = await PaymentRecord.create(
      [
        {
          userId,
          userEmail: user.email, // Store email for admin lookup
          userName: user.name, // Store name for admin lookup
          subscriptionId: subscription._id,
          store,
          storeTransactionId: paymentTransactionId,
          transactionType: 'charge',
          transactionDate: new Date(),
          amount,
          currency,
          status: 'completed',
          productId,
          description: `Subscription payment for ${product.name}`,
        },
      ],
      { session }
    );
    if (!isProduction) console.log('✅ Payment record created:', paymentRecord._id, 'for user:', user.email);

    // 6. Update user with subscription info
    if (!isProduction) console.log('👤 Updating user subscription info...');
    user.isSubscribed = true;
    user.subscriptionPlan = productId; // Product ID (e.g., 'buyer_pro_monthly')
    user.subscriptionProductName = product.name; // Human-readable name
    user.subscriptionSource = store; // Track where subscription came from
    user.subscriptionExpiresAt = expirationDate;
    user.subscriptionStartedAt = startDate;
    user.activeSubscriptionId = subscription._id as mongoose.Types.ObjectId;
    user.lastPaymentDate = new Date();
    user.lastPaymentAmount = amount;
    user.totalPaid = (user.totalPaid || 0) + amount;
    user.subscriptionStatus = 'active';
    await user.save({ session });
    if (!isProduction) console.log('✅ User updated with subscription info');

    // 7. Create subscription event
    await SubscriptionEvent.create(
      [
        {
          subscriptionId: subscription._id,
          userId,
          eventType: subscription.isNew ? 'subscription_purchased' : 'subscription_renewed',
          store,
          hasFinancialImpact: true,
          amount,
          currency,
          productId,
          metadata: {
            paymentRecordId: paymentRecord._id,
            expirationDate,
          },
        },
      ],
      { session }
    );

    // Commit the transaction
    await session.commitTransaction();

    if (!isProduction) console.log(`✅ Payment processed successfully for user ${userId}`);

    // After successful subscription, handle Enterprise-specific logic
    // This runs outside the transaction since it's not critical
    const isEnterpriseProduct = productId.includes('enterprise') || productId === 'agency_yearly';
    const isNewSubscription = !subscription.isNew === false; // New subscription, not renewal

    if (isEnterpriseProduct && isNewSubscription) {
      try {
        await generateEnterpriseAgentCoupons(String(userId), user.name || 'Agency Owner', user.email);
        if (!isProduction) console.log(`🎟️ Generated agent coupons for Enterprise subscription`);
      } catch (couponError) {
        // Don't fail the subscription if coupon generation fails
        console.error('⚠️ Error generating Enterprise agent coupons:', couponError);
      }
    }

    return {
      success: true,
      subscription,
      paymentRecord,
      user,
      message: 'Payment processed and subscription activated',
    };
  } catch (error: any) {
    // Rollback all changes if anything fails
    await session.abortTransaction();
    console.error('❌ Payment processing failed:', error);

    throw new Error(`Payment processing failed: ${error.message}`);
  } finally {
    session.endSession();
  }
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
 * Check and update expired subscriptions
 * Should be run by a cron job daily
 * Includes retry logic for MongoDB transient transaction errors (WriteConflict)
 */
export async function updateExpiredSubscriptions(maxRetries = 3): Promise<number> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      let updatedCount = 0;

      // Find all expired subscriptions
      const expiredSubscriptions = await Subscription.find({
        status: { $in: ['active', 'grace'] },
        expirationDate: { $lt: now },
      }).session(session);

      for (const subscription of expiredSubscriptions) {
        // Update subscription
        subscription.status = 'expired';
        await subscription.save({ session });

        // Update user - clear subscription fields
        const user = await User.findById(subscription.userId).session(session);
        if (user && String(user.activeSubscriptionId) === String(subscription._id)) {
          user.isSubscribed = false;
          user.subscriptionStatus = 'expired';
          user.subscriptionPlan = undefined;
          user.subscriptionProductName = undefined;
          user.subscriptionSource = undefined;
          user.activeSubscriptionId = undefined;
          await user.save({ session });
        }

        // Create event
        await SubscriptionEvent.create(
          [
            {
              subscriptionId: subscription._id,
              userId: subscription.userId,
              eventType: 'subscription_expired',
              store: subscription.store,
              metadata: {
                expiredAt: now,
              },
            },
          ],
          { session }
        );

        updatedCount++;
      }

      await session.commitTransaction();
      session.endSession();

      return updatedCount;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      lastError = error;

      // Check for transient transaction errors (WriteConflict) that can be retried
      const isTransientError =
        error.errorLabels?.includes('TransientTransactionError') ||
        error.code === 112; // WriteConflict

      if (isTransientError && attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms...
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
 * Generate agent coupon codes for new Enterprise subscriptions
 * Creates 5 coupon codes and sends email to the agency owner
 */
async function generateEnterpriseAgentCoupons(
  userId: string,
  ownerName: string,
  ownerEmail: string
): Promise<void> {
  // Find or create agency for this user
  let agency = await Agency.findOne({ ownerId: userId });

  if (!agency) {
    // If no agency exists yet, the coupons will be generated when they create the agency
    if (!isProduction) console.log('📋 No agency found yet - coupons will be generated when agency is created');
    return;
  }

  // Check if coupons already exist (in case of duplicate calls)
  const existingAvailableCoupons = agency.agentCoupons.filter(
    (c: any) => c.status === 'available'
  ).length;

  if (existingAvailableCoupons >= 5) {
    if (!isProduction) console.log('✅ Agency already has 5 available coupons');
    return;
  }

  // Generate coupon codes (up to 5 total)
  const couponsToGenerate = 5 - existingAvailableCoupons;
  const newCoupons: Array<{ code: string; expiresAt: Date }> = [];

  for (let i = 0; i < couponsToGenerate; i++) {
    const code = agency.generateCouponCode();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

    agency.agentCoupons.push({
      code,
      generatedAt: new Date(),
      expiresAt,
      status: 'available',
    } as any);

    newCoupons.push({ code, expiresAt });
  }

  // Update agency subscription status
  agency.subscription = {
    ...agency.subscription,
    status: 'active',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    autoRenew: true,
  };

  await agency.save();

  if (!isProduction) console.log(`✅ Generated ${couponsToGenerate} agent coupons for agency ${agency.name}`);

  // Send emails with the coupon codes and welcome message
  try {
    // Send agent registration coupons email
    await sendAgentRegistrationCouponsEmail({
      email: ownerEmail,
      ownerName,
      agencyName: agency.name,
      coupons: newCoupons,
    });
    // Sent agent registration coupons email

    // Send welcome/thank you email
    await sendEnterpriseWelcomeEmail({
      email: ownerEmail,
      ownerName,
      agencyName: agency.name,
    });
    // Sent Enterprise welcome email
  } catch (emailError) {
    console.error('⚠️ Failed to send Enterprise emails:', emailError);
    // Don't throw - coupons were still generated successfully
  }
}

// Named export for the function
export { generateEnterpriseAgentCoupons };

export default {
  processSubscriptionPayment,
  cancelSubscriptionSecurely,
  updateExpiredSubscriptions,
  verifyPaymentIntegrity,
  generateEnterpriseAgentCoupons,
};
