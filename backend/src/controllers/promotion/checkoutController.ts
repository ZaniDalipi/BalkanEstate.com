/**
 * Promotion Checkout Controller
 * Handles checkout and payment confirmation for new promotions
 */

import { Request, Response } from 'express';
import Promotion from '../../models/Promotion';
import User, { IUser } from '../../models/User';
import Agency from '../../models/Agency';
import {
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
 * @desc    Create checkout session for promotion purchase
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

    // Payment provider not yet configured
    // TODO: Integrate with new payment provider when selected (see PAYMENT_OPTIONS_2026.md)
    res.status(503).json({
      success: false,
      message: 'Payment processing is not yet configured. Please contact support.',
      code: 'PAYMENT_NOT_CONFIGURED',
      pricing: {
        originalPrice: finalPrice + couponDiscount,
        discount: couponDiscount,
        finalPrice,
        currency: 'EUR',
      },
    });
  } catch (error: any) {
    promotionLogger.error('Create promotion checkout error:', error);
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

    // TODO: Integrate with new payment provider when selected (see PAYMENT_OPTIONS_2026.md)
    res.status(503).json({
      success: false,
      message: 'Payment confirmation is not yet configured. Please contact support.',
      code: 'PAYMENT_NOT_CONFIGURED',
    });
  } catch (error: any) {
    promotionLogger.error('Confirm promotion payment error:', error);
    res.status(500).json({ message: 'Error confirming payment', error: error.message });
  }
};
