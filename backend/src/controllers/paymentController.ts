import { Request, Response } from 'express';
// @ts-ignore - stripe types included in package
import Stripe from 'stripe';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import DiscountCode from '../models/DiscountCode';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import { paymentProviderFactory } from '../services/paymentProviderFactory';
import emailService from '../services/emailService';
import { paymentLogger } from '../utils/logger';

// Stripe is not used - Paddle and PaySera are the active payment providers
// Keeping Stripe initialization for legacy webhook handling only
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_not_configured', {
  apiVersion: '2026-02-25.clover',
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

    // SECURITY: Validate amount against product price to prevent client-side manipulation
    if (productId) {
      const product = await Product.findOne({ productId });
      if (product && Math.abs(amount - product.price) > 0.50) {
        paymentLogger.warn(`Price mismatch: client sent ${amount}, product price is ${product.price} (user ${userId})`);
        res.status(400).json({ message: 'Amount does not match product price' });
        return;
      }
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

    // Session created successfully

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url, // This is the Stripe-hosted payment page URL
    });
  } catch (error: any) {
    paymentLogger.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Error creating checkout session' });
  }
};

/**
 * @desc    Create a unified payment session (routes to appropriate provider based on country)
 * @route   POST /api/payments/create-payment
 * @access  Private
 *
 * This is the recommended endpoint for creating payments. It automatically
 * selects the best payment provider based on the user's country:
 * - Stripe for EU countries (Greece, Croatia, Bulgaria, Romania, Slovenia)
 * - PaySera for non-EU Balkans (Serbia, Albania, Bosnia, N. Macedonia, Montenegro, Kosovo)
 */
export const createUnifiedPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planName, planInterval, amount, productId, countryCode, language } = req.body;
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

    // Validate required fields
    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Invalid amount' });
      return;
    }

    if (!planName) {
      res.status(400).json({ message: 'Plan name is required' });
      return;
    }

    // SECURITY: Validate amount against product price to prevent client-side manipulation
    if (productId) {
      const product = await Product.findOne({ productId });
      if (product && Math.abs(amount - product.price) > 0.50) {
        paymentLogger.warn(`Price mismatch: client sent ${amount}, product price is ${product.price} (user ${userId})`);
        res.status(400).json({ message: 'Amount does not match product price' });
        return;
      }
    }

    // Use provided country code or try to detect from user profile
    const userCountry = countryCode?.toUpperCase() || user.country?.toUpperCase() || 'GR';

    // Check if country is supported
    if (!paymentProviderFactory.isCountrySupported(userCountry)) {
      console.warn(`⚠️ Country ${userCountry} not in our primary list, defaulting to Stripe`);
    }

    // Create payment using the factory
    const result = await paymentProviderFactory.createPayment({
      userId: userId.toString(),
      userEmail: user.email,
      countryCode: userCountry,
      amount,
      productId: productId || 'default',
      planName,
      planInterval: planInterval || 'month',
      language: language || 'en',
      firstName: user.name?.split(' ')[0],
      lastName: user.name?.split(' ').slice(1).join(' '),
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: 'Failed to create payment session',
        error: result.error,
      });
      return;
    }

    // Payment session created successfully

    res.status(200).json({
      success: true,
      provider: result.provider,
      paymentUrl: result.paymentUrl,
      sessionId: result.sessionId,
      orderId: result.orderId,
      countryCode: userCountry,
      providerInfo: paymentProviderFactory.getProviderInfo(result.provider),
    });
  } catch (error: any) {
    paymentLogger.error('Error creating unified payment:', error);
    res.status(500).json({ message: 'Error creating payment' });
  }
};

/**
 * @desc    Get available payment providers for a country
 * @route   GET /api/payments/providers/:countryCode
 * @access  Public
 */
export const getPaymentProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryCode } = req.params;

    if (!countryCode) {
      res.status(400).json({ message: 'Country code is required' });
      return;
    }

    const code = countryCode as string;
    const mapping = paymentProviderFactory.getCountryMapping(code.toUpperCase());
    const provider = paymentProviderFactory.getProviderForCountry(code);
    const providerInfo = paymentProviderFactory.getProviderInfo(provider);

    res.status(200).json({
      success: true,
      countryCode: code.toUpperCase(),
      countryName: mapping?.countryName || 'Unknown',
      provider,
      providerInfo,
      isEU: mapping?.isEU || false,
      isSEPA: mapping?.isSEPA || false,
      currency: mapping?.currency || 'EUR',
      supportedMethods: provider === 'stripe'
        ? ['card', 'sepa_debit', 'apple_pay', 'google_pay']
        : ['card', 'bank_transfer', 'wallet'],
    });
  } catch (error: any) {
    console.error('Error getting payment providers:', error);
    res.status(500).json({ message: 'Error getting providers' });
  }
};

/**
 * @desc    Get all supported countries and their payment providers
 * @route   GET /api/payments/supported-countries
 * @access  Public
 */
export const getSupportedCountries = async (_req: Request, res: Response): Promise<void> => {
  try {
    const countries = paymentProviderFactory.getSupportedCountries();

    res.status(200).json({
      success: true,
      countries: countries.map(c => ({
        ...c,
        providerInfo: paymentProviderFactory.getProviderInfo(c.provider),
      })),
      stripeCountries: paymentProviderFactory.getCountriesByProvider('stripe'),
      paddleCountries: paymentProviderFactory.getCountriesByProvider('paddle'),
    });
  } catch (error: any) {
    console.error('Error getting supported countries:', error);
    res.status(500).json({ message: 'Error getting countries' });
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

    // Payment processed successfully

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
    res.status(500).json({ message: 'Error processing payment' });
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
    paymentLogger.error('Error getting subscription status:', error);
    res.status(500).json({ message: 'Error getting subscription status' });
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

    // SECURITY: Mark subscription as canceled but retain access until the current
    // billing period ends (subscriptionExpiresAt).
    user.subscriptionStatus = 'canceled';

    // Also update the Subscription document for consistency
    const activeSub = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'grace'] },
    });
    if (activeSub) {
      activeSub.status = 'canceled';
      activeSub.canceledAt = new Date();
      await activeSub.save();
    }

    // If there's no expiration date or it has already passed, deactivate immediately
    if (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) <= new Date()) {
      user.isSubscribed = false;
      user.subscriptionPlan = 'free';
    }

    await user.save();

    paymentLogger.info(`Subscription cancellation requested for user ${userId}`);

    res.status(200).json({
      message: 'Subscription will be cancelled at the end of the current billing period',
      user: {
        isSubscribed: user.isSubscribed,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (error: any) {
    paymentLogger.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Error cancelling subscription' });
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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        await handleDisputeCreated(dispute);
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
    const result = await processSubscriptionPayment({
      userId,
      productId,
      store: 'stripe',
      amount: (invoice.amount_paid || 0) / 100, // Convert from cents
      currency: (invoice.currency || 'eur').toUpperCase(),
    });

    // If auto-renewal was disabled by admin, log it but don't fail
    if (result.skipped) {
      console.log(`⚠️ Auto-renewal skipped for user ${userId} - subscription renewal is disabled (${result.message})`);
      console.log(`📝 Payment recorded under ID: ${result.paymentId}`);
      return;
    }

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
    const sessionId = req.params.sessionId as string;
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
    res.status(500).json({ message: 'Error verifying session' });
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

    // Free subscription request received

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

    // User found

    // Check if user already has a truly active subscription (not expired)
    // The expiration worker runs every 6 hours, so status may still be 'active'
    // even though expirationDate has passed — check both fields
    const now = new Date();
    const existingActiveSub = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'grace'] },
      expirationDate: { $gt: now },
    });
    if (existingActiveSub) {
      // If the user is trying to subscribe to the exact same product, block it (prevent stacking)
      if (existingActiveSub.productId === productId) {
        res.status(400).json({ message: 'You already have an active subscription for this plan' });
        return;
      }
      // Otherwise, allow the upgrade/switch — the old subscription will be
      // canceled automatically inside processSubscriptionPayment
    }

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

    // Free subscription activated successfully

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
    res.status(500).json({ message: 'Error applying free subscription' });
  }
};

/**
 * Reactivate an expired subscription without requiring new payment
 * POST /api/payments/reactivate-subscription
 * Body: { productId }
 * For re-enabling subscriptions that have already been purchased/expired
 */
export const reactivateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!productId) {
      res.status(400).json({ message: 'Product ID is required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Find the most recent subscription for this product (regardless of status)
    const lastSubscription = await Subscription.findOne({ userId, productId })
      .sort({ createdAt: -1 });

    if (!lastSubscription) {
      res.status(404).json({ message: 'No previous subscription found for this product' });
      return;
    }

    // Calculate new expiration date based on billing period
    const product = await Product.findOne({ productId });
    const newExpirationDate = new Date();

    if (product?.billingPeriod === 'yearly') {
      newExpirationDate.setFullYear(newExpirationDate.getFullYear() + 1);
    } else {
      // Default to monthly
      newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);
    }

    // Reactivate the subscription
    lastSubscription.status = 'active';
    lastSubscription.expirationDate = newExpirationDate;
    lastSubscription.renewalDate = newExpirationDate;
    lastSubscription.autoRenewing = false;
    lastSubscription.canceledAt = undefined;
    lastSubscription.cancellationReason = undefined;
    lastSubscription.willCancelAt = undefined;
    await lastSubscription.save();

    // Update user's subscription status
    user.isSubscribed = true;
    user.subscriptionStatus = 'active';
    user.subscriptionExpiresAt = newExpirationDate;
    user.subscriptionPlan = productId;
    if (product) {
      user.subscriptionProductName = product.name;
    }

    // Sync embedded subscription object
    if (!user.subscription) {
      user.subscription = {} as any;
    }
    user.subscription.status = 'active';
    user.subscription.expiresAt = newExpirationDate;

    // Set listingsLimit from product if available
    if (product?.listingsLimit) {
      user.subscription.listingsLimit = product.listingsLimit;
      user.activeListingsLimit = product.listingsLimit;
    }

    user.markModified('subscription');
    await user.save();

    // Log reactivation event
    await SubscriptionEvent.create({
      subscriptionId: lastSubscription._id,
      userId,
      eventType: 'subscription_reactivated',
      store: 'web',
      previousStatus: 'expired',
      newStatus: 'active',
      metadata: {
        reactivatedAt: new Date(),
        expiresAt: newExpirationDate,
        productId,
      },
    });

    paymentLogger.info(`Subscription reactivated for user ${userId}, product ${productId}`);

    res.status(200).json({
      success: true,
      message: 'Subscription reactivated successfully',
      subscription: {
        id: lastSubscription._id,
        status: 'active',
        plan: productId,
        expiresAt: newExpirationDate,
        productName: product?.name || productId,
      },
    });
  } catch (error: any) {
    paymentLogger.error('Error reactivating subscription:', error);
    res.status(500).json({ message: 'Error reactivating subscription' });
  }
};

/**
 * Handle refund from Stripe charge.refunded webhook
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    console.log(`💰 Processing refund for charge: ${charge.id}`);

    // Get refund details
    const refundAmount = charge.amount_refunded / 100; // Convert from cents
    const currency = charge.currency.toUpperCase();
    const isFullRefund = charge.refunded;

    // Try to find the payment record by transaction ID
    const paymentRecord = await PaymentRecord.findOne({
      storeTransactionId: charge.payment_intent || charge.id,
      store: 'stripe',
    });

    if (!paymentRecord) {
      console.warn(`⚠️ Payment record not found for charge: ${charge.id}`);
      return;
    }

    // Update payment record with refund info
    paymentRecord.status = isFullRefund ? 'refunded' : 'partially_refunded';
    paymentRecord.refundAmount = refundAmount;
    paymentRecord.refundDate = new Date();
    paymentRecord.refundReason = 'customer_request';
    await paymentRecord.save();

    // Find user
    const user = await User.findById(paymentRecord.userId);
    if (!user) {
      console.error(`User not found for refund: ${paymentRecord.userId}`);
      return;
    }

    // If full refund, cancel the subscription
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
          store: 'stripe',
          hasFinancialImpact: true,
          amount: refundAmount,
          currency,
        });
      }
    }

    // Send refund notification email
    await emailService.sendRefundNotification(user.email, user.name || 'Customer', {
      amount: refundAmount,
      currency: currency === 'EUR' ? '€' : currency,
      transactionId: charge.id,
    });

    // Refund processed successfully
  } catch (error) {
    console.error('❌ Error handling refund:', error);
  }
}

/**
 * Handle dispute/chargeback from Stripe
 */
async function handleDisputeCreated(dispute: Stripe.Dispute) {
  try {
    console.log(`⚠️ Dispute/chargeback created: ${dispute.id}`);

    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
    if (!chargeId) {
      console.error('No charge ID in dispute');
      return;
    }

    // Find the payment record
    const paymentRecord = await PaymentRecord.findOne({
      storeTransactionId: chargeId,
      store: 'stripe',
    });

    if (!paymentRecord) {
      console.warn(`⚠️ Payment record not found for dispute: ${chargeId}`);
      return;
    }

    // Update payment record
    paymentRecord.status = 'disputed';
    await paymentRecord.save();

    // Find user
    const user = await User.findById(paymentRecord.userId);
    if (!user) {
      return;
    }

    // Dispute logged

    // Create subscription event for tracking
    if (paymentRecord.subscriptionId) {
      await SubscriptionEvent.create({
        subscriptionId: paymentRecord.subscriptionId,
        userId: user._id,
        eventType: 'chargeback_initiated',
        store: 'stripe',
        hasFinancialImpact: true,
        amount: dispute.amount / 100,
        currency: dispute.currency.toUpperCase(),
        metadata: {
          disputeId: dispute.id,
          reason: dispute.reason,
        },
      });
    }
  } catch (error) {
    console.error('❌ Error handling dispute:', error);
  }
}

/**
 * @desc    Get customer portal URL for managing subscription
 * @route   GET /api/payments/customer-portal
 * @access  Private
 */
export const getCustomerPortal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(404).json({ message: 'Customer portal not available' });
  } catch (error: any) {
    console.error('Error getting customer portal:', error);
    res.status(500).json({ message: 'Error getting customer portal' });
  }
};

/**
 * @desc    Get available payment methods for a country
 * @route   GET /api/payments/methods/:countryCode
 * @access  Public
 */
export const getAvailablePaymentMethods = async (req: Request, res: Response): Promise<void> => {
  try {
    const countryCode = req.params.countryCode as string;
    if (!countryCode) {
      res.status(400).json({ message: 'Country code is required' });
      return;
    }

    const code = countryCode.toUpperCase();
    const methods = paymentProviderFactory.getAvailablePaymentMethods(code);
    const mapping = paymentProviderFactory.getCountryMapping(code);

    res.status(200).json({
      success: true,
      countryCode: code,
      methods,
      provider: mapping?.provider || 'paysera',
      isEU: mapping?.isEU || false,
      isSEPA: mapping?.isSEPA || false,
    });
  } catch (error: any) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ message: 'Error getting payment methods' });
  }
};
