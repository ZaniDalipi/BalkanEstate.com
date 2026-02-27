/**
 * Stripe Webhook Controller
 *
 * Handles incoming Stripe webhook events after signature verification.
 * Processes payment completions, subscription changes, refunds, and disputes.
 *
 * Architecture:
 * - Single Responsibility: Each event type has its own handler function
 * - Open/Closed: New event types can be added without modifying existing handlers
 * - Dependency Inversion: Uses stripeService for Stripe SDK interactions,
 *   subscriptionPaymentService for business logic
 */

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripeService } from '../services/stripeService';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import { webhookLogger, paymentLogger } from '../utils/logger';

/**
 * Extract subscription ID and metadata from a Stripe Invoice (SDK v20+).
 * In v20 the subscription reference moved to invoice.parent.subscription_details.
 */
function extractInvoiceSubscriptionInfo(invoice: Stripe.Invoice): {
  subscriptionId: string | null;
  metadata: Record<string, string>;
} {
  const subDetails = invoice.parent?.subscription_details;

  const subscriptionRef = subDetails?.subscription;
  const subscriptionId = typeof subscriptionRef === 'string'
    ? subscriptionRef
    : subscriptionRef?.id ?? null;

  const metadata = (subDetails?.metadata as Record<string, string>) || {};

  return { subscriptionId, metadata };
}

/**
 * @desc    Handle Stripe webhook events
 * @route   POST /api/webhooks/stripe
 * @access  Public (verified via Stripe signature)
 *
 * IMPORTANT: This endpoint must receive the raw request body (not parsed JSON).
 * The route must use express.raw() middleware instead of express.json().
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Extract signature header
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      webhookLogger.error('Stripe webhook: Missing stripe-signature header');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // 2. Verify webhook signature using Stripe SDK
    const verificationResult = stripeService.verifyWebhookSignature(req.body, signature);

    if (!verificationResult.valid || !verificationResult.event) {
      webhookLogger.error(`Stripe webhook: Signature verification failed - ${verificationResult.error}`);
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = verificationResult.event;

    webhookLogger.info(`Stripe webhook received: ${event.type} (${event.id})`);

    // 3. Route to appropriate handler based on event type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      default:
        webhookLogger.info(`Stripe webhook: Unhandled event type ${event.type}`);
    }

    // Always respond 200 to acknowledge receipt and prevent retries
    res.status(200).json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    webhookLogger.error(`Stripe webhook processing error: ${message}`);
    // Respond 200 to prevent Stripe from retrying events we already received
    res.status(200).json({ received: true });
  }
};

/**
 * Handle checkout.session.completed - Initial payment success
 *
 * This fires when a customer completes the Stripe Checkout flow.
 * Creates the subscription and payment record atomically.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  try {
    const metadata = stripeService.extractSessionMetadata(session);

    if (!metadata) {
      webhookLogger.error(`Stripe webhook: No metadata in checkout session ${session.id}`);
      return;
    }

    const { userId, productId } = metadata;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      webhookLogger.error(`Stripe webhook: User not found: ${userId}`);
      return;
    }

    // Find or create product
    let product = await Product.findOne({ productId });

    if (!product) {
      const amountTotal = (session.amount_total || 0) / 100;
      const isYearly = amountTotal > 50;

      product = await Product.create({
        productId,
        name: metadata.planName,
        description: 'Subscription via Stripe',
        price: amountTotal,
        currency: (session.currency || 'eur').toUpperCase(),
        billingPeriod: isYearly ? 'yearly' : 'monthly',
        isActive: true,
      });
    }

    // Extract amount (Stripe amounts are in smallest currency unit)
    const amount = (session.amount_total || 0) / 100;
    const currency = (session.currency || 'eur').toUpperCase();

    // Extract Stripe subscription ID from session
    const stripeSubRef = session.subscription;
    const stripeSubId = typeof stripeSubRef === 'string'
      ? stripeSubRef
      : stripeSubRef?.id;

    // Process subscription payment atomically
    const result = await processSubscriptionPayment({
      userId,
      productId: product.productId,
      store: 'web',
      amount,
      currency,
      transactionId: session.id,
      purchaseToken: stripeSubId,
    });

    paymentLogger.info(`Stripe subscription activated for user ${userId}`);
    paymentLogger.info(`  Subscription ID: ${result.subscription._id}`);
    paymentLogger.info(`  Expires: ${result.subscription.expirationDate}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing Stripe checkout completion: ${message}`);
  }
}

/**
 * Handle invoice.paid - Recurring payment success
 *
 * This fires for both initial and subsequent subscription payments.
 * For renewals, extends the subscription expiration date.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  try {
    const { subscriptionId, metadata } = extractInvoiceSubscriptionInfo(invoice);

    if (!subscriptionId) {
      webhookLogger.info('Stripe webhook: invoice.paid without subscription (one-time charge)');
      return;
    }

    const userId = metadata.userId;

    if (!userId) {
      webhookLogger.warn(`Stripe webhook: invoice.paid missing userId metadata for subscription ${subscriptionId}`);
      return;
    }

    // Find existing subscription by purchaseToken (Stripe subscription ID)
    const existingSubscription = await Subscription.findOne({
      userId,
      purchaseToken: subscriptionId,
      status: { $in: ['active', 'grace', 'pending_cancellation'] },
    });

    if (!existingSubscription) {
      // This is likely the initial invoice, handled by checkout.session.completed
      webhookLogger.info(`Stripe webhook: No existing subscription for invoice.paid (initial payment handled by checkout)`);
      return;
    }

    // This is a renewal - extend the subscription
    const periodEnd = invoice.lines?.data?.[0]?.period?.end;
    if (periodEnd) {
      existingSubscription.expirationDate = new Date(periodEnd * 1000);
      existingSubscription.renewalDate = new Date(periodEnd * 1000);
      existingSubscription.status = 'active';
      existingSubscription.autoRenewing = true;
      existingSubscription.lastUpdated = new Date();
      await existingSubscription.save();

      // Update user expiration date
      await User.findByIdAndUpdate(userId, {
        subscriptionExpiresAt: new Date(periodEnd * 1000),
        subscriptionStatus: 'active',
        lastPaymentDate: new Date(),
        lastPaymentAmount: (invoice.amount_paid || 0) / 100,
      });

      paymentLogger.info(`Stripe subscription renewed for user ${userId}, expires: ${existingSubscription.expirationDate}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing Stripe invoice.paid: ${message}`);
  }
}

/**
 * Handle invoice.payment_failed - Payment failure
 *
 * Puts the subscription into grace period to allow payment retry.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  try {
    const { subscriptionId, metadata } = extractInvoiceSubscriptionInfo(invoice);

    if (!subscriptionId) return;

    const userId = metadata.userId;

    if (!userId) {
      webhookLogger.warn(`Stripe webhook: invoice.payment_failed missing userId for subscription ${subscriptionId}`);
      return;
    }

    // Move subscription to grace period
    const subscription = await Subscription.findOne({
      userId,
      purchaseToken: subscriptionId,
      status: 'active',
    });

    if (subscription) {
      subscription.status = 'grace';
      const gracePeriodDays = 7;
      subscription.graceExpirationDate = new Date(
        Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000
      );
      subscription.lastUpdated = new Date();
      await subscription.save();

      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'grace',
      });

      paymentLogger.warn(
        `Stripe payment failed for user ${userId}, subscription ${subscriptionId} moved to grace period`
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing Stripe invoice.payment_failed: ${message}`);
  }
}

/**
 * Handle customer.subscription.updated - Subscription status changes
 *
 * Handles cancellation scheduling, plan changes, and status transitions.
 */
async function handleSubscriptionUpdated(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  try {
    const details = stripeService.extractSubscriptionDetails(stripeSubscription);
    const userId = details.metadata.userId;

    if (!userId) {
      webhookLogger.warn(`Stripe webhook: subscription.updated missing userId for ${details.stripeSubscriptionId}`);
      return;
    }

    const subscription = await Subscription.findOne({
      userId,
      purchaseToken: details.stripeSubscriptionId,
    });

    if (!subscription) {
      webhookLogger.warn(`Stripe webhook: Subscription not found for ${details.stripeSubscriptionId}`);
      return;
    }

    // Handle cancel_at_period_end
    if (details.cancelAtPeriodEnd && subscription.status === 'active') {
      subscription.status = 'pending_cancellation';
      subscription.willCancelAt = details.currentPeriodEnd;
      subscription.autoRenewing = false;
      subscription.lastUpdated = new Date();
      await subscription.save();

      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'canceled',
      });

      paymentLogger.info(
        `Stripe subscription ${details.stripeSubscriptionId} scheduled for cancellation at ${details.currentPeriodEnd}`
      );
      return;
    }

    // Handle reactivation (undo cancel)
    if (!details.cancelAtPeriodEnd && subscription.status === 'pending_cancellation') {
      subscription.status = 'active';
      subscription.willCancelAt = undefined;
      subscription.autoRenewing = true;
      subscription.lastUpdated = new Date();
      await subscription.save();

      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'active',
      });

      paymentLogger.info(
        `Stripe subscription ${details.stripeSubscriptionId} reactivated`
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing Stripe subscription.updated: ${message}`);
  }
}

/**
 * Handle customer.subscription.deleted - Subscription ended
 *
 * Marks the subscription as expired and clears user subscription fields.
 */
async function handleSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  try {
    const details = stripeService.extractSubscriptionDetails(stripeSubscription);
    const userId = details.metadata.userId;

    if (!userId) {
      webhookLogger.warn(`Stripe webhook: subscription.deleted missing userId for ${details.stripeSubscriptionId}`);
      return;
    }

    const subscription = await Subscription.findOne({
      userId,
      purchaseToken: details.stripeSubscriptionId,
    });

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

    paymentLogger.info(`Stripe subscription expired for user ${userId}: ${details.stripeSubscriptionId}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing Stripe subscription.deleted: ${message}`);
  }
}

/**
 * Handle charge.refunded - Payment refund
 *
 * Creates a refund payment record for audit trail.
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  try {
    const metadata = (charge.metadata as Record<string, string>) || {};
    const userId = metadata.userId;

    if (!userId) {
      webhookLogger.warn('Stripe webhook: charge.refunded missing userId metadata');
      return;
    }

    const refundAmount = (charge.amount_refunded || 0) / 100;
    const currency = (charge.currency || 'eur').toUpperCase();
    const isFullRefund = charge.refunded;

    // Find the original payment record
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    const originalPayment = await PaymentRecord.findOne({
      userId,
      storeTransactionId: paymentIntentId,
      status: 'completed',
    });

    if (originalPayment) {
      originalPayment.status = isFullRefund ? 'refunded' : 'partially_refunded';
      originalPayment.refundDate = new Date();
      originalPayment.refundAmount = refundAmount;
      originalPayment.refundReason = charge.refunds?.data?.[0]?.reason || 'requested_by_customer';
      await originalPayment.save();
    }

    // If full refund, cancel the subscription
    if (isFullRefund) {
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
      `Stripe ${isFullRefund ? 'full' : 'partial'} refund processed for user ${userId}: ${refundAmount} ${currency}`
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing Stripe charge.refunded: ${message}`);
  }
}

/**
 * Handle charge.dispute.created - Payment dispute/chargeback
 *
 * Logs the dispute for manual review and creates an audit record.
 */
async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  try {
    const chargeRef = dispute.charge;
    const charge = typeof chargeRef === 'string' ? chargeRef : chargeRef?.id;
    const amount = (dispute.amount || 0) / 100;
    const currency = (dispute.currency || 'eur').toUpperCase();

    webhookLogger.warn(
      `Stripe DISPUTE created: ${dispute.id}, charge: ${charge}, amount: ${amount} ${currency}, reason: ${dispute.reason}`
    );

    // Find and flag the payment record
    if (charge) {
      const paymentRecord = await PaymentRecord.findOne({
        storeTransactionId: charge,
      });

      if (paymentRecord) {
        paymentRecord.status = 'disputed';
        paymentRecord.metadata = {
          ...paymentRecord.metadata,
          disputeId: dispute.id,
          disputeReason: dispute.reason,
          disputeCreatedAt: new Date().toISOString(),
        };
        await paymentRecord.save();
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error processing Stripe dispute: ${message}`);
  }
}

/**
 * @desc    Verify a Stripe payment by session ID
 * @route   GET /api/payments/stripe/verify/:sessionId
 * @access  Private
 */
export const verifyStripePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ message: 'Session ID is required' });
      return;
    }

    // Retrieve the session from Stripe
    const session = await stripeService.retrieveCheckoutSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Payment session not found',
      });
      return;
    }

    // Verify the session belongs to this user
    if (session.metadata?.userId !== String(userId)) {
      res.status(403).json({
        success: false,
        message: 'Payment session does not belong to this user',
      });
      return;
    }

    // Check payment status
    if (session.payment_status === 'paid') {
      const user = await User.findById(userId);

      res.status(200).json({
        success: true,
        paymentStatus: 'paid',
        provider: 'stripe',
        sessionId,
        subscription: user ? {
          plan: user.subscriptionPlan,
          expiresAt: user.subscriptionExpiresAt,
          status: user.subscriptionStatus,
        } : null,
      });
    } else {
      res.status(200).json({
        success: false,
        paymentStatus: session.payment_status || 'pending',
        provider: 'stripe',
        sessionId,
        message: 'Payment is being processed. Please check back in a few minutes.',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    paymentLogger.error(`Error verifying Stripe payment: ${message}`);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

export default {
  handleStripeWebhook,
  verifyStripePayment,
};
