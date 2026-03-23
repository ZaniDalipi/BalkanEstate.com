import { Request, Response } from 'express';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import DiscountCode from '../models/DiscountCode';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import { paymentProviderFactory } from '../services/paymentProviderFactory';
import { paypalService } from '../services/paypalService';
import { braintreeService } from '../services/braintreeService';
import emailService from '../services/emailService';
import { paymentLogger } from '../utils/logger';

/**
 * @desc    Create a unified payment session (routes to appropriate provider based on country)
 * @route   POST /api/payments/create-payment
 * @access  Private
 *
 * This is the recommended endpoint for creating payments. It automatically
 * selects the best payment provider based on the user's country:
 * - Braintree for EU countries (Greece, Croatia, Bulgaria, Romania, Slovenia, Serbia)
 * - PayPal for non-EU Balkans (Albania, Bosnia, N. Macedonia, Montenegro, Kosovo)
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
      console.warn(`⚠️ Country ${userCountry} not in our primary list, defaulting to Braintree`);
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
      supportedMethods: paymentProviderFactory.getAvailablePaymentMethods(code.toUpperCase()),
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
      braintreeCountries: paymentProviderFactory.getCountriesByProvider('braintree'),
      paypalCountries: paymentProviderFactory.getCountriesByProvider('paypal'),
    });
  } catch (error: any) {
    console.error('Error getting supported countries:', error);
    res.status(500).json({ message: 'Error getting countries' });
  }
};

/**
 * @desc    Legacy payment endpoint (disabled — all payments go through real providers)
 * @route   POST /api/payments/process
 * @access  Private
 */
export const processPayment = async (_req: Request, res: Response): Promise<void> => {
  res.status(400).json({
    message: 'Direct payment processing is disabled. Please use /api/payments/create-payment to create a real payment session via Braintree or PayPal.',
  });
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

    // Check if user already has an active subscription
    const existingActiveSub = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'grace'] },
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
 * @desc    Verify a PayPal order by checking its status server-side
 * @route   GET /api/payments/paypal/verify/:orderId
 * @access  Private
 *
 * Checks the actual order status with PayPal's API — never trusts client data.
 * If the order is APPROVED but not yet captured, it captures the payment.
 */
export const verifyPayPalPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = req.params.orderId as string;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get order details from PayPal (server-side verification)
    const orderDetails = await paypalService.getOrderDetails(orderId);

    if (!orderDetails.success) {
      res.status(400).json({
        success: false,
        paymentStatus: 'error',
        message: orderDetails.error || 'Failed to verify PayPal order',
      });
      return;
    }

    // If order is APPROVED but not captured, capture it now
    if (orderDetails.status === 'APPROVED') {
      const captureResult = await paypalService.captureOrder(orderId);

      if (captureResult.success) {
        // Payment captured — webhook will handle subscription activation
        res.status(200).json({
          success: true,
          paymentStatus: 'paid',
          provider: 'paypal',
          orderId,
          message: 'Payment captured successfully. Subscription will be activated shortly.',
        });
        return;
      }

      res.status(400).json({
        success: false,
        paymentStatus: 'failed',
        message: captureResult.error || 'Failed to capture PayPal payment',
      });
      return;
    }

    // If order is COMPLETED, payment is done
    if (orderDetails.status === 'COMPLETED') {
      // Check if user's subscription is active (webhook may have already processed it)
      const user = await User.findById(userId);
      if (user?.isSubscribed && user?.subscriptionStatus === 'active') {
        res.status(200).json({
          success: true,
          paymentStatus: 'paid',
          provider: 'paypal',
          orderId,
          subscription: {
            plan: user.subscriptionPlan,
            expiresAt: user.subscriptionExpiresAt,
            status: user.subscriptionStatus,
          },
        });
        return;
      }

      // Webhook hasn't processed yet
      res.status(200).json({
        success: true,
        paymentStatus: 'pending_confirmation',
        provider: 'paypal',
        orderId,
        message: 'Payment received. Your subscription will be activated shortly.',
      });
      return;
    }

    // Order is still pending
    res.status(200).json({
      success: false,
      paymentStatus: 'pending',
      provider: 'paypal',
      orderId,
      message: 'Payment is being processed. Please check back in a few minutes.',
    });
  } catch (error: any) {
    paymentLogger.error('Error verifying PayPal payment:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

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
      provider: mapping?.provider || 'braintree',
      isEU: mapping?.isEU || false,
      isSEPA: mapping?.isSEPA || false,
    });
  } catch (error: any) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ message: 'Error getting payment methods' });
  }
};

// ============================================================
// BRAINTREE ENDPOINTS
// ============================================================

/**
 * @desc    Generate a Braintree client token for the Drop-in UI
 * @route   GET /api/payments/braintree/client-token
 * @access  Private
 */
export const getBraintreeClientToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (!braintreeService.isConfigured()) {
      res.status(503).json({
        success: false,
        message: 'Braintree payments are not currently available.',
      });
      return;
    }

    const clientToken = await braintreeService.generateClientToken();

    res.status(200).json({
      success: true,
      clientToken,
    });
  } catch (error: any) {
    paymentLogger.error('Error generating Braintree client token:', error);
    res.status(500).json({ message: 'Error generating payment token' });
  }
};

/**
 * @desc    Process a Braintree payment using a payment method nonce
 * @route   POST /api/payments/braintree/process-payment
 * @access  Private
 *
 * Subscription is activated synchronously after successful transaction —
 * no webhook needed for activation (unlike PayPal).
 */
export const processBraintreePayment = async (req: Request, res: Response): Promise<void> => {
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

    const {
      paymentMethodNonce,
      amount,
      productId,
      planName,
      planInterval,
      countryCode,
      deviceData,
    } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Invalid amount' });
      return;
    }

    // Validate amount against product price to prevent client-side manipulation
    if (productId) {
      const product = await Product.findOne({ productId });
      if (product && Math.abs(amount - product.price) > 0.50) {
        paymentLogger.warn(`Braintree price mismatch: client sent ${amount}, product price is ${product.price} (user ${userId})`);
        res.status(400).json({ message: 'Amount does not match product price' });
        return;
      }
    }

    if (!braintreeService.isConfigured()) {
      res.status(503).json({
        success: false,
        message: 'Braintree payments are not currently available.',
      });
      return;
    }

    // Create the Braintree transaction
    const transactionResult = await braintreeService.createTransaction({
      userId: userId.toString(),
      userEmail: user.email,
      amount,
      currency: 'EUR',
      paymentMethodNonce,
      productId: productId || `braintree_${planName}`,
      planName,
      planInterval: planInterval || 'month',
      countryCode: countryCode || 'MK',
      firstName: user.name?.split(' ')[0],
      lastName: user.name?.split(' ').slice(1).join(' '),
      deviceData,
    });

    if (!transactionResult.success) {
      res.status(400).json({
        success: false,
        message: transactionResult.error || 'Payment failed',
      });
      return;
    }

    // Find or create the product for subscription activation
    let product = productId ? await Product.findOne({ productId }) : null;
    if (!product) {
      const isYearly = amount > 50;
      product = await Product.create({
        productId: productId || `braintree_${planName}`,
        name: planName || 'Braintree Subscription',
        description: 'Subscription via Braintree',
        price: amount,
        currency: 'EUR',
        billingPeriod: isYearly ? 'yearly' : 'monthly',
        isActive: true,
      });
    }

    // Activate subscription synchronously
    const subscriptionResult = await processSubscriptionPayment({
      userId: userId.toString(),
      productId: product.productId,
      store: 'braintree',
      amount,
      currency: 'EUR',
      transactionId: transactionResult.transactionId,
      purchaseToken: transactionResult.transactionId,
    });

    paymentLogger.info(`Braintree payment processed for user ${userId}: txn ${transactionResult.transactionId}`);

    res.status(200).json({
      success: true,
      paymentStatus: 'paid',
      provider: 'braintree',
      transactionId: transactionResult.transactionId,
      subscription: {
        id: subscriptionResult.subscription._id,
        plan: subscriptionResult.subscription.productId,
        expiresAt: subscriptionResult.subscription.expirationDate,
        status: subscriptionResult.subscription.status,
      },
    });
  } catch (error: any) {
    paymentLogger.error('Error processing Braintree payment:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
};
