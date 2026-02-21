/**
 * LemonSqueezy Webhook Controller
 *
 * Handles webhook events from LemonSqueezy payment provider.
 * All webhooks are verified using HMAC-SHA256 signature before processing.
 *
 * Supported events:
 * - subscription_created: New subscription activated
 * - subscription_updated: Subscription status changed
 * - subscription_cancelled: User cancelled subscription
 * - subscription_resumed: Cancelled subscription resumed
 * - subscription_expired: Subscription period ended
 * - subscription_paused: Subscription paused
 * - subscription_unpaused: Subscription unpaused
 * - subscription_payment_success: Recurring payment succeeded
 * - subscription_payment_failed: Recurring payment failed
 * - subscription_payment_recovered: Failed payment recovered
 * - order_created: One-time purchase completed
 */

import crypto from 'crypto';
import { Request, Response } from 'express';
import { lemonSqueezyService } from '../services/lemonSqueezy';
import { processSubscriptionPayment, cancelSubscriptionSecurely } from '../services/subscriptionPaymentService';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import { paymentLogger } from '../utils/logger';
import type {
  WebhookEvent,
  WebhookEventName,
  SubscriptionAttributes,
  SubscriptionInvoiceAttributes,
  CheckoutCustomData,
} from '../services/lemonSqueezy/types';

/**
 * Verify webhook signature using HMAC-SHA256
 * LemonSqueezy sends the signature in the X-Signature header
 */
function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = lemonSqueezyService.getWebhookSecret();
  if (!secret) {
    paymentLogger.error('LemonSqueezy webhook secret not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Extract custom data from webhook event
 */
function getCustomData(event: WebhookEvent): CheckoutCustomData | null {
  return event.meta?.custom_data || null;
}

/**
 * Map LemonSqueezy subscription status to our internal status
 */
function mapSubscriptionStatus(lsStatus: string): string {
  const statusMap: Record<string, string> = {
    on_trial: 'trial',
    active: 'active',
    paused: 'paused',
    past_due: 'grace',
    unpaid: 'grace',
    cancelled: 'pending_cancellation',
    expired: 'expired',
  };
  return statusMap[lsStatus] || 'active';
}

/**
 * @desc    Handle LemonSqueezy webhook events
 * @route   POST /api/webhooks/lemon-squeezy
 * @access  Public (verified via HMAC signature)
 */
export const handleLemonSqueezyWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get raw body for signature verification
    const rawBody = (req as any).rawBody as Buffer;
    const signature = req.headers['x-signature'] as string;

    if (!rawBody || !signature) {
      paymentLogger.error('LemonSqueezy webhook: Missing body or signature');
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    // Verify HMAC signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      paymentLogger.error('LemonSqueezy webhook: Invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.body as WebhookEvent;
    const eventName = event.meta?.event_name;

    if (!eventName) {
      paymentLogger.error('LemonSqueezy webhook: Missing event_name');
      res.status(400).json({ error: 'Missing event_name' });
      return;
    }

    paymentLogger.info(`LemonSqueezy webhook received: ${eventName} (ID: ${event.data?.id})`);

    // Route to appropriate handler
    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(event as WebhookEvent<SubscriptionAttributes>);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(event as WebhookEvent<SubscriptionAttributes>);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event as WebhookEvent<SubscriptionAttributes>);
        break;

      case 'subscription_resumed':
        await handleSubscriptionResumed(event as WebhookEvent<SubscriptionAttributes>);
        break;

      case 'subscription_expired':
        await handleSubscriptionExpired(event as WebhookEvent<SubscriptionAttributes>);
        break;

      case 'subscription_paused':
        await handleSubscriptionPaused(event as WebhookEvent<SubscriptionAttributes>);
        break;

      case 'subscription_unpaused':
        await handleSubscriptionUnpaused(event as WebhookEvent<SubscriptionAttributes>);
        break;

      case 'subscription_payment_success':
        await handlePaymentSuccess(event as WebhookEvent<SubscriptionInvoiceAttributes>);
        break;

      case 'subscription_payment_failed':
        await handlePaymentFailed(event as WebhookEvent<SubscriptionInvoiceAttributes>);
        break;

      case 'subscription_payment_recovered':
        await handlePaymentRecovered(event as WebhookEvent<SubscriptionInvoiceAttributes>);
        break;

      case 'order_created':
        await handleOrderCreated(event);
        break;

      default:
        paymentLogger.info(`LemonSqueezy webhook: Unhandled event ${eventName}`);
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: any) {
    paymentLogger.error('LemonSqueezy webhook error:', error);
    // Respond 200 to prevent retries for unrecoverable errors
    res.status(200).json({ received: true, error: 'Internal processing error' });
  }
};

/**
 * Handle new subscription created
 */
async function handleSubscriptionCreated(
  event: WebhookEvent<SubscriptionAttributes>
): Promise<void> {
  const attributes = event.data.attributes;
  const customData = getCustomData(event);
  const lsSubscriptionId = event.data.id;

  if (!customData?.user_id) {
    paymentLogger.error(`LemonSqueezy subscription_created: No user_id in custom_data (LS sub: ${lsSubscriptionId})`);
    return;
  }

  const userId = customData.user_id;
  paymentLogger.info(`Processing subscription_created for user ${userId} (LS: ${lsSubscriptionId})`);

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    paymentLogger.error(`LemonSqueezy subscription_created: User not found: ${userId}`);
    return;
  }

  // Resolve internal product ID from variant or custom data
  const variantId = String(attributes.variant_id);
  const internalProductId = customData.product_id
    || lemonSqueezyService.getProductIdForVariant(variantId)
    || resolveProductIdFromPlanName(customData.plan_name, customData.plan_interval);

  if (!internalProductId) {
    paymentLogger.error(`LemonSqueezy subscription_created: Cannot resolve product ID for variant ${variantId}`);
    return;
  }

  // Ensure product exists in our DB
  let product = await Product.findOne({ productId: internalProductId });
  if (!product) {
    product = await Product.create({
      productId: internalProductId,
      name: attributes.product_name || customData.plan_name,
      description: `${attributes.product_name} subscription via LemonSqueezy`,
      price: 0, // Price is handled by LemonSqueezy
      currency: 'EUR',
      billingPeriod: customData.plan_interval === 'year' ? 'yearly' : 'monthly',
      isActive: true,
    });
  }

  // Process the subscription payment atomically
  await processSubscriptionPayment({
    userId,
    productId: internalProductId,
    store: 'web',
    amount: 0, // Actual billing handled by LemonSqueezy as MoR
    currency: 'EUR',
    transactionId: `ls_sub_${lsSubscriptionId}`,
    purchaseToken: `ls_${lsSubscriptionId}`,
  });

  // Store LemonSqueezy subscription ID on the user for future operations
  await User.findByIdAndUpdate(userId, {
    'subscriptionMetadata.lemonSqueezySubscriptionId': lsSubscriptionId,
    'subscriptionMetadata.lemonSqueezyCustomerId': String(attributes.customer_id),
    subscriptionRenewalDate: attributes.renews_at ? new Date(attributes.renews_at) : undefined,
  });

  paymentLogger.info(`Subscription activated for user ${userId} via LemonSqueezy (${internalProductId})`);
}

/**
 * Handle subscription status update
 */
async function handleSubscriptionUpdated(
  event: WebhookEvent<SubscriptionAttributes>
): Promise<void> {
  const attributes = event.data.attributes;
  const customData = getCustomData(event);
  const lsSubscriptionId = event.data.id;

  const userId = customData?.user_id || await findUserByLsSubscription(lsSubscriptionId);
  if (!userId) {
    paymentLogger.warn(`LemonSqueezy subscription_updated: Cannot find user for LS sub ${lsSubscriptionId}`);
    return;
  }

  const newStatus = mapSubscriptionStatus(attributes.status);

  // Update our subscription record
  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ['active', 'grace', 'trial', 'pending_cancellation', 'paused'] },
  });

  if (subscription) {
    subscription.status = newStatus as any;
    if (attributes.renews_at) {
      subscription.renewalDate = new Date(attributes.renews_at);
    }
    if (attributes.ends_at) {
      subscription.expirationDate = new Date(attributes.ends_at);
    }
    subscription.autoRenewing = !attributes.cancelled;
    subscription.lastUpdated = new Date();
    await subscription.save();

    // Sync status to User
    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: newStatus,
      subscriptionRenewalDate: attributes.renews_at ? new Date(attributes.renews_at) : undefined,
    });
  }

  paymentLogger.info(`Subscription updated for user ${userId}: status=${newStatus} (LS: ${lsSubscriptionId})`);
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(
  event: WebhookEvent<SubscriptionAttributes>
): Promise<void> {
  const attributes = event.data.attributes;
  const customData = getCustomData(event);
  const lsSubscriptionId = event.data.id;

  const userId = customData?.user_id || await findUserByLsSubscription(lsSubscriptionId);
  if (!userId) return;

  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ['active', 'grace', 'trial'] },
  });

  if (subscription) {
    await cancelSubscriptionSecurely(
      subscription._id as string,
      userId,
      'Cancelled via LemonSqueezy'
    );
  }

  paymentLogger.info(`Subscription cancelled for user ${userId} (LS: ${lsSubscriptionId}), ends at: ${attributes.ends_at}`);
}

/**
 * Handle subscription resumed after cancellation
 */
async function handleSubscriptionResumed(
  event: WebhookEvent<SubscriptionAttributes>
): Promise<void> {
  const attributes = event.data.attributes;
  const customData = getCustomData(event);
  const lsSubscriptionId = event.data.id;

  const userId = customData?.user_id || await findUserByLsSubscription(lsSubscriptionId);
  if (!userId) return;

  const subscription = await Subscription.findOne({
    userId,
    status: 'pending_cancellation',
  });

  if (subscription) {
    subscription.status = 'active';
    subscription.autoRenewing = true;
    subscription.canceledAt = undefined;
    subscription.willCancelAt = undefined;
    if (attributes.renews_at) {
      subscription.renewalDate = new Date(attributes.renews_at);
    }
    await subscription.save();

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: 'active',
      isSubscribed: true,
    });
  }

  paymentLogger.info(`Subscription resumed for user ${userId} (LS: ${lsSubscriptionId})`);
}

/**
 * Handle subscription expired
 */
async function handleSubscriptionExpired(
  event: WebhookEvent<SubscriptionAttributes>
): Promise<void> {
  const customData = getCustomData(event);
  const lsSubscriptionId = event.data.id;

  const userId = customData?.user_id || await findUserByLsSubscription(lsSubscriptionId);
  if (!userId) return;

  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ['active', 'pending_cancellation', 'grace'] },
  });

  if (subscription) {
    subscription.status = 'expired';
    subscription.autoRenewing = false;
    await subscription.save();

    await User.findByIdAndUpdate(userId, {
      isSubscribed: false,
      subscriptionStatus: 'expired',
      subscriptionPlan: undefined,
      subscriptionProductName: undefined,
      activeSubscriptionId: undefined,
    });
  }

  paymentLogger.info(`Subscription expired for user ${userId} (LS: ${lsSubscriptionId})`);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(
  event: WebhookEvent<SubscriptionAttributes>
): Promise<void> {
  const customData = getCustomData(event);
  const lsSubscriptionId = event.data.id;

  const userId = customData?.user_id || await findUserByLsSubscription(lsSubscriptionId);
  if (!userId) return;

  await Subscription.findOneAndUpdate(
    { userId, status: { $in: ['active', 'grace'] } },
    { status: 'paused', pausedAt: new Date(), autoRenewing: false }
  );

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: 'paused',
  });

  paymentLogger.info(`Subscription paused for user ${userId} (LS: ${lsSubscriptionId})`);
}

/**
 * Handle subscription unpaused
 */
async function handleSubscriptionUnpaused(
  event: WebhookEvent<SubscriptionAttributes>
): Promise<void> {
  const attributes = event.data.attributes;
  const customData = getCustomData(event);
  const lsSubscriptionId = event.data.id;

  const userId = customData?.user_id || await findUserByLsSubscription(lsSubscriptionId);
  if (!userId) return;

  await Subscription.findOneAndUpdate(
    { userId, status: 'paused' },
    {
      status: 'active',
      pausedAt: undefined,
      autoRenewing: true,
      renewalDate: attributes.renews_at ? new Date(attributes.renews_at) : undefined,
    }
  );

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: 'active',
    isSubscribed: true,
  });

  paymentLogger.info(`Subscription unpaused for user ${userId} (LS: ${lsSubscriptionId})`);
}

/**
 * Handle successful recurring payment
 */
async function handlePaymentSuccess(
  event: WebhookEvent<SubscriptionInvoiceAttributes>
): Promise<void> {
  const attributes = event.data.attributes;
  const customData = getCustomData(event);

  const userId = customData?.user_id || await findUserByLsCustomer(String(attributes.customer_id));
  if (!userId) {
    paymentLogger.warn(`LemonSqueezy payment_success: Cannot find user for customer ${attributes.customer_id}`);
    return;
  }

  // Find the existing subscription and renew it
  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ['active', 'grace', 'pending_cancellation'] },
  });

  if (subscription) {
    // Amount from LemonSqueezy is in cents
    const amountInEur = attributes.total / 100;

    // Renew via our atomic service
    const internalProductId = subscription.productId;
    await processSubscriptionPayment({
      userId,
      productId: internalProductId,
      store: 'web',
      amount: amountInEur,
      currency: (attributes.currency || 'EUR').toUpperCase(),
      transactionId: `ls_inv_${event.data.id}`,
    });
  }

  paymentLogger.info(`Payment success for user ${userId}: ${attributes.total_formatted}`);
}

/**
 * Handle failed recurring payment
 */
async function handlePaymentFailed(
  event: WebhookEvent<SubscriptionInvoiceAttributes>
): Promise<void> {
  const attributes = event.data.attributes;
  const customData = getCustomData(event);

  const userId = customData?.user_id || await findUserByLsCustomer(String(attributes.customer_id));
  if (!userId) return;

  // Move to grace period
  await Subscription.findOneAndUpdate(
    { userId, status: 'active' },
    { status: 'grace', lastUpdated: new Date() }
  );

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: 'grace',
  });

  paymentLogger.warn(`Payment failed for user ${userId}: ${attributes.total_formatted}`);
}

/**
 * Handle recovered payment (after failed attempt)
 */
async function handlePaymentRecovered(
  event: WebhookEvent<SubscriptionInvoiceAttributes>
): Promise<void> {
  const attributes = event.data.attributes;
  const customData = getCustomData(event);

  const userId = customData?.user_id || await findUserByLsCustomer(String(attributes.customer_id));
  if (!userId) return;

  // Restore from grace period
  await Subscription.findOneAndUpdate(
    { userId, status: 'grace' },
    { status: 'active', lastUpdated: new Date() }
  );

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: 'active',
    isSubscribed: true,
  });

  paymentLogger.info(`Payment recovered for user ${userId}: ${attributes.total_formatted}`);
}

/**
 * Handle one-time order (promotions, etc.)
 */
async function handleOrderCreated(event: WebhookEvent): Promise<void> {
  const customData = getCustomData(event);
  paymentLogger.info(`Order created: ${event.data.id}, user: ${customData?.user_id || 'unknown'}`);
  // One-time orders can be handled here for promotions
}

// ====== Helper functions ======

/**
 * Find user by stored LemonSqueezy subscription ID
 */
async function findUserByLsSubscription(lsSubscriptionId: string): Promise<string | null> {
  const user = await User.findOne({
    'subscriptionMetadata.lemonSqueezySubscriptionId': lsSubscriptionId,
  }).select('_id').lean();
  return user?._id?.toString() || null;
}

/**
 * Find user by stored LemonSqueezy customer ID
 */
async function findUserByLsCustomer(lsCustomerId: string): Promise<string | null> {
  const user = await User.findOne({
    'subscriptionMetadata.lemonSqueezyCustomerId': lsCustomerId,
  }).select('_id').lean();
  return user?._id?.toString() || null;
}

/**
 * Resolve internal product ID from plan name and interval
 */
function resolveProductIdFromPlanName(planName?: string, planInterval?: string): string | null {
  if (!planName) return null;

  const name = planName.toLowerCase();
  if (name.includes('buyer')) return 'buyer_monthly';
  if (name.includes('enterprise') || name.includes('agency')) return 'agency_yearly';
  if (name.includes('pro') && planInterval === 'year') return 'seller_pro_yearly';
  if (name.includes('pro')) return 'seller_pro_monthly';

  return null;
}

export default { handleLemonSqueezyWebhook };
