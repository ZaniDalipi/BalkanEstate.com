import mongoose from 'mongoose';
import User from '../models/User';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import Product from '../models/Product';
import Agency from '../models/Agency';
import PromotionCoupon from '../models/PromotionCoupon';
import { sendAgentRegistrationCouponsEmail, sendEnterpriseWelcomeEmail, sendSubscriptionInvoice, sendProSubscriptionWelcomeEmail, sendMonthlyCouponEmail } from './emailService';
import { generateSecureRandomString } from '../utils/secureRandom';
import { paymentLogger } from '../utils/logger';
import { FREE_TIER_LIMITS } from '../config/subscriptionConstants';

const isProduction = process.env.NODE_ENV === 'production';

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
    if (!isProduction) paymentLogger.info('🔍 Checking for existing subscription...');
    const existingSubscription = await Subscription.findOne({
      userId,
      productId,
      status: { $in: ['active', 'grace', 'pending_cancellation'] },
    }).session(session);
    // eslint-disable-next-line prefer-const
    let subscription!: NonNullable<typeof existingSubscription>;

    if (existingSubscription) {
      if (!isProduction) paymentLogger.info('🔄 Renewing existing subscription:', existingSubscription._id);
      // Renew existing subscription
      existingSubscription.expirationDate = expirationDate;
      existingSubscription.renewalDate = expirationDate;
      existingSubscription.status = 'active';
      existingSubscription.autoRenewing = true;
      existingSubscription.lastUpdated = new Date();
      await existingSubscription.save({ session });
      subscription = existingSubscription;
      if (!isProduction) paymentLogger.info('✅ Subscription renewed successfully');
    } else {
      if (!isProduction) paymentLogger.info('➕ Creating new subscription...');

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
        externalProductId: product.externalProductId,
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
      if (!isProduction) paymentLogger.info('✅ New subscription created:', subscription._id);
    }

    // 5. Create payment record
    if (!isProduction) paymentLogger.info('💳 Creating payment record...');

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
    if (!isProduction) paymentLogger.info('✅ Payment record created:', paymentRecord._id, 'for user:', user.email);

    // 6. Update user with subscription info
    if (!isProduction) paymentLogger.info('👤 Updating user subscription info...');
    user.isSubscribed = true;
    user.subscriptionPlan = productId; // Product ID (e.g., 'buyer_monthly')
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
    if (!isProduction) paymentLogger.info('✅ User updated with subscription info');

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

    if (!isProduction) paymentLogger.info(`✅ Payment processed successfully for user ${userId}`);

    // After successful subscription, handle post-payment logic
    // This runs outside the transaction since it's not critical
    const isEnterpriseProduct = productId.includes('enterprise') || productId === 'agency_yearly';
    const isProProduct = productId.includes('pro_') || productId.includes('seller_pro_');
    const isNewSubscription = !existingSubscription; // true only when no prior subscription was found

    if (isEnterpriseProduct && isNewSubscription) {
      try {
        await generateEnterpriseAgentCoupons(String(userId), user.name || 'Agency Owner', user.email);
        if (!isProduction) paymentLogger.info(`🎟️ Generated agent coupons for Enterprise subscription`);
      } catch (couponError) {
        // Don't fail the subscription if coupon generation fails
        paymentLogger.error('⚠️ Error generating Enterprise agent coupons:', couponError);
      }
    }

    // Initialize promotion coupons immediately so user doesn't wait for monthly cron
    try {
      await initializePromotionCoupons(String(userId), productId, isProProduct, isEnterpriseProduct);
    } catch (couponError) {
      paymentLogger.error('⚠️ Error initializing promotion coupons:', couponError);
    }

    // Generate promotion coupon codes and send email for new Enterprise subscriptions
    if (isEnterpriseProduct && isNewSubscription) {
      try {
        const totalCoupons = product.promotionCoupons;
        const highlightedCoupons = product.highlightedCoupons;
        const premiumCoupons = product.premiumCoupons;
        const featuredCoupons = product.featuredCoupons;

        // Generate actual PromotionCoupon codes for the enterprise user (2-week validity)
        const generatedCodes = await generateProSubscriptionCoupons(
          String(userId),
          highlightedCoupons ?? 0,
          premiumCoupons ?? 0,
          featuredCoupons ?? 0,
          subscription.expirationDate,
          MAX_COUPON_VALIDITY_DAYS_AGENCY,
        );

        // Send the initial promotion coupons email with codes
        await sendMonthlyCouponEmail({
          email: user.email,
          userName: user.name || user.email.split('@')[0],
          planName: product.name ?? 'Enterprise',
          totalCoupons: totalCoupons ?? 0,
          newCoupons: totalCoupons ?? 0,
          rolledOver: 0,
          breakdown: {
            highlighted: highlightedCoupons ?? 0,
            premium: premiumCoupons ?? 0,
            featured: featuredCoupons ?? 0,
          },
          isAgency: true,
          agencyName: user.agencyName || 'Your Agency',
          couponCodes: generatedCodes,
        });
        if (!isProduction) paymentLogger.info(`🎟️ Enterprise promotion coupons generated and emailed to ${user.email}`);
      } catch (couponError) {
        paymentLogger.error('⚠️ Error generating/emailing Enterprise promotion coupons:', couponError);
      }
    }

    // Send welcome email with plan benefits for new Pro subscriptions
    if (isProProduct && isNewSubscription) {
      try {
        const billingPeriod = product.billingPeriod === 'yearly' ? 'yearly' : 'monthly';
        const listingsLimit = product.listingsLimit;
        const totalCoupons = product.promotionCoupons;
        const highlightedCoupons = product.highlightedCoupons;
        const premiumCoupons = product.premiumCoupons;
        const featuredCoupons = product.featuredCoupons;

        // Generate actual PromotionCoupon codes for the user
        const generatedCodes = await generateProSubscriptionCoupons(
          String(userId),
          highlightedCoupons ?? 0,
          premiumCoupons ?? 0,
          featuredCoupons ?? 0,
          subscription.expirationDate,
        );

        await sendProSubscriptionWelcomeEmail({
          email: user.email,
          userName: user.name || user.email.split('@')[0],
          planName: product.name,
          listingsLimit: listingsLimit ?? 0,
          promotionCoupons: {
            total: totalCoupons ?? 0,
            highlighted: highlightedCoupons ?? 0,
            premium: premiumCoupons ?? 0,
            featured: featuredCoupons ?? 0,
          },
          aiInsightsLimit: product.aiInsightsLimit ?? 0,
          aiMessagesLimit: product.aiMessagesLimit ?? -1,
          savedSearchesLimit: product.savedSearchesLimit ?? -1,
          billingPeriod,
          expiresAt: subscription.expirationDate,
          // Coupon codes are sent in a dedicated follow-up email below
        });
        if (!isProduction) paymentLogger.info(`📧 Pro welcome email sent to ${user.email}`);

        // Also send the initial monthly coupons email right away
        await sendMonthlyCouponEmail({
          email: user.email,
          userName: user.name || user.email.split('@')[0],
          planName: product.name,
          totalCoupons: totalCoupons ?? 0,
          newCoupons: totalCoupons ?? 0,
          rolledOver: 0,
          breakdown: {
            highlighted: highlightedCoupons ?? 0,
            premium: premiumCoupons ?? 0,
            featured: featuredCoupons ?? 0,
          },
          couponCodes: generatedCodes,
        });
        if (!isProduction) paymentLogger.info(`🎟️ Initial coupons email sent to ${user.email}`);
      } catch (emailError) {
        paymentLogger.error('⚠️ Error sending Pro welcome/coupons email:', emailError);
      }
    }

    // Send receipt/invoice email with transaction details
    try {
      const billingPeriod = product.billingPeriod === 'yearly' ? 'yearly' : 'monthly';
      const invoiceDescription = params.discountCode
        ? `${product.name} (Coupon: ${params.discountCode})`
        : product.name;

      await sendSubscriptionInvoice(
        user.email,
        user.name || 'Customer',
        {
          planName: invoiceDescription,
          amount: params.originalAmount != null ? params.originalAmount : amount,
          currency: currency || 'EUR',
          billingPeriod,
          orderId: String(paymentRecord._id),
          subscriptionStartDate: startDate,
          nextBillingDate: subscription.expirationDate,
          autoRenewing: subscription.autoRenewing ?? true,
        }
      );
      if (!isProduction) paymentLogger.info(`📧 Receipt email sent to ${user.email}`);
    } catch (emailError) {
      // Don't fail the subscription if email fails
      paymentLogger.error('⚠️ Error sending receipt email:', emailError);
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
    paymentLogger.error('❌ Payment processing failed:', error);

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
    const subscription = await Subscription.findOne({
      userId,
      store: 'agency_coupon',
      status: { $in: ['active', 'pending_cancellation', 'grace'] },
    }).session(session);

    let subscriptionCanceled = false;

    if (subscription) {
      // Cancel the subscription immediately (not pending_cancellation)
      subscription.status = 'canceled';
      subscription.autoRenewing = false;
      subscription.canceledAt = new Date();
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
 * Initialize promotion coupons immediately when a user subscribes.
 * Ensures users get their promotion coupons right away instead of
 * waiting for the monthly cron job on the 1st.
 */
async function initializePromotionCoupons(
  userId: string,
  productId: string,
  isProProduct: boolean,
  isEnterpriseProduct: boolean
): Promise<void> {
  const now = new Date();

  if (isProProduct) {
    // Get the Pro product config for coupon amounts - use actual subscribed product, fallback to pro_monthly
    const proProduct = await Product.findOne({ productId }).lean()
      ?? await Product.findOne({ productId: 'pro_monthly' }).lean();
    const monthlyAmount = proProduct?.promotionCoupons || 3;
    const highlightedAmount = proProduct?.highlightedCoupons || 2;
    const premiumAmount = proProduct?.premiumCoupons || 1;

    // Check if user already has coupons (renewal - don't overwrite)
    const user = await User.findById(userId);
    if (user?.proSubscription?.promotionCoupons?.available && user.proSubscription.promotionCoupons.available > 0) {
      if (!isProduction) paymentLogger.info('✅ Pro user already has promotion coupons, skipping initialization');
      return;
    }

    await User.findByIdAndUpdate(userId, {
      'proSubscription.promotionCoupons': {
        monthly: monthlyAmount,
        available: monthlyAmount,
        used: 0,
        rollover: 0,
        lastRefresh: now,
        highlightCoupons: highlightedAmount,
        usedHighlightCoupons: 0,
      },
    });

    paymentLogger.info(`🎟️ Initialized ${monthlyAmount} promotion coupons for Pro user ${userId} (${highlightedAmount} highlighted, ${premiumAmount} premium)`);
  }

  if (isEnterpriseProduct) {
    // Get the Enterprise product config for coupon amounts
    const agencyProduct = await Product.findOne({ productId: 'agency_yearly' }).lean();
    const monthlyAmount = agencyProduct?.promotionCoupons || 5;

    // Find the user's agency
    const user = await User.findById(userId);
    if (!user?.agencyId) {
      if (!isProduction) paymentLogger.info('📋 No agency found yet - promotion coupons will be initialized when agency is created');
      return;
    }

    const agency = await Agency.findById(user.agencyId);
    if (!agency) return;

    // Check if agency already has coupons (renewal - don't overwrite)
    if (agency.promotionCoupons?.available > 0) {
      if (!isProduction) paymentLogger.info('✅ Agency already has promotion coupons, skipping initialization');
      return;
    }

    agency.promotionCoupons = {
      monthly: monthlyAmount,
      available: monthlyAmount,
      used: 0,
      lastRefresh: now,
    };

    await agency.save();

    paymentLogger.info(`🎟️ Initialized ${monthlyAmount} promotion coupons for agency ${agency.name}`);
  }
}

/**
 * Generate agent coupon codes for new Enterprise subscriptions
 * Creates 5 coupon codes and sends email to the agency owner
 */
/**
/**
 * Maximum validity period for generated promotion coupons.
 * Pro users get 30 days, agencies/enterprise get 14 days (2 weeks).
 */
const MAX_COUPON_VALIDITY_DAYS_PRO = 30;
const MAX_COUPON_VALIDITY_DAYS_AGENCY = 14;

/**
 * Generate PromotionCoupon records for a new Pro subscriber.
 * Returns an array of { tier, code } objects to embed in the welcome email.
 */
async function generateProSubscriptionCoupons(
  userId: string,
  highlightedCount: number,
  premiumCount: number,
  featuredCount: number,
  validUntil: Date,
  maxValidityDays: number = MAX_COUPON_VALIDITY_DAYS_PRO,
): Promise<Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }>> {
  const results: Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }> = [];

  // Cap validity to maxValidityDays from now regardless of what the
  // caller passed (end-of-month or subscription expiry can exceed the limit).
  const maxExpiry = new Date(Date.now() + maxValidityDays * 24 * 60 * 60 * 1000);
  const cappedValidUntil = validUntil < maxExpiry ? validUntil : maxExpiry;

  const tiers: Array<{ tier: 'highlight' | 'premium' | 'featured'; count: number }> = [
    { tier: 'highlight', count: highlightedCount },
    { tier: 'premium', count: premiumCount },
    { tier: 'featured', count: featuredCount },
  ];

  for (const { tier, count } of tiers) {
    for (let i = 0; i < count; i++) {
      const prefix = tier === 'highlight' ? 'HL' : tier === 'premium' ? 'PR' : 'FT';
      const code = `${prefix}-${userId.slice(-5).toUpperCase()}-${generateSecureRandomString(6).toUpperCase()}`;

      await PromotionCoupon.create({
        code,
        description: `Pro subscription ${tier} coupon for user ${userId}`,
        discountType: 'percentage',
        discountValue: 100,
        validFrom: new Date(),
        validUntil: cappedValidUntil,
        status: 'active',
        maxTotalUses: 1,   // single-use only
        maxUsesPerUser: 1, // single-use only
        applicableTiers: [tier],
        isPublic: false,
        generatedForUserId: new mongoose.Types.ObjectId(userId),
        notes: `Auto-generated for userId:${userId}`,
      });

      results.push({ tier, code });
    }
  }

  return results;
}

async function generateEnterpriseAgentCoupons(
  userId: string,
  ownerName: string,
  ownerEmail: string
): Promise<void> {
  // Find or create agency for this user
  let agency = await Agency.findOne({ ownerId: userId });

  if (!agency) {
    // If no agency exists yet, the coupons will be generated when they create the agency
    if (!isProduction) paymentLogger.info('📋 No agency found yet - coupons will be generated when agency is created');
    return;
  }

  // Check if coupons already exist (in case of duplicate calls)
  const existingAvailableCoupons = agency.agentCoupons.filter(
    (c: any) => c.status === 'available'
  ).length;

  if (existingAvailableCoupons >= 5) {
    if (!isProduction) paymentLogger.info('✅ Agency already has 5 available coupons');
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

  if (!isProduction) paymentLogger.info(`✅ Generated ${couponsToGenerate} agent coupons for agency ${agency.name}`);

  // Send emails with the coupon codes and welcome message
  try {
    // Fetch Enterprise product to get coupon breakdown values
    const enterpriseProduct = await Product.findOne({ productId: 'agency_yearly' }).lean();
    const promotionCoupons = {
      total: enterpriseProduct?.promotionCoupons || 5,
      premium: enterpriseProduct?.premiumCoupons || 2,
      highlighted: enterpriseProduct?.highlightedCoupons || 2,
      featured: enterpriseProduct?.featuredCoupons || 1,
    };

    // Send agent registration coupons email
    await sendAgentRegistrationCouponsEmail({
      email: ownerEmail,
      ownerName,
      agencyName: agency.name,
      coupons: newCoupons,
    });
    // Sent agent registration coupons email

    // Send welcome/thank you email with promotion coupon breakdown
    await sendEnterpriseWelcomeEmail({
      email: ownerEmail,
      ownerName,
      agencyName: agency.name,
      promotionCoupons,
      agentCoupons: enterpriseProduct?.agentCoupons || 5,
      teamMembersLimit: enterpriseProduct?.teamMembersLimit || 5,
      listingsLimit: enterpriseProduct?.listingsLimit || 750,
    });
    // Sent Enterprise welcome email with coupon breakdown
  } catch (emailError) {
    paymentLogger.error('⚠️ Failed to send Enterprise emails:', emailError);
    // Don't throw - coupons were still generated successfully
  }
}

export { generateEnterpriseAgentCoupons, generateProSubscriptionCoupons };

export default {
  processSubscriptionPayment,
  cancelSubscriptionSecurely,
  updateExpiredSubscriptions,
  verifyPaymentIntegrity,
  generateEnterpriseAgentCoupons,
  generateProSubscriptionCoupons,
};
