/**
 * LemonSqueezy Webhook Controller
 *
 * Handles webhook notifications from LemonSqueezy payment platform.
 * LemonSqueezy acts as a Merchant of Record (MoR) handling:
 * - Payment processing
 * - VAT/tax compliance
 * - Subscription lifecycle
 * - Chargebacks and refunds
 */

import { Request, Response } from 'express';
import { lemonSqueezyService } from '../services/lemonSqueezyService';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import emailService from '../services/emailService';
import { activityLogger } from '../services/activityLogger';

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
 */
export const handleLemonSqueezyWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    if (signature && !lemonSqueezyService.verifyWebhookSignature(rawBody, signature)) {
      console.error('[LemonSqueezy Webhook] Invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Parse the webhook event
    const event = lemonSqueezyService.parseWebhookEvent(req.body);

    if (!event) {
      console.error('[LemonSqueezy Webhook] Invalid event format');
      res.status(400).json({ error: 'Invalid event format' });
      return;
    }

    const eventName = event.meta.event_name;
    console.log(`[LemonSqueezy Webhook] Received event: ${eventName}`);

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
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[LemonSqueezy Webhook] Error:', error);
    // Return 200 to prevent retries for unrecoverable errors
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Handle order created (one-time purchase or first subscription payment)
 */
async function handleOrderCreated(event: any): Promise<void> {
  try {
    const customData = event.meta.custom_data || {};
    const attributes = event.data.attributes;
    const userId = customData.user_id;
    const productId = customData.product_id;
    const planName = customData.plan_name;
    const planInterval = customData.plan_interval;

    console.log('[LemonSqueezy] Order created:', {
      orderId: event.data.id,
      userId,
      productId,
      status: attributes.status,
    });

    if (!userId) {
      console.warn('[LemonSqueezy] No user_id in custom data');
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.error('[LemonSqueezy] User not found:', userId);
      return;
    }

    // Get amount from order
    const amount = attributes.total ? parseFloat(attributes.total) / 100 : 0;
    const currency = attributes.currency || 'EUR';

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
        productId: productId || `lemonsqueezy_${event.data.id}`,
        name: planName || attributes.first_order_item?.product_name || 'LemonSqueezy Subscription',
        description: 'Subscription via LemonSqueezy',
        price: amount,
        currency: currency.toUpperCase(),
        billingPeriod: planInterval === 'year' ? 'yearly' : 'monthly',
        isActive: true,
        type: 'subscription',
      });
    }

    // Only process if order is paid
    if (attributes.status === 'paid') {
      // Process the subscription payment
      const result = await processSubscriptionPayment({
        userId,
        productId: product.productId,
        store: 'lemonsqueezy',
        amount,
        currency: currency.toUpperCase(),
        transactionId: event.data.id,
        purchaseToken: attributes.identifier || event.data.id,
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
          amount,
          currency: currency === 'EUR' ? '€' : currency,
          expiresAt: result.subscription.expirationDate,
          transactionId: event.data.id,
        });
      } catch (emailError) {
        console.error('[LemonSqueezy] Failed to send email:', emailError);
      }

      // Log subscription creation
      activityLogger.logSubscriptionCreated(
        userId,
        user.email,
        product.name || planName || 'Subscription',
        amount,
        currency.toUpperCase(),
        result.subscription.expirationDate,
        event.data.id
      );
    }
  } catch (error: any) {
    console.error('[LemonSqueezy] Error handling order_created:', error);
    throw error;
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

    console.log('[LemonSqueezy] Subscription created:', {
      subscriptionId: event.data.id,
      userId,
      status: attributes.status,
    });

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

    console.log('[LemonSqueezy] Subscription payment success:', subscriptionId);

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
    const product = user.subscriptionProductId
      ? await Product.findOne({ productId: user.subscriptionProductId })
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

    // Log renewal
    activityLogger.logSubscriptionRenewed(
      String(user._id),
      user.email,
      product?.name || 'Subscription',
      amount,
      currency.toUpperCase(),
      renewsAt || new Date()
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

    console.log('[LemonSqueezy] Subscription updated:', subscriptionId);

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

    console.log('[LemonSqueezy] Subscription cancelled:', subscriptionId);

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

    console.log('[LemonSqueezy] Subscription expired:', subscriptionId);

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

    console.log('[LemonSqueezy] Subscription paused:', subscriptionId);

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

    console.log('[LemonSqueezy] Subscription resumed:', subscriptionId);

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

    console.log('[LemonSqueezy] Subscription payment failed:', subscriptionId);

    const user = await User.findOne({ lemonSqueezySubscriptionId: subscriptionId });
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'past_due',
      });

      // Send payment failed email
      try {
        await emailService.sendPaymentFailed(user.email, user.name || 'Customer', {
          planName: user.subscriptionProductName || 'Subscription',
          updatePaymentUrl: `${process.env.FRONTEND_URL}/account/subscription`,
        });
      } catch (emailError) {
        console.error('[LemonSqueezy] Failed to send payment failed email:', emailError);
      }
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

    console.log('[LemonSqueezy] Order refunded:', orderId);

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

export default {
  handleLemonSqueezyWebhook,
  getLemonSqueezyConfig,
  getCustomerPortal,
};
