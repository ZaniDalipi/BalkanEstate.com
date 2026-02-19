import { Request, Response } from 'express';
import User from '../models/User';
import Product from '../models/Product';
import DiscountCode from '../models/DiscountCode';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import { paymentProviderFactory } from '../services/paymentProviderFactory';
import { paymentLogger } from '../utils/logger';

/**
 * @desc    Create a unified payment session (routes to appropriate provider based on country)
 * @route   POST /api/payments/create-payment
 * @access  Private
 *
 * This is the recommended endpoint for creating payments. It automatically
 * selects the best payment provider based on the user's country.
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

    // Use provided country code or try to detect from user profile
    const userCountry = countryCode?.toUpperCase() || user.country?.toUpperCase() || 'GR';

    // Check if country is supported
    if (!paymentProviderFactory.isCountrySupported(userCountry)) {
      paymentLogger.warn(`Country ${userCountry} not in our supported list`);
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

    const mapping = paymentProviderFactory.getCountryMapping(countryCode.toUpperCase());
    const provider = paymentProviderFactory.getProviderForCountry(countryCode);
    const providerInfo = paymentProviderFactory.getProviderInfo(provider);

    res.status(200).json({
      success: true,
      countryCode: countryCode.toUpperCase(),
      countryName: mapping?.countryName || 'Unknown',
      provider,
      providerInfo,
      isEU: mapping?.isEU || false,
      isSEPA: mapping?.isSEPA || false,
      currency: mapping?.currency || 'EUR',
      supportedMethods: ['card', 'bank_transfer', 'wallet'],
    });
  } catch (error: any) {
    paymentLogger.error('Error getting payment providers:', error);
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
    });
  } catch (error: any) {
    paymentLogger.error('Error getting supported countries:', error);
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
    paymentLogger.error('Error processing payment:', error);
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

    // Update user subscription status
    user.isSubscribed = false;
    user.subscriptionPlan = 'free';
    // Keep expiration date for reference
    await user.save();

    res.status(200).json({
      message: 'Subscription cancelled successfully',
      user: {
        isSubscribed: user.isSubscribed,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
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

    if (!userId) {
      paymentLogger.error('User not authenticated');
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      paymentLogger.error('User not found:', userId);
      res.status(404).json({ message: 'User not found' });
      return;
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

    // Check if this user already used this code
    if (discount.usedBy && discount.usedBy.length > 0) {
      const alreadyUsed = discount.usedBy.some(
        (id: any) => id.toString() === userId.toString()
      );
      if (alreadyUsed) {
        res.status(400).json({ message: 'You have already used this discount code' });
        return;
      }
    }

    // Check if code is restricted to specific plans
    const effectiveProductId = productId || '';
    if (discount.applicablePlans && discount.applicablePlans.length > 0) {
      if (!effectiveProductId || !discount.applicablePlans.includes(effectiveProductId)) {
        res.status(400).json({
          message: `This discount code is not valid for the selected plan`,
        });
        return;
      }
    }

    // Find or create product
    let product = await Product.findOne({ productId });

    if (!product) {
      product = await Product.create({
        productId: productId || 'default',
        name: planName || 'Subscription',
        description: `${planName} subscription`,
        price: 0,
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

    // Process the subscription payment with 0 amount
    const result = await processSubscriptionPayment({
      userId,
      productId: productId || 'default',
      store: 'web',
      amount: 0,
      currency: 'EUR',
      discountCode: discountCode.toUpperCase(),
      originalAmount: product.price,
    });

    // Mark discount code as used (updates usedCount + usedBy for re-use prevention)
    await discount.markAsUsed(userId.toString());

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
    paymentLogger.error('Error applying free subscription:', error);
    res.status(500).json({ message: 'Error applying free subscription' });
  }
};
