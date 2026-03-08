/**
 * PayPal Webhook Controller
 *
 * Handles webhook notifications from PayPal.
 * Processes verified payments and activates subscriptions.
 *
 * IMPORTANT: Subscriptions are ONLY activated after PayPal webhook
 * verification — never from client-side data. This ensures no dummy
 * or fake payments can activate a subscription.
 */

import { Request, Response } from 'express';
import { paypalService } from '../services/paypalService';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import { paymentLogger } from '../utils/logger';

/**
 * @desc    Handle PayPal webhook events
 * @route   POST /api/payments/paypal/webhook
 * @access  Public (verified with PayPal signature)
 *
 * PayPal sends webhook events for payment lifecycle:
 * - CHECKOUT.ORDER.APPROVED: User approved the payment
 * - PAYMENT.CAPTURE.COMPLETED: Payment successfully captured
 * - PAYMENT.CAPTURE.DENIED: Payment was denied
 * - PAYMENT.CAPTURE.REFUNDED: Payment was refunded
 */
export const handlePayPalWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify webhook signature with PayPal's API
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const isValid = await paypalService.verifyWebhookSignature(headers, rawBody);

    if (!isValid) {
      paymentLogger.error('PayPal webhook: Signature verification failed');
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = event.event_type;

    paymentLogger.info(`PayPal webhook received: ${eventType}`);

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(event);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(event);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        paymentLogger.warn(`PayPal capture denied: ${event.resource?.id}`);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handleCaptureRefunded(event);
        break;

      default:
        paymentLogger.info(`PayPal webhook: Unhandled event type: ${eventType}`);
    }

    // PayPal expects 200 response for successful webhook processing
    res.status(200).json({ received: true });
  } catch (error: any) {
    paymentLogger.error('PayPal webhook error:', error);
    // Return 200 to prevent retries for unrecoverable errors
    res.status(200).json({ received: true });
  }
};

/**
 * Handle CHECKOUT.ORDER.APPROVED — user approved the payment.
 * We capture the payment here to complete the transaction.
 */
async function handleOrderApproved(event: any): Promise<void> {
  const orderId = event.resource?.id;
  if (!orderId) {
    paymentLogger.error('PayPal order approved: No order ID in event');
    return;
  }

  paymentLogger.info(`PayPal order approved: ${orderId}, capturing payment...`);

  // Capture the payment
  const captureResult = await paypalService.captureOrder(orderId);

  if (!captureResult.success) {
    paymentLogger.error(`PayPal capture failed for order ${orderId}: ${captureResult.error}`);
    return;
  }

  // Process the subscription if capture was successful
  if (captureResult.metadata) {
    await activateSubscription(
      captureResult.metadata,
      orderId,
      captureResult.captureId || orderId,
      captureResult.amount || 0,
      captureResult.currency || 'EUR'
    );
  }
}

/**
 * Handle PAYMENT.CAPTURE.COMPLETED — payment has been captured successfully.
 * This is the definitive confirmation that money was received.
 */
async function handleCaptureCompleted(event: any): Promise<void> {
  const capture = event.resource;
  if (!capture) {
    paymentLogger.error('PayPal capture completed: No resource in event');
    return;
  }

  const captureId = capture.id;
  const orderId = capture.supplementary_data?.related_ids?.order_id;
  const amount = capture.amount ? parseFloat(capture.amount.value) : 0;
  const currency = capture.amount?.currency_code || 'EUR';

  paymentLogger.info(`PayPal capture completed: ${captureId}, amount: ${amount} ${currency}`);

  // Extract metadata from custom_id
  let metadata = null;
  const customId = capture.custom_id;
  if (customId) {
    try {
      metadata = JSON.parse(customId);
    } catch {
      paymentLogger.warn('PayPal capture: Failed to parse custom_id metadata');
    }
  }

  // If we couldn't get metadata from custom_id, try to get it from the order
  if (!metadata && orderId) {
    const orderDetails = await paypalService.getOrderDetails(orderId);
    if (orderDetails.metadata) {
      metadata = orderDetails.metadata;
    }
  }

  if (metadata) {
    await activateSubscription(metadata, orderId || captureId, captureId, amount, currency);
  } else {
    paymentLogger.error(`PayPal capture ${captureId}: No metadata found, cannot activate subscription`);
  }
}

/**
 * Handle PAYMENT.CAPTURE.REFUNDED — a payment was refunded.
 */
async function handleCaptureRefunded(event: any): Promise<void> {
  const refund = event.resource;
  if (!refund) return;

  paymentLogger.info(`PayPal refund processed: ${refund.id}`);

  // Find the subscription by transaction ID and cancel it
  const subscription = await Subscription.findOne({
    transactionId: refund.id,
    store: 'paypal',
  });

  if (subscription) {
    subscription.status = 'refunded';
    subscription.canceledAt = new Date();
    await subscription.save();

    const user = await User.findById(subscription.userId);
    if (user) {
      user.isSubscribed = false;
      user.subscriptionStatus = 'canceled';
      await user.save();
    }

    paymentLogger.info(`PayPal refund: Subscription ${subscription._id} marked as refunded`);
  }
}

/**
 * Activate a subscription after verified PayPal payment.
 * This is the ONLY path to subscription activation for PayPal payments.
 */
async function activateSubscription(
  metadata: { userId: string; productId: string; planName: string; planInterval: string },
  orderId: string,
  captureId: string,
  amount: number,
  currency: string
): Promise<void> {
  const { userId, productId } = metadata;

  if (!userId) {
    paymentLogger.error('PayPal webhook: No userId in metadata');
    return;
  }

  // Idempotency check: skip if already processed
  const existingSub = await Subscription.findOne({
    store: 'paypal',
    transactionId: captureId,
  });
  if (existingSub) {
    paymentLogger.info(`PayPal webhook: Order ${orderId} already processed (subscription ${existingSub._id}), skipping`);
    return;
  }

  paymentLogger.info(`PayPal: Activating subscription for user ${userId}`);

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    paymentLogger.error(`PayPal webhook: User not found: ${userId}`);
    return;
  }

  // Find or create product
  let product = productId ? await Product.findOne({ productId }) : null;

  if (!product) {
    const isYearly = amount > 50;
    product = await Product.create({
      productId: productId || `paypal_${orderId}`,
      name: metadata.planName || 'PayPal Subscription',
      description: 'Subscription via PayPal',
      price: amount,
      currency: currency || 'EUR',
      billingPeriod: isYearly ? 'yearly' : 'monthly',
      isActive: true,
    });
  }

  // Process the subscription payment (atomic transaction)
  const result = await processSubscriptionPayment({
    userId,
    productId: product.productId,
    store: 'web', // PayPal uses 'web' store type for compatibility
    amount,
    currency: currency || 'EUR',
    transactionId: captureId,
    purchaseToken: orderId,
  });

  paymentLogger.info(`PayPal subscription activated for user ${user._id}`);
  paymentLogger.info(`  Subscription ID: ${result.subscription._id}`);
  paymentLogger.info(`  Expires: ${result.subscription.expirationDate}`);
}

export default {
  handlePayPalWebhook,
};
