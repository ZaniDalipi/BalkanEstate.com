import { Request, Response } from 'express';
import Stripe from 'stripe';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import DiscountCode from '../models/DiscountCode';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

/**
 * @desc    Create a Stripe Checkout Session for external payment
 * @route   POST /api/payment/create-checkout-session
 * @access  Private
 */
export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planName, planInterval, amount, productId } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Validate amount
    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Invalid amount' });
      return;
    }

    // Get the base URL from environment or request
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planName,
              description: `${planName} - ${planInterval} subscription`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
            recurring: planInterval === 'month' || planInterval === 'year'
              ? { interval: planInterval === 'year' ? 'year' : 'month' }
              : undefined,
          },
          quantity: 1,
        },
      ],
      mode: planInterval === 'month' || planInterval === 'year' ? 'subscription' : 'payment',
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
      client_reference_id: userId.toString(),
      metadata: {
        userId: userId.toString(),
        planName,
        planInterval,
        productId: productId || 'default',
        userEmail: user.email,
      },
    });

    console.log(`✅ Checkout session created for user ${user.email}: ${session.id}`);

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url, // This is the Stripe-hosted payment page URL
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Error creating checkout session', error: error.message });
  }
};

/**
 * @desc    Process a mock payment (simulate payment success)
 * @route   POST /api/payments/process
 * @access  Private
 */
export const processPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planName, planInterval, amount = 1.50 } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Determine product ID based on plan name and interval
    let productId = 'buyer_pro_monthly';
    if (planName.toLowerCase().includes('buyer') && planInterval === 'month') {
      productId = 'buyer_pro_monthly';
    } else if (planName.toLowerCase().includes('buyer') && planInterval === 'year') {
      productId = 'buyer_pro_yearly';
    } else if (planName.toLowerCase().includes('seller') && planInterval === 'month') {
      productId = 'seller_premium_monthly';
    } else if (planName.toLowerCase().includes('seller') && planInterval === 'year') {
      productId = 'seller_premium_yearly';
    }

    // Try to find the product, or create a default one
    let product = await Product.findOne({ productId });

    if (!product) {
      // Create a default product for testing
      product = await Product.create({
        productId,
        name: planName,
        description: `${planName} subscription`,
        price: amount,
        currency: 'EUR',
        billingPeriod: planInterval === 'year' ? 'yearly' : 'monthly',
        isActive: true,
      });
    }

    // Use the secure payment processing service (ATOMIC TRANSACTION)
    const result = await processSubscriptionPayment({
      userId,
      productId,
      store: 'web',
      amount: product.price,
      currency: product.currency,
    });

    console.log(`✅ Payment processed for user ${user.email}: ${productId}`);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      subscription: {
        id: result.subscription._id,
        plan: productId,
        productName: product.name,
        source: 'web',
        expiresAt: result.subscription.expirationDate,
        status: result.subscription.status,
      },
      payment: {
        id: result.paymentRecord._id,
        amount: result.paymentRecord.amount,
        currency: result.paymentRecord.currency,
      },
    });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

/**
 * @desc    Get subscription status for current user
 * @route   GET /api/payments/subscription-status
 * @access  Private
 */
export const getSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      isSubscribed: user.isSubscribed,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionProductName: user.subscriptionProductName,
      subscriptionSource: user.subscriptionSource,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      subscriptionStatus: user.subscriptionStatus,
      hasActiveSubscription: user.hasActiveSubscription(),
      canAccessPremium: user.canAccessPremiumFeatures(),
    });
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ message: 'Error getting subscription status', error: error.message });
  }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/payments/cancel-subscription
 * @access  Private
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update user subscription status
    user.isSubscribed = false;
    user.subscriptionPlan = 'free';
    // Keep expiration date for reference
    await user.save();

    console.log(`Subscription cancelled for user ${user.email}`);

    res.status(200).json({
      message: 'Subscription cancelled successfully',
      user: {
        isSubscribed: user.isSubscribed,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Error cancelling subscription', error: error.message });
  }
};

/**
 * @desc    Handle Stripe webhook events
 * @route   POST /api/payment/webhook
 * @access  Public (but verified with Stripe signature)
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('⚠️ Webhook secret not configured');
    res.status(400).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleSuccessfulCheckout(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleRecurringPaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Helper function to process successful checkout
 */
async function handleSuccessfulCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planName = session.metadata?.planName;
  const planInterval = session.metadata?.planInterval;
  const productId = session.metadata?.productId;

  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  console.log(`✅ Processing successful payment for user ${userId}`);

  try {
    // Find or create product
    let product = await Product.findOne({ productId });

    if (!product) {
      // Create a default product
      product = await Product.create({
        productId: productId || 'default',
        name: planName || 'Subscription',
        description: `${planName} subscription`,
        price: (session.amount_total || 0) / 100, // Convert from cents
        currency: (session.currency || 'eur').toUpperCase(),
        billingPeriod: planInterval === 'year' ? 'yearly' : 'monthly',
        isActive: true,
      });
    }

    // Process the subscription payment and get the result
    const result = await processSubscriptionPayment({
      userId,
      productId: productId || 'default',
      store: 'stripe',
      amount: product.price,
      currency: product.currency,
    });

    // Store Stripe subscription ID if this is a subscription (not one-time payment)
    if (session.subscription && result.subscription) {
      const subscription = await Subscription.findById(result.subscription._id);
      if (subscription) {
        subscription.stripeSubscriptionId = session.subscription as string;
        await subscription.save();
      }
    }

    console.log(`✅ Subscription activated for user ${userId}`);
  } catch (error) {
    console.error('Error processing successful checkout:', error);
    throw error;
  }
}

/**
 * Handle subscription updated event from Stripe
 */
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  try {
    const userId = stripeSubscription.metadata?.userId;
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    console.log(`📝 Updating subscription for user ${userId}`);

    const user = await User.findById(userId);
    if (!user || !user.activeSubscriptionId) {
      console.error(`User or subscription not found for user ${userId}`);
      return;
    }

    // Update subscription expiration date if changed
    const subscription = await Subscription.findById(user.activeSubscriptionId);
    if (subscription && (stripeSubscription as any).current_period_end) {
      const newExpirationDate = new Date((stripeSubscription as any).current_period_end * 1000);
      subscription.expirationDate = newExpirationDate;
      subscription.renewalDate = newExpirationDate;
      subscription.status = stripeSubscription.status === 'active' ? 'active' : 'canceled';
      subscription.autoRenewing = !(stripeSubscription as any).cancel_at_period_end;
      await subscription.save();

      // Update user
      user.subscriptionExpiresAt = newExpirationDate;
      user.subscriptionStatus = stripeSubscription.status === 'active' ? 'active' : 'canceled';
      await user.save();

      console.log(`✅ Subscription updated for user ${userId}`);
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

/**
 * Handle subscription deleted event from Stripe
 */
async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  try {
    const userId = stripeSubscription.metadata?.userId;
    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    console.log(`🗑️ Canceling subscription for user ${userId}`);

    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Mark subscription as canceled
    if (user.activeSubscriptionId) {
      const subscription = await Subscription.findById(user.activeSubscriptionId);
      if (subscription) {
        subscription.status = 'canceled';
        subscription.autoRenewing = false;
        subscription.canceledAt = new Date();
        await subscription.save();
      }
    }

    // Update user
    user.subscriptionStatus = 'canceled';
    user.isSubscribed = false;
    await user.save();

    console.log(`✅ Subscription canceled for user ${userId}`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

/**
 * Handle recurring payment succeeded (monthly/yearly renewals)
 */
async function handleRecurringPaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const subscription = (invoice as any).subscription;
    if (!subscription || typeof subscription !== 'string') {
      console.log('No subscription ID in invoice');
      return;
    }

    // Get the full subscription object
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
    const userId = stripeSubscription.metadata?.userId;
    const productId = stripeSubscription.metadata?.productId;

    if (!userId || !productId) {
      console.error('Missing userId or productId in subscription metadata');
      return;
    }

    console.log(`💰 Processing recurring payment for user ${userId}`);

    // Find product
    const product = await Product.findOne({ productId });
    if (!product) {
      console.error(`Product not found: ${productId}`);
      return;
    }

    // Process the renewal payment
    await processSubscriptionPayment({
      userId,
      productId,
      store: 'stripe',
      amount: (invoice.amount_paid || 0) / 100, // Convert from cents
      currency: (invoice.currency || 'eur').toUpperCase(),
    });

    console.log(`✅ Recurring payment processed for user ${userId}`);
  } catch (error) {
    console.error('Error handling recurring payment:', error);
  }
}

/**
 * Handle payment failed event
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const subscription = (invoice as any).subscription;
    if (!subscription || typeof subscription !== 'string') {
      return;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
    const userId = stripeSubscription.metadata?.userId;

    if (!userId) {
      console.error('No userId in subscription metadata');
      return;
    }

    console.log(`❌ Payment failed for user ${userId}`);

    const user = await User.findById(userId);
    if (!user) {
      return;
    }

    // Update user subscription status to grace period
    user.subscriptionStatus = 'grace';
    await user.save();

    // Update subscription to grace status
    if (user.activeSubscriptionId) {
      const subscription = await Subscription.findById(user.activeSubscriptionId);
      if (subscription) {
        subscription.status = 'grace';
        // Set grace period for 7 days
        const graceEnd = new Date();
        graceEnd.setDate(graceEnd.getDate() + 7);
        subscription.graceExpirationDate = graceEnd;
        await subscription.save();
      }
    }

    console.log(`✅ User ${userId} moved to grace period`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

/**
 * @desc    Verify payment session and return status
 * @route   GET /api/payment/verify-session/:sessionId
 * @access  Private
 */
export const verifySession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify this session belongs to the current user
    if (session.client_reference_id !== userId.toString()) {
      res.status(403).json({ message: 'Session does not belong to current user' });
      return;
    }

    res.status(200).json({
      success: true,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total ? session.amount_total / 100 : 0,
    });
  } catch (error: any) {
    console.error('Error verifying session:', error);
    res.status(500).json({ message: 'Error verifying session', error: error.message });
  }
};

/**
 * @desc    Apply free subscription with 100% off coupon
 * @route   POST /api/payment/apply-free-subscription
 * @access  Private
 */
export const applyFreeSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planName, planInterval, productId, discountCode } = req.body;
    const userId = (req as any).user?._id;

    console.log('🎁 Free subscription request received');
    console.log('User ID:', userId);
    console.log('Product ID:', productId);
    console.log('Discount Code:', discountCode);

    if (!userId) {
      console.error('❌ User not authenticated');
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.log('✅ User found:', user.email);

    // Verify discount code is valid and provides 100% off
    if (!discountCode) {
      res.status(400).json({ message: 'Discount code is required for free subscriptions' });
      return;
    }

    const discount = await DiscountCode.findOne({
      code: discountCode.toUpperCase(),
      isActive: true,
    });

    if (!discount) {
      res.status(400).json({ message: 'Invalid or inactive discount code' });
      return;
    }

    // Check if discount is expired
    if (discount.validUntil && new Date(discount.validUntil) < new Date()) {
      res.status(400).json({ message: 'Discount code has expired' });
      return;
    }

    // Check usage limit
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      res.status(400).json({ message: 'Discount code has reached maximum usage limit' });
      return;
    }

    // Find or create product (need to check price for fixed discounts)
    let product = await Product.findOne({ productId });

    if (!product) {
      // Create a default product
      product = await Product.create({
        productId: productId || 'default',
        name: planName || 'Subscription',
        description: `${planName} subscription`,
        price: 0, // Free with 100% off
        currency: 'EUR',
        billingPeriod: planInterval === 'year' ? 'yearly' : 'monthly',
        isActive: true,
      });
    }

    // Verify this is a free discount (100% off or fixed amount >= price)
    const isFreeDiscount =
      (discount.discountType === 'percentage' && discount.discountValue === 100) ||
      (discount.discountType === 'fixed' && discount.discountValue >= product.price);

    if (!isFreeDiscount) {
      res.status(400).json({
        message: 'This discount code does not provide a free subscription. Only 100% off or fixed discounts equal to the price are accepted.'
      });
      return;
    }

    console.log('💾 Creating free subscription in database...');

    // Process the subscription payment with 0 amount
    const result = await processSubscriptionPayment({
      userId,
      productId: productId || 'default',
      store: 'web',
      amount: 0,
      currency: 'EUR',
    });

    console.log('✅ Subscription created with ID:', result.subscription._id);
    console.log('Subscription status:', result.subscription.status);
    console.log('Expires at:', result.subscription.expirationDate);

    // Increment discount code usage
    discount.usedCount = (discount.usedCount || 0) + 1;
    await discount.save();

    console.log(`✅ Free subscription activated for user ${user.email} with coupon ${discountCode}`);
    console.log('📊 Discount code usage updated:', discount.usedCount);

    res.status(200).json({
      success: true,
      message: 'Free subscription activated successfully',
      subscriptionId: result.subscription._id.toString(),
      subscription: {
        id: result.subscription._id,
        plan: productId,
        productName: product.name,
        source: 'web',
        couponCode: discountCode,
        expiresAt: result.subscription.expirationDate,
        status: result.subscription.status,
      },
    });
  } catch (error: any) {
    console.error('❌ Error applying free subscription:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error applying free subscription', error: error.message });
  }
};
