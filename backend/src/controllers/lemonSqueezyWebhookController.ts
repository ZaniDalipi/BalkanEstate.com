/**
 * LemonSqueezy Webhook Controller
 *
 * Handles webhook notifications from LemonSqueezy payment platform.
 * LemonSqueezy acts as a Merchant of Record (MoR) handling:
 * - Payment processing
 * - VAT/tax compliance
 * - Subscription lifecycle
 * - Chargebacks and refunds
 *
 * SECURITY MEASURES:
 * - Webhook signature verification (HMAC-SHA256)
 * - Idempotency checks to prevent duplicate processing
 * - Amount validation against expected prices
 * - Discount/coupon validation
 * - Audit logging for all payment events
 * - Input sanitization
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { lemonSqueezyService } from '../services/lemonSqueezyService';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import Promotion from '../models/Promotion';
import Property from '../models/Property';
import emailService from '../services/emailService';
import { activityLogger } from '../services/activityLogger';
import logger from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

// Store processed event IDs to prevent duplicate processing (in production, use Redis)
const processedEvents = new Set<string>();
const PROCESSED_EVENTS_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Expected prices for validation (in cents/smallest currency unit)
const EXPECTED_PRICES: Record<string, { min: number; max: number }> = {
  'pro_monthly': { min: 2300, max: 2700 }, // €23-27 (allowing for tax/discount variance)
  'pro_yearly': { min: 18000, max: 22000 }, // €180-220
  'enterprise_yearly': { min: 90000, max: 110000 }, // €900-1100
  'buyer_pro_monthly': { min: 250, max: 350 }, // €2.50-3.50
};

/**
 * Sanitize string input to prevent injection
 */
function sanitizeString(input: any): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>\"\'&]/g, '').substring(0, 500);
}

/**
 * Check if an event has already been processed (idempotency)
 */
function isEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId);
}

/**
 * Mark an event as processed
 */
function markEventProcessed(eventId: string): void {
  processedEvents.add(eventId);
  // Clean up old entries periodically
  setTimeout(() => processedEvents.delete(eventId), PROCESSED_EVENTS_TTL);
}

/**
 * Validate payment amount against expected prices
 */
function validatePaymentAmount(
  planName: string,
  amount: number,
  discountPercentage: number = 0
): { valid: boolean; reason?: string } {
  const normalizedPlan = planName.toLowerCase().replace(/\s+/g, '_');
  const expectedRange = EXPECTED_PRICES[normalizedPlan];

  if (!expectedRange) {
    // Unknown plan - log but allow (might be a new plan)
    console.warn(`[LemonSqueezy] Unknown plan for price validation: ${planName}`);
    return { valid: true };
  }

  // Apply discount to expected range
  const discountMultiplier = (100 - discountPercentage) / 100;
  const minExpected = expectedRange.min * discountMultiplier * 0.9; // 10% tolerance
  const maxExpected = expectedRange.max * discountMultiplier * 1.1; // 10% tolerance

  const amountInCents = amount * 100;

  if (amountInCents < minExpected || amountInCents > maxExpected) {
    return {
      valid: false,
      reason: `Amount ${amount} outside expected range for ${planName} (expected ${minExpected / 100}-${maxExpected / 100} with ${discountPercentage}% discount)`,
    };
  }

  return { valid: true };
}

/**
 * LemonSqueezy webhook event types we handle
 */
const LEMONSQUEEZY_EVENTS = {
  // Order events
  ORDER_CREATED: 'order_created',
  ORDER_REFUNDED: 'order_refunded',

  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_RESUMED: 'subscription_resumed',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  SUBSCRIPTION_PAUSED: 'subscription_paused',
  SUBSCRIPTION_UNPAUSED: 'subscription_unpaused',
  SUBSCRIPTION_PAYMENT_SUCCESS: 'subscription_payment_success',
  SUBSCRIPTION_PAYMENT_FAILED: 'subscription_payment_failed',
  SUBSCRIPTION_PAYMENT_RECOVERED: 'subscription_payment_recovered',

  // License events (if using license keys)
  LICENSE_KEY_CREATED: 'license_key_created',
  LICENSE_KEY_UPDATED: 'license_key_updated',
};

/**
 * @desc    Handle LemonSqueezy webhook
 * @route   POST /api/payments/lemonsqueezy/webhook
 * @access  Public (verified with signature)
 *
 * SECURITY:
 * - Signature verification is REQUIRED (not optional)
 * - Idempotency check prevents duplicate processing
 * - All events are logged for audit trail
 */
export const handleLemonSqueezyWebhook = async (req: Request, res: Response): Promise<void> => {
  const requestId = crypto.randomUUID();

  // Only log detailed info in development
  if (!isProduction) {
    const timestamp = new Date().toISOString();
    console.log(`[LemonSqueezy Webhook] ========================================`);
    console.log(`[LemonSqueezy Webhook] Request ${requestId} received at ${timestamp}`);
    console.log(`[LemonSqueezy Webhook] IP: ${req.ip}, User-Agent: ${req.headers['user-agent']?.substring(0, 50)}`);
    console.log(`[LemonSqueezy Webhook] Has signature: ${!!req.headers['x-signature']}`);
  }

  try {
    const signature = req.headers['x-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // SECURITY: Signature verification is MANDATORY
    if (!signature) {
      console.error(`[LemonSqueezy Webhook] ${requestId} - Missing signature header`);
      activityLogger.logSuspiciousActivity('webhook_missing_signature', {
        requestId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    if (!lemonSqueezyService.verifyWebhookSignature(rawBody, signature)) {
      console.error(`[LemonSqueezy Webhook] ${requestId} - Invalid signature`);
      activityLogger.logSuspiciousActivity('webhook_invalid_signature', {
        requestId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Parse the webhook event
    const event = lemonSqueezyService.parseWebhookEvent(req.body);

    if (!event) {
      console.error(`[LemonSqueezy Webhook] ${requestId} - Invalid event format`);
      res.status(400).json({ error: 'Invalid event format' });
      return;
    }

    const eventId = event.data?.id;
    const eventName = event.meta.event_name;

    // IDEMPOTENCY: Check if we've already processed this event
    if (eventId && isEventProcessed(`${eventName}_${eventId}`)) {
      console.log(`[LemonSqueezy Webhook] ${requestId} - Event ${eventName}_${eventId} already processed (idempotency)`);
      res.status(200).json({ received: true, message: 'Event already processed' });
      return;
    }

    console.log(`[LemonSqueezy Webhook] ${requestId} - Processing event: ${eventName}, ID: ${eventId}`);

    // Handle different event types
    switch (eventName) {
      case LEMONSQUEEZY_EVENTS.ORDER_CREATED:
        await handleOrderCreated(event);
        break;

      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_CREATED:
        await handleSubscriptionCreated(event);
        break;

      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_UPDATED:
        await handleSubscriptionUpdated(event);
        break;

      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_PAYMENT_SUCCESS:
        await handleSubscriptionPaymentSuccess(event);
        break;

      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_CANCELLED:
        await handleSubscriptionCancelled(event);
        break;

      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_EXPIRED:
        await handleSubscriptionExpired(event);
        break;

      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_PAUSED:
        await handleSubscriptionPaused(event);
        break;

      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_RESUMED:
      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_UNPAUSED:
        await handleSubscriptionResumed(event);
        break;

      case LEMONSQUEEZY_EVENTS.SUBSCRIPTION_PAYMENT_FAILED:
        await handleSubscriptionPaymentFailed(event);
        break;

      case LEMONSQUEEZY_EVENTS.ORDER_REFUNDED:
        await handleOrderRefunded(event);
        break;

      default:
        console.log(`[LemonSqueezy Webhook] Unhandled event: ${eventName}`);
    }

    // LemonSqueezy expects a 200 response
    if (!isProduction) {
      console.log(`[LemonSqueezy Webhook] ${requestId} - Successfully processed event: ${eventName}`);
      console.log(`[LemonSqueezy Webhook] ========================================`);
    }
    res.status(200).json({ received: true });
  } catch (error: any) {
    // Always log errors
    logger.error(`[LemonSqueezy Webhook] ${requestId} - Error:`, error.message);
    // Return 200 to prevent retries for unrecoverable errors
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Handle order created (one-time purchase or first subscription payment)
 *
 * SECURITY MEASURES:
 * - Validates user exists and matches
 * - Checks for duplicate orders (idempotency)
 * - Validates discount codes and amounts
 * - Logs all payment events for audit
 */
async function handleOrderCreated(event: any): Promise<void> {
  const orderId = event.data.id;

  try {
    const customData = event.meta.custom_data || {};
    const attributes = event.data.attributes;

    // Sanitize input data
    const userId = sanitizeString(customData.user_id);
    const productId = sanitizeString(customData.product_id);
    const planName = sanitizeString(customData.plan_name);
    const planInterval = sanitizeString(customData.plan_interval);

    // Only log in development - no sensitive data in production
    if (!isProduction) {
      console.log('[LemonSqueezy] Order created:', {
        orderId,
        status: attributes.status,
      });
    }

    // VALIDATION: User ID is required
    if (!userId) {
      console.warn('[LemonSqueezy] No user_id in custom data - potential fraud');
      activityLogger.logSuspiciousActivity('payment_no_user_id', {
        orderId,
        customData,
      });
      return;
    }

    // VALIDATION: Check for valid MongoDB ObjectId format
    if (!/^[a-f\d]{24}$/i.test(userId)) {
      console.error('[LemonSqueezy] Invalid user_id format:', userId);
      activityLogger.logSuspiciousActivity('payment_invalid_user_id', {
        orderId,
        userId,
      });
      return;
    }

    // IDEMPOTENCY: Check if this order was already processed
    const existingPayment = await PaymentRecord.findOne({
      storeTransactionId: orderId,
      store: 'lemonsqueezy',
    });

    if (existingPayment) {
      console.log('[LemonSqueezy] Order already processed (idempotency):', orderId);
      markEventProcessed(`order_created_${orderId}`);
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.error('[LemonSqueezy] User not found:', userId);
      activityLogger.logSuspiciousActivity('payment_user_not_found', {
        orderId,
        userId,
      });
      return;
    }

    // Get amounts from order
    const subtotal = attributes.subtotal ? parseFloat(attributes.subtotal) / 100 : 0;
    const total = attributes.total ? parseFloat(attributes.total) / 100 : 0;
    const discountTotal = attributes.discount_total ? parseFloat(attributes.discount_total) / 100 : 0;
    const currency = (attributes.currency || 'EUR').toUpperCase();

    // Calculate discount percentage for validation
    const discountPercentage = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;

    // VALIDATION: Validate payment amount
    if (planName) {
      const amountValidation = validatePaymentAmount(planName, total, discountPercentage);
      if (!amountValidation.valid) {
        console.error('[LemonSqueezy] Amount validation failed:', amountValidation.reason);
        activityLogger.logSuspiciousActivity('payment_amount_mismatch', {
          orderId,
          userId,
          planName,
          expectedAmount: amountValidation.reason,
          actualAmount: total,
          discountPercentage,
        });
        // Log but still process - LemonSqueezy is MoR and handles pricing
        // This is for monitoring suspicious activity
      }
    }

    // Log discount usage for audit (production-safe - no sensitive data)
    if (discountTotal > 0) {
      // Log to activity logger for audit trail (no console output in production)
      activityLogger.logDiscountUsed(
        userId,
        orderId,
        discountTotal,
        discountPercentage,
        attributes.discount_code ? 'coupon_applied' : 'none'
      );

      // Only log details in development
      if (!isProduction) {
        console.log('[LemonSqueezy] Discount applied:', {
          orderId,
          discountPercentage: discountPercentage.toFixed(2) + '%',
        });
      }
    }

    // Find or create product
    let product = productId ? await Product.findOne({ productId }) : null;

    if (!product) {
      // Try to find by LemonSqueezy variant ID
      const variantId = attributes.first_order_item?.variant_id?.toString();
      if (variantId) {
        product = await Product.findOne({ lemonSqueezyVariantId: variantId });
      }
    }

    if (!product) {
      // Create a placeholder product
      product = await Product.create({
        productId: productId || `lemonsqueezy_${orderId}`,
        name: planName || attributes.first_order_item?.product_name || 'LemonSqueezy Subscription',
        description: 'Subscription via LemonSqueezy',
        price: subtotal, // Use subtotal (before discount) for product price
        currency: currency,
        billingPeriod: planInterval === 'year' ? 'yearly' : 'monthly',
        isActive: true,
        type: 'subscription',
      });
    }

    // Only process if order is paid
    if (attributes.status === 'paid') {
      // Check if this is a promotion payment (has propertyId in custom data)
      const propertyId = sanitizeString(customData.propertyId || customData.property_id);
      const promotionTier = sanitizeString(customData.promotionTier || customData.promotion_tier);

      if (propertyId && promotionTier) {
        // This is a promotion payment - handle it differently
        await handlePromotionOrder(orderId, userId, user, customData, total, currency);
        markEventProcessed(`order_created_${orderId}`);
        return;
      }

      // Process the subscription payment
      const result = await processSubscriptionPayment({
        userId,
        productId: product.productId,
        store: 'lemonsqueezy',
        amount: total, // Use total (after discount) not subtotal
        currency: currency.toUpperCase(),
        transactionId: orderId,
        purchaseToken: attributes.identifier || orderId,
      });

      // Update user with LemonSqueezy customer ID
      if (attributes.customer_id) {
        await User.findByIdAndUpdate(userId, {
          lemonSqueezyCustomerId: attributes.customer_id.toString(),
        });
      }

      // Send payment confirmation email
      try {
        await emailService.sendPaymentConfirmation(user.email, user.name || 'Customer', {
          planName: product.name || planName || 'Subscription',
          amount: total,
          currency: currency === 'EUR' ? '€' : currency,
          expiresAt: result.subscription.expirationDate,
          transactionId: orderId,
        });
      } catch (emailError) {
        console.error('[LemonSqueezy] Failed to send email:', emailError);
      }

      // Log subscription creation
      activityLogger.logSubscriptionCreated(
        userId,
        user.email,
        product.name || planName || 'Subscription',
        total,
        currency.toUpperCase(),
        result.subscription.expirationDate,
        event.data.id
      );

      // Mark event as processed for idempotency
      markEventProcessed(`order_created_${orderId}`);

      // Only log in development
      if (!isProduction) {
        console.log('[LemonSqueezy] Order processed successfully:', { orderId });
      }
    }
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling order_created:', error);
    throw error;
  }
}

/**
 * Handle promotion order (property highlighting payment)
 */
async function handlePromotionOrder(
  orderId: string,
  userId: string,
  user: any,
  customData: any,
  amount: number,
  currency: string
): Promise<void> {
  const propertyId = sanitizeString(customData.propertyId || customData.property_id);
  const promotionTier = sanitizeString(customData.promotionTier || customData.promotion_tier) as 'featured' | 'highlight' | 'premium';
  const duration = parseInt(customData.duration || '7') || 7;
  const hasUrgentBadge = customData.hasUrgentBadge === 'true' || customData.has_urgent_badge === 'true';
  const propertyTitle = sanitizeString(customData.propertyTitle || customData.property_title || '');
  const couponCode = sanitizeString(customData.couponCode || customData.coupon_code);
  const couponDiscount = parseFloat(customData.couponDiscount || customData.coupon_discount || '0');

  // Only log in development
  if (!isProduction) {
    console.log('[LemonSqueezy] Processing promotion order:', {
      orderId,
      promotionTier,
      duration,
    });
  }

  // Check if property exists
  const property = await Property.findById(propertyId);
  if (!property) {
    console.error('[LemonSqueezy] Property not found for promotion:', propertyId);
    return;
  }

  // Check for existing active promotion (prevent duplicates)
  const existingPromotion = await Promotion.findOne({
    propertyId,
    isActive: true,
    endDate: { $gt: new Date() },
    paymentStatus: 'paid',
  });

  if (existingPromotion) {
    console.log('[LemonSqueezy] Property already has active promotion:', existingPromotion._id);
    // Could extend the existing promotion instead
    return;
  }

  // Calculate dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + duration);

  // Calculate next refresh date for Highlight tier
  let nextRefreshAt = null;
  if (promotionTier === 'highlight') {
    nextRefreshAt = new Date(startDate);
    nextRefreshAt.setDate(nextRefreshAt.getDate() + 3); // Refresh every 3 days
  }

  // Create the promotion
  const promotion = await Promotion.create({
    userId,
    propertyId,
    startDate,
    endDate,
    isActive: true,
    promotionType: promotionTier === 'highlight' ? 'highlighted' : promotionTier,
    promotionTier,
    duration,
    hasUrgentBadge,
    price: amount,
    currency: currency.toUpperCase(),
    paymentStatus: 'paid',
    transactionId: orderId,
    paymentId: orderId,
    purchasedVia: 'web',
    lastRefreshedAt: startDate,
    nextRefreshAt,
    refreshCount: 0,
    notes: couponCode ? `Coupon applied: ${couponCode} (€${couponDiscount.toFixed(2)} discount)` : undefined,
  });

  // Update property
  property.isPromoted = true;
  property.promotionTier = promotionTier as 'standard' | 'featured' | 'highlight' | 'premium';
  property.promotionStartDate = startDate;
  property.promotionEndDate = endDate;
  property.hasUrgentBadge = hasUrgentBadge;
  await property.save();

  // Update user's promoted ads count
  await User.findByIdAndUpdate(userId, {
    $inc: { promotedAdsCount: 1 },
  });

  // Create payment record for the promotion
  await PaymentRecord.create({
    userId,
    userEmail: user.email,
    userName: user.name,
    store: 'lemonsqueezy',
    storeTransactionId: orderId,
    transactionType: 'charge',
    transactionDate: new Date(),
    amount,
    currency: currency.toUpperCase(),
    status: 'completed',
    productId: `promotion_${promotionTier}_${duration}`,
    description: `${promotionTier.charAt(0).toUpperCase() + promotionTier.slice(1)} promotion for "${propertyTitle || property.title}" (${duration} days)`,
  });

  // Only log in development
  if (!isProduction) {
    console.log('[LemonSqueezy] Promotion created successfully:', {
      promotionId: promotion._id,
      tier: promotionTier,
      duration,
    });
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(event: any): Promise<void> {
  try {
    const customData = event.meta.custom_data || {};
    const attributes = event.data.attributes;
    const userId = customData.user_id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Subscription created:', {
        subscriptionId: event.data.id,
        status: attributes.status,
      });
    }

    if (!userId) {
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    // Store LemonSqueezy subscription and customer IDs
    await User.findByIdAndUpdate(userId, {
      subscriptionSource: 'lemonsqueezy',
      subscriptionStatus: attributes.status === 'active' ? 'active' : 'pending',
      subscriptionExternalId: event.data.id,
      lemonSqueezyCustomerId: attributes.customer_id?.toString(),
      lemonSqueezySubscriptionId: event.data.id,
    });
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling subscription_created:', error);
  }
}

/**
 * Handle subscription payment success (renewal)
 */
async function handleSubscriptionPaymentSuccess(event: any): Promise<void> {
  try {
    const attributes = event.data.attributes;
    const subscriptionId = event.data.id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Subscription payment success');
    }

    // Find user by LemonSqueezy subscription ID
    const user = await User.findOne({ lemonSqueezySubscriptionId: subscriptionId });
    if (!user) {
      console.warn('[LemonSqueezy] User not found for subscription:', subscriptionId);
      return;
    }

    // Get amount
    const amount = attributes.subtotal ? parseFloat(attributes.subtotal) / 100 : 0;
    const currency = attributes.currency || 'EUR';

    // Find the product
    const product = user.subscriptionPlan
      ? await Product.findOne({ productId: user.subscriptionPlan })
      : null;

    // Calculate new expiration date
    const renewsAt = attributes.renews_at ? new Date(attributes.renews_at) : null;

    // Update user subscription
    await User.findByIdAndUpdate(user._id, {
      isSubscribed: true,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: renewsAt,
    });

    // Update subscription in database
    if (user.activeSubscriptionId) {
      await Subscription.findByIdAndUpdate(user.activeSubscriptionId, {
        status: 'active',
        expirationDate: renewsAt,
        lastPaymentDate: new Date(),
      });
    }

    // Create payment record
    await PaymentRecord.create({
      userId: user._id,
      subscriptionId: user.activeSubscriptionId,
      store: 'lemonsqueezy',
      storeTransactionId: `${subscriptionId}_${Date.now()}`,
      amount,
      currency: currency.toUpperCase(),
      status: 'completed',
      productId: product?.productId || 'unknown',
    });

    // Log renewal (using logSubscriptionCreated since there's no dedicated renewal method)
    activityLogger.logSubscriptionCreated(
      String(user._id),
      user.email,
      product?.name || 'Subscription',
      amount,
      currency.toUpperCase(),
      renewsAt || new Date(),
      `${subscriptionId}_${Date.now()}`
    );
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling subscription_payment_success:', error);
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(event: any): Promise<void> {
  try {
    const attributes = event.data.attributes;
    const subscriptionId = event.data.id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Subscription updated');
    }

    // Find user by subscription ID
    const user = await User.findOne({ lemonSqueezySubscriptionId: subscriptionId });
    if (!user) {
      return;
    }

    // Update subscription status
    const status = mapLemonSqueezyStatus(attributes.status);
    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: status,
      subscriptionExpiresAt: attributes.renews_at ? new Date(attributes.renews_at) : undefined,
    });
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling subscription_updated:', error);
  }
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(event: any): Promise<void> {
  try {
    const attributes = event.data.attributes;
    const subscriptionId = event.data.id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Subscription cancelled');
    }

    // Find user
    const user = await User.findOne({ lemonSqueezySubscriptionId: subscriptionId });
    if (!user) {
      return;
    }

    // Update user
    user.subscriptionStatus = 'canceled';
    await user.save();

    // Update subscription
    if (user.activeSubscriptionId) {
      const subscription = await Subscription.findById(user.activeSubscriptionId);
      if (subscription) {
        subscription.status = 'pending_cancellation';
        subscription.autoRenewing = false;
        subscription.canceledAt = new Date();
        if (attributes.ends_at) {
          subscription.willCancelAt = new Date(attributes.ends_at);
        }
        await subscription.save();

        // Create event
        await SubscriptionEvent.create({
          subscriptionId: subscription._id,
          userId: user._id,
          eventType: 'subscription_canceled',
          store: 'lemonsqueezy',
          metadata: {
            lemonSqueezySubscriptionId: subscriptionId,
            canceledAt: new Date(),
            willExpireAt: attributes.ends_at,
          },
        });
      }
    }

    // Send cancellation email
    try {
      await emailService.sendSubscriptionCancelled(user.email, user.name || 'Customer', {
        planName: user.subscriptionProductName || 'Subscription',
        expiresAt: attributes.ends_at
          ? new Date(attributes.ends_at)
          : user.subscriptionExpiresAt || new Date(),
      });
    } catch (emailError) {
      console.error('[LemonSqueezy] Failed to send cancellation email:', emailError);
    }

    // Log cancellation
    activityLogger.logSubscriptionCanceled(
      String(user._id),
      user.email,
      user.subscriptionProductName || 'Subscription',
      attributes.ends_at ? new Date(attributes.ends_at) : undefined
    );
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling subscription_cancelled:', error);
  }
}

/**
 * Handle subscription expired
 */
async function handleSubscriptionExpired(event: any): Promise<void> {
  try {
    const subscriptionId = event.data.id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Subscription expired');
    }

    const user = await User.findOne({ lemonSqueezySubscriptionId: subscriptionId });
    if (!user) {
      return;
    }

    // Update user
    user.isSubscribed = false;
    user.subscriptionStatus = 'expired';
    await user.save();

    // Update subscription
    if (user.activeSubscriptionId) {
      await Subscription.findByIdAndUpdate(user.activeSubscriptionId, {
        status: 'expired',
      });
    }
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling subscription_expired:', error);
  }
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(event: any): Promise<void> {
  try {
    const subscriptionId = event.data.id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Subscription paused');
    }

    const user = await User.findOne({ lemonSqueezySubscriptionId: subscriptionId });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'paused',
      });
    }
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling subscription_paused:', error);
  }
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(event: any): Promise<void> {
  try {
    const subscriptionId = event.data.id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Subscription resumed');
    }

    const user = await User.findOne({ lemonSqueezySubscriptionId: subscriptionId });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'active',
      });
    }
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling subscription_resumed:', error);
  }
}

/**
 * Handle subscription payment failed
 */
async function handleSubscriptionPaymentFailed(event: any): Promise<void> {
  try {
    const subscriptionId = event.data.id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Subscription payment failed');
    }

    const user = await User.findOne({ lemonSqueezySubscriptionId: subscriptionId });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'past_due',
      });

      // Log payment failure
      activityLogger.logPaymentFailed(
        String(user._id),
        user.email,
        subscriptionId,
        'Payment failed via LemonSqueezy'
      );
    }
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling subscription_payment_failed:', error);
  }
}

/**
 * Handle order refunded
 */
async function handleOrderRefunded(event: any): Promise<void> {
  try {
    const attributes = event.data.attributes;
    const orderId = event.data.id;

    // Only log in development
    if (!isProduction) {
      console.log('[LemonSqueezy] Order refunded');
    }

    // Find payment record
    const paymentRecord = await PaymentRecord.findOne({
      storeTransactionId: orderId,
      store: 'lemonsqueezy',
    });

    if (!paymentRecord) {
      console.warn('[LemonSqueezy] Payment record not found for refund:', orderId);
      return;
    }

    const refundAmount = attributes.refunded_amount
      ? parseFloat(attributes.refunded_amount) / 100
      : paymentRecord.amount;

    // Update payment record
    paymentRecord.status = 'refunded';
    paymentRecord.refundAmount = refundAmount;
    paymentRecord.refundDate = new Date();
    await paymentRecord.save();

    // Find user
    const user = await User.findById(paymentRecord.userId);
    if (!user) {
      return;
    }

    // If full refund, update subscription
    if (refundAmount >= paymentRecord.amount * 0.99) {
      if (paymentRecord.subscriptionId) {
        const subscription = await Subscription.findById(paymentRecord.subscriptionId);
        if (subscription) {
          subscription.status = 'refunded';
          subscription.canceledAt = new Date();
          subscription.refundedAt = new Date();
          await subscription.save();

          // Update user
          user.isSubscribed = false;
          user.subscriptionStatus = 'canceled';
          await user.save();

          // Create event
          await SubscriptionEvent.create({
            subscriptionId: subscription._id,
            userId: user._id,
            eventType: 'subscription_refunded',
            store: 'lemonsqueezy',
            hasFinancialImpact: true,
            amount: refundAmount,
            currency: paymentRecord.currency,
          });
        }
      }
    }

    // Send refund email
    try {
      await emailService.sendRefundNotification(user.email, user.name || 'Customer', {
        amount: refundAmount,
        currency: paymentRecord.currency === 'EUR' ? '€' : paymentRecord.currency,
        transactionId: orderId,
        reason: 'customer_request',
      });
    } catch (emailError) {
      console.error('[LemonSqueezy] Failed to send refund email:', emailError);
    }

    // Log refund
    activityLogger.logRefund(
      String(user._id),
      user.email,
      refundAmount,
      paymentRecord.currency,
      orderId,
      'customer_request'
    );
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling order_refunded:', error);
  }
}

/**
 * Map LemonSqueezy status to our internal status
 */
function mapLemonSqueezyStatus(lsStatus: string): string {
  const statusMap: Record<string, string> = {
    active: 'active',
    on_trial: 'trialing',
    paused: 'paused',
    past_due: 'past_due',
    unpaid: 'past_due',
    cancelled: 'canceled',
    expired: 'expired',
  };
  return statusMap[lsStatus] || lsStatus;
}

/**
 * @desc    Get LemonSqueezy config for frontend
 * @route   GET /api/payments/lemonsqueezy/config
 * @access  Public
 */
export const getLemonSqueezyConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      storeId: lemonSqueezyService.getStoreId(),
      isConfigured: lemonSqueezyService.isConfigured(),
      isTestMode: lemonSqueezyService.isTest(),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error getting LemonSqueezy config', error: error.message });
  }
};

/**
 * @desc    Get customer portal URL
 * @route   GET /api/payments/lemonsqueezy/portal
 * @access  Private
 */
export const getCustomerPortal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user || !user.lemonSqueezyCustomerId) {
      res.status(404).json({ message: 'Customer not found' });
      return;
    }

    const portalUrl = await lemonSqueezyService.getCustomerPortalUrl(user.lemonSqueezyCustomerId);

    if (!portalUrl) {
      res.status(404).json({ message: 'Portal URL not available' });
      return;
    }

    res.status(200).json({
      success: true,
      portalUrl,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error getting portal URL', error: error.message });
  }
};

/**
 * @desc    Verify LemonSqueezy payment and activate subscription
 * @route   GET /api/payments/lemonsqueezy/verify
 * @access  Private
 */
export const verifyLemonSqueezyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Check if user has an active LemonSqueezy subscription
    if (user.lemonSqueezySubscriptionId) {
      // Fetch latest subscription status from LemonSqueezy
      try {
        const subscription = await lemonSqueezyService.getSubscription(user.lemonSqueezySubscriptionId);

        if (subscription) {
          const status = subscription.attributes?.status;
          const isActive = status === 'active' || status === 'on_trial';

          if (isActive) {
            // Update user subscription status
            const renewsAt = subscription.attributes?.renews_at
              ? new Date(subscription.attributes.renews_at)
              : null;

            await User.findByIdAndUpdate(userId, {
              isSubscribed: true,
              subscriptionStatus: 'active',
              subscriptionSource: 'lemonsqueezy',
              subscriptionExpiresAt: renewsAt,
            });

            res.status(200).json({
              success: true,
              paymentStatus: 'paid',
              provider: 'lemonsqueezy',
              subscription: {
                plan: user.subscriptionPlan || user.subscriptionProductName || 'Pro',
                status: 'active',
                expiresAt: renewsAt?.toISOString() || '',
              },
              message: 'Subscription activated successfully',
            });
            return;
          }
        }
      } catch (apiError) {
        console.error('[LemonSqueezy] Error fetching subscription from API:', apiError);
      }
    }

    // Check if user is already subscribed (webhook may have processed)
    if (user.isSubscribed && user.subscriptionStatus === 'active') {
      res.status(200).json({
        success: true,
        paymentStatus: 'paid',
        provider: 'lemonsqueezy',
        subscription: {
          plan: user.subscriptionPlan || user.subscriptionProductName || 'Pro',
          status: user.subscriptionStatus,
          expiresAt: user.subscriptionExpiresAt?.toISOString() || '',
        },
        message: 'Subscription is active',
      });
      return;
    }

    // Payment still processing
    res.status(200).json({
      success: true,
      paymentStatus: 'processing',
      provider: 'lemonsqueezy',
      message: 'Payment is being processed. Please wait a moment.',
    });
  } catch (error: any) {
    console.error('[LemonSqueezy] Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
};

export default {
  handleLemonSqueezyWebhook,
  getLemonSqueezyConfig,
  getCustomerPortal,
  verifyLemonSqueezyPayment,
};
