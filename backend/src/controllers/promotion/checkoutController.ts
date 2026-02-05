/**
 * Promotion Checkout Controller
 * Handles Stripe checkout and payment confirmation for new promotions
 */

import { Request, Response } from 'express';
import Promotion from '../../models/Promotion';
import User, { IUser } from '../../models/User';
import Agency from '../../models/Agency';
import PromotionCoupon from '../../models/PromotionCoupon';
import {
  stripe,
  PROMOTION_TIERS,
  URGENT_MODIFIER,
  getPromotionPrice,
  getAgencyAllocation,
  calculateDiscountedPrice,
  isValidTier,
  isValidDuration,
  verifyPropertyOwnership,
  hasActivePromotion,
  applyCoupon,
  updatePropertyPromotion,
  calculateNextRefreshDate,
  getBaseUrl,
} from '../../services/promotion/promotionService';
import { promotionLogger } from '../../utils/logger';

/**
 * @desc    Purchase/Create a property promotion (direct, for agency allocations)
 * @route   POST /api/promotions
 * @access  Private
 */
export const purchasePromotion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const {
      propertyId,
      promotionTier,
      duration,
      hasUrgentBadge = false,
      useAgencyAllocation = false,
      couponCode,
    } = req.body;

    if (!propertyId || !promotionTier || !duration) {
      res.status(400).json({
        message: 'Property ID, promotion tier, and duration are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    if (!isValidTier(promotionTier)) {
      res.status(400).json({
        message: 'Invalid promotion tier. Must be featured, highlight, or premium',
        code: 'INVALID_TIER',
      });
      return;
    }

    if (!isValidDuration(duration)) {
      res.status(400).json({ message: 'Invalid duration', code: 'INVALID_DURATION' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const { property, error: propertyError } = await verifyPropertyOwnership(propertyId, String(currentUser._id));
    if (propertyError || !property) {
      res.status(property ? 403 : 404).json({ message: propertyError, code: 'PROPERTY_ERROR' });
      return;
    }

    const existingPromotion = await hasActivePromotion(propertyId);
    if (existingPromotion) {
      res.status(400).json({ message: 'This property is already promoted', code: 'ALREADY_PROMOTED' });
      return;
    }

    let isFromAgencyAllocation = false;
    let agencyId = null;
    let finalPrice = 0;
    let appliedCoupon = null;
    let couponDiscount = 0;
    let originalPrice = 0;

    if (useAgencyAllocation) {
      const agency = await Agency.findOne({ ownerId: user._id });

      if (!agency) {
        res.status(403).json({ message: 'Agency allocation requested but no agency found', code: 'NO_AGENCY' });
        return;
      }

      const planAllocation = getAgencyAllocation(agency.subscriptionPlan || 'free');
      if (!planAllocation) {
        res.status(403).json({ message: 'Invalid agency subscription plan', code: 'INVALID_PLAN' });
        return;
      }

      const usage = await (Promotion as any).getAgencyMonthlyUsage(agency._id);

      let hasAllocation = false;
      if (promotionTier === 'featured' && usage.featured < planAllocation.monthlyFeaturedAds) {
        hasAllocation = true;
      } else if (promotionTier === 'highlight' && usage.highlight < planAllocation.monthlyHighlightAds) {
        hasAllocation = true;
      } else if (promotionTier === 'premium' && usage.premium < planAllocation.monthlyPremiumAds) {
        hasAllocation = true;
      }

      if (!hasAllocation) {
        res.status(403).json({
          message: `Your agency has used all ${promotionTier} promotions for this month`,
          code: 'ALLOCATION_EXCEEDED',
        });
        return;
      }

      isFromAgencyAllocation = true;
      agencyId = agency._id;
      originalPrice = hasUrgentBadge ? URGENT_MODIFIER.price : 0;
      finalPrice = originalPrice;
    } else {
      const basePrice = getPromotionPrice(promotionTier, duration, hasUrgentBadge);
      originalPrice = basePrice;

      const agency = await Agency.findOne({ agents: user._id });
      if (agency) {
        const planAllocation = getAgencyAllocation(agency.subscriptionPlan || 'free');
        if (planAllocation && planAllocation.discountPercentage && planAllocation.discountPercentage > 0) {
          finalPrice = calculateDiscountedPrice(basePrice, planAllocation.discountPercentage);
        } else {
          finalPrice = basePrice;
        }
      } else {
        finalPrice = basePrice;
      }
    }

    // Apply coupon
    if (couponCode && finalPrice > 0) {
      const couponResult = await applyCoupon(couponCode, finalPrice, String(user._id), promotionTier);
      if (couponResult.error) {
        res.status(400).json({ message: couponResult.error, code: 'COUPON_ERROR' });
        return;
      }
      finalPrice = couponResult.finalPrice;
      couponDiscount = couponResult.couponDiscount;
      appliedCoupon = couponResult.coupon;
    }

    // Create promotion
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    const nextRefreshAt = promotionTier === 'highlight' ? calculateNextRefreshDate(startDate, endDate) : null;

    const promotion = await Promotion.create({
      userId: user._id,
      propertyId,
      startDate,
      endDate,
      isActive: true,
      promotionType: promotionTier === 'highlight' ? 'highlighted' : promotionTier,
      promotionTier,
      duration,
      hasUrgentBadge,
      price: finalPrice,
      currency: 'EUR',
      paymentStatus: 'paid',
      isFromAgencyAllocation,
      agencyId,
      viewsGenerated: 0,
      inquiriesGenerated: 0,
      savesGenerated: 0,
      lastRefreshedAt: startDate,
      nextRefreshAt,
      refreshCount: 0,
      purchasedVia: 'web',
      notes: appliedCoupon ? `Coupon applied: ${appliedCoupon.code} (€${couponDiscount.toFixed(2)} discount)` : undefined,
    });

    if (appliedCoupon && couponDiscount > 0) {
      await appliedCoupon.recordUsage(user._id, promotion._id, couponDiscount);
    }

    await updatePropertyPromotion(propertyId, {
      isPromoted: true,
      promotionTier,
      promotionStartDate: startDate,
      promotionEndDate: endDate,
      hasUrgentBadge,
    });

    user.promotedAdsCount = (user.promotedAdsCount || 0) + 1;
    await user.save();

    res.status(201).json({
      message: 'Property promotion created successfully',
      promotion,
      property: { id: property._id, title: property.title, address: property.address, city: property.city },
      pricing: {
        originalAmount: originalPrice,
        couponDiscount,
        finalAmount: finalPrice,
        currency: 'EUR',
        isFromAgencyAllocation,
      },
    });
  } catch (error: any) {
    promotionLogger.error('Purchase promotion error:', error);
    res.status(500).json({ message: 'Error creating promotion', error: error.message });
  }
};

/**
 * @desc    Create Stripe checkout session for promotion purchase
 * @route   POST /api/promotions/checkout
 * @access  Private
 */
export const createPromotionCheckout = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { propertyId, promotionTier, duration, hasUrgentBadge = false, couponCode } = req.body;

    if (!propertyId || !promotionTier || !duration) {
      res.status(400).json({ message: 'Property ID, promotion tier, and duration are required', code: 'MISSING_REQUIRED_FIELDS' });
      return;
    }

    if (!isValidTier(promotionTier)) {
      res.status(400).json({ message: 'Invalid promotion tier', code: 'INVALID_TIER' });
      return;
    }

    if (!isValidDuration(duration)) {
      res.status(400).json({ message: 'Invalid duration', code: 'INVALID_DURATION' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const { property, error: propertyError } = await verifyPropertyOwnership(propertyId, String(currentUser._id));
    if (propertyError || !property) {
      res.status(property ? 403 : 404).json({ message: propertyError, code: 'PROPERTY_ERROR' });
      return;
    }

    const existingPromotion = await hasActivePromotion(propertyId);
    if (existingPromotion) {
      res.status(400).json({ message: 'This property is already promoted', code: 'ALREADY_PROMOTED' });
      return;
    }

    let finalPrice = getPromotionPrice(promotionTier, duration, hasUrgentBadge);
    let couponDiscount = 0;
    let appliedCouponCode: string | undefined;

    if (couponCode && finalPrice > 0) {
      const couponResult = await applyCoupon(couponCode, finalPrice, String(user._id), promotionTier);
      if (!couponResult.error && couponResult.coupon) {
        finalPrice = couponResult.finalPrice;
        couponDiscount = couponResult.couponDiscount;
        appliedCouponCode = couponCode;
      }
    }

    // If free with coupon, create directly
    if (finalPrice === 0) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const promotion = await Promotion.create({
        userId: user._id,
        propertyId,
        startDate,
        endDate,
        isActive: true,
        promotionType: promotionTier === 'highlight' ? 'highlighted' : promotionTier,
        promotionTier,
        duration,
        hasUrgentBadge,
        price: 0,
        currency: 'EUR',
        paymentStatus: 'paid',
        purchasedVia: 'web',
        notes: appliedCouponCode ? `Free with coupon: ${appliedCouponCode}` : undefined,
      });

      await updatePropertyPromotion(propertyId, {
        isPromoted: true,
        promotionTier,
        promotionStartDate: startDate,
        promotionEndDate: endDate,
        hasUrgentBadge,
      });

      res.status(201).json({
        success: true,
        message: 'Promotion activated (free with coupon)',
        promotion,
        isFree: true,
      });
      return;
    }

    // Create Stripe checkout session
    const baseUrl = getBaseUrl();
    const tierInfo = PROMOTION_TIERS[promotionTier];

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${tierInfo.name} Promotion`,
              description: `${duration}-day promotion for "${property.title}"${hasUrgentBadge ? ' + Urgent Badge' : ''}`,
            },
            unit_amount: Math.round(finalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/promotions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/promotions/cancel?property_id=${propertyId}`,
      client_reference_id: String(user._id),
      metadata: {
        userId: String(user._id),
        propertyId: String(propertyId),
        promotionTier: String(promotionTier),
        duration: String(duration),
        hasUrgentBadge: String(hasUrgentBadge),
        couponCode: appliedCouponCode ?? '',
        couponDiscount: String(couponDiscount),
        originalPrice: String(finalPrice + couponDiscount),
        userEmail: user.email ?? '',
        propertyTitle: property.title ?? '',
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      pricing: {
        originalPrice: finalPrice + couponDiscount,
        discount: couponDiscount,
        finalPrice,
        currency: 'EUR',
      },
    });
  } catch (error: any) {
    promotionLogger.error('Create promotion checkout error:', error);

    // Check for Stripe configuration error
    if (error.message?.includes('STRIPE_SECRET_KEY')) {
      res.status(503).json({
        message: 'Payment service not configured. Please contact support.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
      return;
    }

    res.status(500).json({ message: 'Error creating checkout session', error: error.message });
  }
};

/**
 * @desc    Handle successful promotion payment
 * @route   POST /api/promotions/confirm-payment
 * @access  Private
 */
export const confirmPromotionPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ message: 'Session ID is required' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      res.status(400).json({ message: 'Payment not completed' });
      return;
    }

    // Check if already processed
    const existingPromotion = await Promotion.findOne({ transactionId: sessionId });
    if (existingPromotion) {
      res.status(200).json({
        success: true,
        message: 'Promotion already activated',
        promotion: existingPromotion,
      });
      return;
    }

    const { userId, propertyId, promotionTier, duration, hasUrgentBadge, couponCode, couponDiscount } = session.metadata || {};

    if (!userId || !propertyId || !promotionTier || !duration) {
      res.status(400).json({ message: 'Invalid session metadata' });
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(duration));

    const nextRefreshAt = promotionTier === 'highlight' ? calculateNextRefreshDate(startDate, endDate) : null;

    const promotion = await Promotion.create({
      userId,
      propertyId,
      startDate,
      endDate,
      isActive: true,
      promotionType: promotionTier === 'highlight' ? 'highlighted' : promotionTier,
      promotionTier,
      duration: parseInt(duration),
      hasUrgentBadge: hasUrgentBadge === 'true',
      price: (session.amount_total || 0) / 100,
      currency: 'EUR',
      paymentStatus: 'paid',
      transactionId: sessionId,
      viewsGenerated: 0,
      inquiriesGenerated: 0,
      savesGenerated: 0,
      lastRefreshedAt: startDate,
      nextRefreshAt,
      refreshCount: 0,
      purchasedVia: 'web',
      notes: couponCode ? `Coupon: ${couponCode} (-€${couponDiscount})` : undefined,
    });

    await updatePropertyPromotion(propertyId, {
      isPromoted: true,
      promotionTier,
      promotionStartDate: startDate,
      promotionEndDate: endDate,
      hasUrgentBadge: hasUrgentBadge === 'true',
    });

    // Record coupon usage
    if (couponCode && parseFloat(couponDiscount || '0') > 0) {
      const coupon = await (PromotionCoupon as any).findValidCoupon(couponCode);
      if (coupon) {
        await coupon.recordUsage(userId, promotion._id, parseFloat(couponDiscount));
      }
    }

    const user = await User.findById(userId);
    if (user) {
      user.promotedAdsCount = (user.promotedAdsCount || 0) + 1;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Promotion activated successfully',
      promotion,
    });
  } catch (error: any) {
    promotionLogger.error('Confirm promotion payment error:', error);
    res.status(500).json({ message: 'Error confirming payment', error: error.message });
  }
};
