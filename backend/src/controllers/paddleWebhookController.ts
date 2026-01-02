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

/**
 * Paddle webhook event types we handle
 */
const PADDLE_EVENTS = {
  // Transaction events
  TRANSACTION_COMPLETED: 'transaction.completed',
  TRANSACTION_PAYMENT_FAILED: 'transaction.payment_failed',

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
      console.error('❌ Paddle webhook: Invalid signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Parse the webhook event
    const event = paddleService.parseWebhookEvent(req.body);

    if (!event) {
      console.error('❌ Paddle webhook: Failed to parse event');
      res.status(400).json({ error: 'Invalid event format' });
      return;
    }

    console.log(`📥 Paddle webhook received: ${event.event_type}`);
    console.log(`   Event ID: ${event.event_id}`);

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
        console.log(`❌ Paddle payment failed for transaction: ${event.data.id}`);
        break;

      default:
        console.log(`ℹ️ Unhandled Paddle event: ${event.event_type}`);
    }

    // Paddle expects a 200 response
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('❌ Paddle webhook error:', error);
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
      console.error('❌ Paddle transaction: No userId in custom_data');
      return;
    }

    console.log(`✅ Processing Paddle transaction for user ${userId}`);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ Paddle webhook: User not found: ${userId}`);
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

    console.log(`✅ Paddle subscription activated for user ${user.email}`);
    console.log(`   Subscription ID: ${result.subscription._id}`);
    console.log(`   Expires: ${result.subscription.expirationDate}`);
  } catch (error: any) {
    console.error('❌ Error processing Paddle transaction:', error);
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
      console.log('ℹ️ Paddle subscription created without userId:', data.id);
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ Paddle subscription: User not found: ${userId}`);
      return;
    }

    // Store Paddle subscription ID on user for future reference
    await User.findByIdAndUpdate(userId, {
      subscriptionSource: 'paddle',
      subscriptionStatus: data.status === 'active' ? 'active' : 'pending',
      subscriptionExternalId: data.id,
    });

    console.log(`✅ Paddle subscription ${data.id} linked to user ${user.email}`);
  } catch (error: any) {
    console.error('❌ Error handling subscription created:', error);
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
        console.log(`✅ Paddle subscription ${data.id} updated to status: ${data.status}`);
      }
      return;
    }

    await User.findByIdAndUpdate(userId, {
      subscriptionStatus: data.status,
    });

    console.log(`✅ Paddle subscription updated for user ${userId}: ${data.status}`);
  } catch (error: any) {
    console.error('❌ Error handling subscription updated:', error);
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
      await User.findByIdAndUpdate(user._id, {
        subscriptionStatus: 'canceled',
        // Subscription still active until end of billing period
        // Don't clear subscription data yet
      });

      console.log(`⚠️ Paddle subscription canceled for user ${user.email}`);
      console.log(`   Will remain active until: ${data.current_billing_period?.ends_at}`);
    } else {
      console.log(`ℹ️ Paddle subscription canceled but user not found: ${data.id}`);
    }
  } catch (error: any) {
    console.error('❌ Error handling subscription canceled:', error);
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

      console.log(`⏸️ Paddle subscription paused for user ${user.email}`);
    }
  } catch (error: any) {
    console.error('❌ Error handling subscription paused:', error);
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

      console.log(`▶️ Paddle subscription resumed for user ${user.email}`);
    }
  } catch (error: any) {
    console.error('❌ Error handling subscription resumed:', error);
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

      console.log(`⚠️ Paddle subscription past due for user ${user.email}`);
    }
  } catch (error: any) {
    console.error('❌ Error handling subscription past due:', error);
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
    console.error('Error verifying Paddle payment:', error);
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
    console.error('Error getting Paddle config:', error);
    res.status(500).json({ message: 'Error getting Paddle config', error: error.message });
  }
};

export default {
  handlePaddleWebhook,
  verifyPaddlePayment,
  getPaddleConfig,
};
