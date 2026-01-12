/**
 * Paddle Webhook Controller
 *
 * Handles webhook notifications from Paddle payment platform.
 * Paddle acts as a Merchant of Record (MoR) handling:
 * - Payment processing
 * - VAT/tax compliance
 * - Subscription lifecycle
 * - Chargebacks and refunds
 */

import { Request, Response } from 'express';
import { paddleService } from '../services/paddleService';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import emailService from '../services/emailService';
import { activityLogger } from '../services/activityLogger';

/**
 * Paddle webhook event types we handle
 */
const PADDLE_EVENTS = {
  // Transaction events
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_PAYMENT_FAILED: 'transaction.payment_failed',
  TRANSACTION_REFUNDED: 'transaction.refunded',

  // Adjustment events (for refunds and chargebacks)
  ADJUSTMENT_CREATED: 'adjustment.created',
  ADJUSTMENT_UPDATED: 'adjustment.updated',

  // Subscription events
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELED: 'subscription.canceled',
  SUBSCRIPTION_PAUSED: 'subscription.paused',
  SUBSCRIPTION_RESUMED: 'subscription.resumed',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_PAST_DUE: 'subscription.past_due',

  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
};

/**
 * @desc    Handle Paddle webhook
 * @route   POST /api/payments/paddle/webhook
 * @access  Public (verified with signature)
 */
export const handlePaddleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['paddle-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    if (signature && !paddleService.verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Parse the webhook event
    const event = paddleService.parseWebhookEvent(req.body);

    if (!event) {
      res.status(400).json({ error: 'Invalid event format' });
      return;
    }


    // Handle different event types
    switch (event.event_type) {
      case PADDLE_EVENTS.TRANSACTION_COMPLETED:
        await handleTransactionCompleted(event.data);
        break;

      case PADDLE_EVENTS.SUBSCRIPTION_CREATED:
      case PADDLE_EVENTS.SUBSCRIPTION_ACTIVATED:
        await handleSubscriptionCreated(event.data);
        break;

      case PADDLE_EVENTS.SUBSCRIPTION_UPDATED:
        await handleSubscriptionUpdated(event.data);
        break;

      case PADDLE_EVENTS.SUBSCRIPTION_CANCELED:
        await handleSubscriptionCanceled(event.data);
        break;

      case PADDLE_EVENTS.SUBSCRIPTION_PAUSED:
        await handleSubscriptionPaused(event.data);
        break;

      case PADDLE_EVENTS.SUBSCRIPTION_RESUMED:
        await handleSubscriptionResumed(event.data);
        break;

      case PADDLE_EVENTS.SUBSCRIPTION_PAST_DUE:
        await handleSubscriptionPastDue(event.data);
        break;

      case PADDLE_EVENTS.TRANSACTION_PAYMENT_FAILED:
        break;

      case PADDLE_EVENTS.TRANSACTION_REFUNDED:
      case PADDLE_EVENTS.ADJUSTMENT_CREATED:
        await handleRefund(event.data);
        break;

      default:
    }

    // Paddle expects a 200 response
    res.status(200).json({ received: true });
  } catch (error: any) {
    // Return 200 to prevent retries for unrecoverable errors
    res.status(200).json({ received: true, error: error.message });
  }
};

/**
 * Handle completed transaction (one-time or first subscription payment)
 */
async function handleTransactionCompleted(data: any): Promise<void> {
  try {
    const customData = data.custom_data || {};
    const userId = customData.user_id;
    const productId = customData.product_id;
    const planName = customData.plan_name;
    const planInterval = customData.plan_interval;

    if (!userId) {
      return;
    }


    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    // Calculate amount from transaction details
    const amount = data.details?.totals?.total
      ? parseFloat(data.details.totals.total) / 100
      : 0;

    // Find or create product
    let product = productId ? await Product.findOne({ productId }) : null;

    if (!product) {
      product = await Product.create({
        productId: productId || `paddle_${data.id}`,
        name: planName || 'Paddle Subscription',
        description: 'Subscription via Paddle',
        price: amount,
        currency: data.currency_code || 'EUR',
        billingPeriod: planInterval === 'year' ? 'yearly' : 'monthly',
        isActive: true,
      });
    }

    // Process the subscription payment
    const result = await processSubscriptionPayment({
      userId,
      productId: product.productId,
      store: 'paddle',
      amount,
      currency: data.currency_code || 'EUR',
      transactionId: data.id,
      purchaseToken: data.subscription_id || data.id,
    });

    // Send payment confirmation email
    try {
      await emailService.sendPaymentConfirmation(user.email, user.name || 'Customer', {
        planName: product.name || planName || 'Subscription',
        amount,
        currency: data.currency_code === 'EUR' ? '€' : (data.currency_code || 'EUR'),
        expiresAt: result.subscription.expirationDate,
        transactionId: data.id,
      });
    } catch (emailError) {
    }

    // Log subscription creation
    activityLogger.logSubscriptionCreated(
      userId,
      user.email,
      product.name || planName || 'Subscription',
      amount,
      data.currency_code || 'EUR',
      result.subscription.expirationDate,
      data.id
    );

  } catch (error: any) {
    throw error;
  }
}

/**
 * Handle subscription created/activated
 */
async function handleSubscriptionCreated(data: any): Promise<void> {
  try {
    const customData = data.custom_data || {};
    const userId = customData.user_id;

    if (!userId) {
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    // Store Paddle subscription ID on user for future reference
    await User.findByIdAndUpdate(userId, {
      subscriptionSource: 'paddle',
      subscriptionStatus: data.status === 'active' ? 'active' : 'pending',
      subscriptionExternalId: data.id,
    });

  } catch (error: any) {
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(data: any): Promise<void> {
  try {
    const customData = data.custom_data || {};
    const userId = customData.user_id;

    if (!userId) {
      // Try to find user by subscription ID
      const user = await User.findOne({ subscriptionExternalId: data.id });
      if (user) {
        await User.findByIdAndUpdate(user._id, {
          subscriptionStatus: data.status,
        });
      }
      return;
    }

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: data.status,
    });

  } catch (error: any) {
  }
}

/**
 * Handle subscription canceled
 */
async function handleSubscriptionCanceled(data: any): Promise<void> {
  try {
    // Find user by subscription ID
    const user = await User.findOne({ subscriptionExternalId: data.id });

    if (user) {
      // Update user
      user.subscriptionStatus = 'canceled';
      await user.save();

      // Update subscription in our database
      if (user.activeSubscriptionId) {
        const subscription = await Subscription.findById(user.activeSubscriptionId);
        if (subscription) {
          subscription.status = 'pending_cancellation';
          subscription.autoRenewing = false;
          subscription.canceledAt = new Date();
          if (data.current_billing_period?.ends_at) {
            subscription.willCancelAt = new Date(data.current_billing_period.ends_at);
          }
          await subscription.save();

          // Create event
          await SubscriptionEvent.create({
            subscriptionId: subscription._id,
            userId: user._id,
            eventType: 'subscription_canceled',
            store: 'paddle',
            metadata: {
              paddleSubscriptionId: data.id,
              canceledAt: new Date(),
              willExpireAt: data.current_billing_period?.ends_at,
            },
          });
        }
      }

      // Send cancellation email
      try {
        await emailService.sendSubscriptionCancelled(user.email, user.name || 'Customer', {
          planName: user.subscriptionProductName || 'Subscription',
          expiresAt: data.current_billing_period?.ends_at
            ? new Date(data.current_billing_period.ends_at)
            : user.subscriptionExpiresAt || new Date(),
        });
      } catch (emailError) {
      }

      // Log subscription cancellation
      activityLogger.logSubscriptionCanceled(
        String(user._id),
        user.email,
        user.subscriptionProductName || 'Subscription',
        data.current_billing_period?.ends_at
          ? new Date(data.current_billing_period.ends_at)
          : undefined
      );
    }
  } catch (error: any) {
  }
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(data: any): Promise<void> {
  try {
    const user = await User.findOne({ subscriptionExternalId: data.id });

    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'paused',
      });

    }
  } catch (error: any) {
  }
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(data: any): Promise<void> {
  try {
    const user = await User.findOne({ subscriptionExternalId: data.id });

    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'active',
      });

    }
  } catch (error: any) {
  }
}

/**
 * Handle subscription past due
 */
async function handleSubscriptionPastDue(data: any): Promise<void> {
  try {
    const user = await User.findOne({ subscriptionExternalId: data.id });

    if (user) {
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'past_due',
      });

    }
  } catch (error: any) {
  }
}

/**
 * @desc    Verify a Paddle transaction/subscription
 * @route   GET /api/payments/paddle/verify/:transactionId
 * @access  Private
 */
export const verifyPaddlePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transactionId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user has an active subscription
    if (user.isSubscribed && user.subscriptionStatus === 'active') {
      res.status(200).json({
        success: true,
        paymentStatus: 'paid',
        provider: 'paddle',
        transactionId,
        subscription: {
          plan: user.subscriptionPlan,
          expiresAt: user.subscriptionExpiresAt,
          status: user.subscriptionStatus,
        },
      });
    } else {
      // Payment might be pending
      res.status(200).json({
        success: false,
        paymentStatus: 'pending',
        provider: 'paddle',
        transactionId,
        message: 'Payment is being processed. Please check back in a few minutes.',
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};

/**
 * @desc    Get Paddle client configuration for frontend
 * @route   GET /api/payments/paddle/config
 * @access  Public
 */
export const getPaddleConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      clientToken: paddleService.getClientToken(),
      environment: paddleService.getEnvironment(),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error getting Paddle config', error: error.message });
  }
};

/**
 * Handle refund from Paddle (transaction.refunded or adjustment.created)
 */
async function handleRefund(data: any): Promise<void> {
  try {

    const transactionId = data.transaction_id || data.id;
    const adjustmentType = data.action || 'refund';
    const refundAmount = data.totals?.total
      ? parseFloat(data.totals.total) / 100
      : data.amount
        ? parseFloat(data.amount) / 100
        : 0;
    const currency = data.currency_code || 'EUR';

    // Try to find the payment record
    const paymentRecord = await PaymentRecord.findOne({
      storeTransactionId: transactionId,
      store: 'paddle',
    });

    if (!paymentRecord) {
      return;
    }

    // Determine if full or partial refund
    const isFullRefund = adjustmentType === 'full_refund' ||
      (refundAmount >= paymentRecord.amount * 0.99); // 99% threshold for floating point

    // Update payment record
    paymentRecord.status = isFullRefund ? 'refunded' : 'partially_refunded';
    paymentRecord.refundAmount = refundAmount;
    paymentRecord.refundDate = new Date();
    paymentRecord.refundReason = data.reason || 'customer_request';
    await paymentRecord.save();

    // Find user
    const user = await User.findById(paymentRecord.userId);
    if (!user) {
      return;
    }

    // If full refund, update subscription
    if (isFullRefund && paymentRecord.subscriptionId) {
      const subscription = await Subscription.findById(paymentRecord.subscriptionId);
      if (subscription) {
        subscription.status = 'refunded';
        subscription.canceledAt = new Date();
        subscription.refundedAt = new Date();
        await subscription.save();

        // Update user - use 'canceled' since 'refunded' is not a valid user status
        user.isSubscribed = false;
        user.subscriptionStatus = 'canceled';
        await user.save();

        // Create subscription event
        await SubscriptionEvent.create({
          subscriptionId: subscription._id,
          userId: user._id,
          eventType: 'subscription_refunded',
          store: 'paddle',
          hasFinancialImpact: true,
          amount: refundAmount,
          currency,
        });
      }
    }

    // Send email notification
    try {
      await emailService.sendRefundNotification(user.email, user.name || 'Customer', {
        amount: refundAmount,
        currency: currency === 'EUR' ? '€' : currency,
        transactionId: data.id,
        reason: data.reason,
      });
    } catch (emailError) {
    }

    // Log refund
    activityLogger.logRefund(
      String(user._id),
      user.email,
      refundAmount,
      currency,
      data.id,
      data.reason
    );

  } catch (error) {
  }
}

export default {
  handlePaddleWebhook,
  verifyPaddlePayment,
  getPaddleConfig,
};
