/**
 * Universal Webhook Controller
 *
 * Processes webhook events from ANY registered payment provider.
 * The controller is completely provider-agnostic — it only works with
 * NormalizedWebhookEvent objects produced by the provider adapters.
 *
 * Flow:
 * 1. Route identifies the provider from the URL param (:provider)
 * 2. Provider adapter verifies the signature and normalizes the event
 * 3. This controller processes the normalized event (business logic)
 *
 * Adding a new provider requires ZERO changes to this file.
 */

import { Request, Response } from 'express';
import { providerRegistry } from '../services/providers/providerRegistry';
import {
  NormalizedWebhookEvent,
  VerifyPaymentResult,
} from '../interfaces/IPaymentProvider';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import { webhookLogger, paymentLogger } from '../utils/logger';

/**
 * @desc    Handle webhook events from any registered provider
 * @route   POST /api/webhooks/:provider
 * @access  Public (verified via provider-specific signature)
 */
export const handleProviderWebhook = async (req: Request, res: Response): Promise<void> => {
  const providerName = req.params.provider as string;

  try {
    // 1. Look up the provider adapter
    const provider = providerRegistry.get(providerName);

    if (!provider) {
      webhookLogger.error(`Webhook received for unknown provider: ${providerName}`);
      res.status(404).json({ error: `Unknown payment provider: ${providerName}` });
      return;
    }

    if (!provider.isConfigured()) {
      webhookLogger.error(`Webhook received for unconfigured provider: ${providerName}`);
      res.status(503).json({ error: `Provider ${providerName} is not configured` });
      return;
    }

    // 2. Verify signature and parse into normalized event
    const result = provider.verifyAndParseWebhook(req);

    if (!result.valid || !result.event) {
      webhookLogger.error(`${providerName} webhook: signature verification failed - ${result.error}`);
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = result.event;

    webhookLogger.info(`Webhook [${providerName}]: ${event.rawType} -> ${event.type} (${event.eventId})`);

    // 3. Route to appropriate handler based on normalized event type
    switch (event.type) {
      case 'payment.completed':
        await handlePaymentCompleted(event);
        break;

      case 'subscription.renewed':
        await handleSubscriptionRenewed(event);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event);
        break;

      case 'payment.refunded':
        await handlePaymentRefunded(event);
        break;

      case 'payment.disputed':
        await handlePaymentDisputed(event);
        break;

      default:
        webhookLogger.info(`Webhook [${providerName}]: Unhandled event type: ${event.rawType}`);
    }

    // Always respond 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    webhookLogger.error(`Webhook [${providerName}] processing error: ${message}`);
    // Still 200 to prevent retries for errors we already received
    res.status(200).json({ received: true });
  }
};

/**
 * @desc    Verify a payment by session ID for any provider
 * @route   GET /api/payments/:provider/verify/:sessionId
 * @access  Private
 */
export const verifyProviderPayment = async (req: Request, res: Response): Promise<void> => {
  const providerName = req.params.provider as string;
  const sessionId = req.params.sessionId as string;
  const userId = (req as any).user?._id;

  try {
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ message: 'Session ID is required' });
      return;
    }

    const provider = providerRegistry.get(providerName);
    if (!provider) {
      res.status(404).json({ message: `Unknown payment provider: ${providerName}` });
      return;
    }

    const result: VerifyPaymentResult = await provider.verifyPayment(sessionId, String(userId));

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(200).json(result);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Payment verification [${providerName}] error: ${message}`);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

// ============================================================
// NORMALIZED EVENT HANDLERS (provider-agnostic business logic)
// ============================================================

/**
 * Handle payment.completed — Initial payment success from any provider
 */
async function handlePaymentCompleted(event: NormalizedWebhookEvent): Promise<void> {
  try {
    const { userId, productId, planName } = event.metadata;
    const payment = event.payment;

    if (!userId) {
      webhookLogger.error(`Webhook [${event.provider}]: payment.completed missing userId`);
      return;
    }

    if (!payment) {
      webhookLogger.error(`Webhook [${event.provider}]: payment.completed missing payment data`);
      return;
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      webhookLogger.error(`Webhook [${event.provider}]: User not found: ${userId}`);
      return;
    }

    // Find or create product
    const resolvedProductId = productId || `${event.provider}_${payment.transactionId}`;
    let product = await Product.findOne({ productId: resolvedProductId });

    if (!product) {
      const isYearly = payment.amount > 50;
      product = await Product.create({
        productId: resolvedProductId,
        name: planName || `${event.provider} Subscription`,
        description: `Subscription via ${event.provider}`,
        price: payment.amount,
        currency: payment.currency,
        billingPeriod: isYearly ? 'yearly' : 'monthly',
        isActive: true,
      });
    }

    // Process subscription payment atomically
    const result = await processSubscriptionPayment({
      userId,
      productId: product.productId,
      store: 'web',
      amount: payment.amount,
      currency: payment.currency,
      transactionId: payment.transactionId,
      purchaseToken: payment.purchaseToken,
    });

    paymentLogger.info(`[${event.provider}] Subscription activated for user ${userId}`);
    paymentLogger.info(`  Subscription ID: ${result.subscription._id}`);
    paymentLogger.info(`  Expires: ${result.subscription.expirationDate}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing payment.completed [${event.provider}]: ${message}`);
  }
}

/**
 * Handle subscription.renewed — Recurring payment success
 */
async function handleSubscriptionRenewed(event: NormalizedWebhookEvent): Promise<void> {
  try {
    const { userId } = event.metadata;
    const payment = event.payment;
    const sub = event.subscription;

    if (!userId || !payment?.purchaseToken) {
      webhookLogger.info(`Webhook [${event.provider}]: subscription.renewed without userId or subscriptionId`);
      return;
    }

    // Find existing subscription
    const existingSubscription = await Subscription.findOne({
      userId,
      purchaseToken: payment.purchaseToken,
      status: { $in: ['active', 'grace', 'pending_cancellation'] },
    });

    if (!existingSubscription) {
      // Initial invoice — handled by payment.completed
      webhookLogger.info(`Webhook [${event.provider}]: No existing subscription for renewal (initial handled by payment.completed)`);
      return;
    }

    // Extend the subscription
    if (sub?.currentPeriodEnd) {
      existingSubscription.expirationDate = sub.currentPeriodEnd;
      existingSubscription.renewalDate = sub.currentPeriodEnd;
      existingSubscription.status = 'active';
      existingSubscription.autoRenewing = true;
      existingSubscription.lastUpdated = new Date();
      await existingSubscription.save();

      await User.findByIdAndUpdate(userId, {
        subscriptionExpiresAt: sub.currentPeriodEnd,
        subscriptionStatus: 'active',
        lastPaymentDate: new Date(),
        lastPaymentAmount: payment.amount,
      });

      paymentLogger.info(`[${event.provider}] Subscription renewed for user ${userId}, expires: ${sub.currentPeriodEnd}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing subscription.renewed [${event.provider}]: ${message}`);
  }
}

/**
 * Handle payment.failed — Payment attempt failed
 */
async function handlePaymentFailed(event: NormalizedWebhookEvent): Promise<void> {
  try {
    const { userId } = event.metadata;
    const purchaseToken = event.payment?.purchaseToken;

    if (!userId) return;

    const query: any = { userId, status: 'active' };
    if (purchaseToken) query.purchaseToken = purchaseToken;

    const subscription = await Subscription.findOne(query);

    if (subscription) {
      subscription.status = 'grace';
      const gracePeriodDays = 7;
      subscription.graceExpirationDate = new Date(
        Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000
      );
      subscription.lastUpdated = new Date();
      await subscription.save();

      await User.findByIdAndUpdate(userId, { subscriptionStatus: 'grace' });

      paymentLogger.warn(
        `[${event.provider}] Payment failed for user ${userId}, moved to grace period`
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing payment.failed [${event.provider}]: ${message}`);
  }
}

/**
 * Handle subscription.updated — Status changes, cancellation scheduling
 */
async function handleSubscriptionUpdated(event: NormalizedWebhookEvent): Promise<void> {
  try {
    const { userId } = event.metadata;
    const sub = event.subscription;

    if (!userId || !sub) return;

    const subscription = await Subscription.findOne({
      userId,
      purchaseToken: sub.providerSubscriptionId,
    });

    if (!subscription) {
      webhookLogger.warn(`Webhook [${event.provider}]: Subscription not found for ${sub.providerSubscriptionId}`);
      return;
    }

    // Handle cancel_at_period_end
    if (sub.cancelAtPeriodEnd && subscription.status === 'active') {
      subscription.status = 'pending_cancellation';
      subscription.willCancelAt = sub.currentPeriodEnd;
      subscription.autoRenewing = false;
      subscription.lastUpdated = new Date();
      await subscription.save();

      await User.findByIdAndUpdate(userId, { subscriptionStatus: 'canceled' });

      paymentLogger.info(
        `[${event.provider}] Subscription ${sub.providerSubscriptionId} scheduled for cancellation`
      );
      return;
    }

    // Handle reactivation
    if (!sub.cancelAtPeriodEnd && subscription.status === 'pending_cancellation') {
      subscription.status = 'active';
      subscription.willCancelAt = undefined;
      subscription.autoRenewing = true;
      subscription.lastUpdated = new Date();
      await subscription.save();

      await User.findByIdAndUpdate(userId, { subscriptionStatus: 'active' });

      paymentLogger.info(
        `[${event.provider}] Subscription ${sub.providerSubscriptionId} reactivated`
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing subscription.updated [${event.provider}]: ${message}`);
  }
}

/**
 * Handle subscription.canceled — Subscription ended
 */
async function handleSubscriptionCanceled(event: NormalizedWebhookEvent): Promise<void> {
  try {
    const { userId } = event.metadata;
    const sub = event.subscription;

    if (!userId) return;

    const query: any = { userId };
    if (sub?.providerSubscriptionId) query.purchaseToken = sub.providerSubscriptionId;

    const subscription = await Subscription.findOne(query);

    if (subscription) {
      subscription.status = 'expired';
      subscription.autoRenewing = false;
      subscription.canceledAt = new Date();
      subscription.lastUpdated = new Date();
      await subscription.save();
    }

    // Clear user subscription fields
    const user = await User.findById(userId);
    if (user && String(user.activeSubscriptionId) === String(subscription?._id)) {
      user.isSubscribed = false;
      user.subscriptionStatus = 'expired';
      user.subscriptionPlan = undefined;
      user.subscriptionProductName = undefined;
      user.subscriptionSource = undefined;
      user.activeSubscriptionId = undefined;
      await user.save();
    }

    paymentLogger.info(`[${event.provider}] Subscription expired for user ${userId}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing subscription.canceled [${event.provider}]: ${message}`);
  }
}

/**
 * Handle payment.refunded — Full or partial refund
 */
async function handlePaymentRefunded(event: NormalizedWebhookEvent): Promise<void> {
  try {
    const { userId } = event.metadata;
    const refund = event.refund;

    if (!userId || !refund) {
      webhookLogger.warn(`Webhook [${event.provider}]: payment.refunded missing userId or refund data`);
      return;
    }

    // Find original payment record
    if (refund.originalTransactionId) {
      const originalPayment = await PaymentRecord.findOne({
        userId,
        storeTransactionId: refund.originalTransactionId,
        status: 'completed',
      });

      if (originalPayment) {
        originalPayment.status = refund.isFullRefund ? 'refunded' : 'partially_refunded';
        originalPayment.refundDate = new Date();
        originalPayment.refundAmount = refund.amount;
        originalPayment.refundReason = refund.reason || 'requested_by_customer';
        await originalPayment.save();
      }
    }

    // Full refund -> cancel subscription
    if (refund.isFullRefund) {
      const subscription = await Subscription.findOne({
        userId,
        status: { $in: ['active', 'grace'] },
      });

      if (subscription) {
        subscription.status = 'refunded';
        subscription.refundedAt = new Date();
        subscription.lastUpdated = new Date();
        await subscription.save();

        await User.findByIdAndUpdate(userId, {
          isSubscribed: false,
          subscriptionStatus: 'refunded',
        });
      }
    }

    paymentLogger.info(
      `[${event.provider}] ${refund.isFullRefund ? 'Full' : 'Partial'} refund: ${refund.amount} ${refund.currency} for user ${userId}`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing payment.refunded [${event.provider}]: ${message}`);
  }
}

/**
 * Handle payment.disputed — Chargeback / dispute
 */
async function handlePaymentDisputed(event: NormalizedWebhookEvent): Promise<void> {
  try {
    const dispute = event.dispute;

    if (!dispute) return;

    webhookLogger.warn(
      `[${event.provider}] DISPUTE: ${dispute.disputeId}, amount: ${dispute.amount} ${dispute.currency}, reason: ${dispute.reason}`
    );

    // Flag the payment record
    if (dispute.chargeId) {
      const paymentRecord = await PaymentRecord.findOne({
        storeTransactionId: dispute.chargeId,
      });

      if (paymentRecord) {
        paymentRecord.status = 'disputed';
        paymentRecord.metadata = {
          ...paymentRecord.metadata,
          disputeId: dispute.disputeId,
          disputeReason: dispute.reason || 'unknown',
          disputeCreatedAt: new Date().toISOString(),
        };
        await paymentRecord.save();
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing payment.disputed [${event.provider}]: ${message}`);
  }
}

export default {
  handleProviderWebhook,
  verifyProviderPayment,
};
