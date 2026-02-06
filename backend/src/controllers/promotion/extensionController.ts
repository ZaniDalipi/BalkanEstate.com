/**
 * Promotion Extension Controller
 * Handles extending existing promotions
 */

import { Request, Response } from 'express';
import Promotion from '../../models/Promotion';
import Property from '../../models/Property';
import { IUser } from '../../models/User';
import PromotionCoupon from '../../models/PromotionCoupon';
import {
  PROMOTION_TIERS,
  getPromotionPrice,
  isValidDuration,
  applyCoupon,
  updatePropertyPromotion,
  getBaseUrl,
  PromotionTierType,
} from '../../services/promotion/promotionService';
import { promotionLogger } from '../../utils/logger';

/**
 * @desc    Extend an existing promotion
 * @route   POST /api/promotions/:id/extend
 * @access  Private
 */
export const extendPromotion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { duration, couponCode } = req.body;
    const idParam = req.params.id;

    if (!isValidDuration(duration)) {
      res.status(400).json({ message: 'Invalid duration', code: 'INVALID_DURATION' });
      return;
    }

    const currentUser = req.user as IUser;

    // Find promotion by ID or propertyId
    let promotion = await Promotion.findById(idParam);
    if (!promotion) {
      promotion = await Promotion.findOne({
        propertyId: idParam,
        isActive: true,
        endDate: { $gt: new Date() },
      });
    }

    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    if (promotion.userId.toString() !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to extend this promotion' });
      return;
    }

    const property = await Property.findById(promotion.propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const promotionTier = promotion.promotionTier as PromotionTierType;
    let extensionPrice = getPromotionPrice(promotionTier, duration, false);
    let couponDiscount = 0;
    let appliedCouponCode: string | undefined;

    if (couponCode && extensionPrice > 0) {
      const couponResult = await applyCoupon(couponCode, extensionPrice, String(currentUser._id), promotionTier);
      if (!couponResult.error && couponResult.coupon) {
        extensionPrice = couponResult.finalPrice;
        couponDiscount = couponResult.couponDiscount;
        appliedCouponCode = couponCode;
      }
    }

    // If free with coupon, extend directly
    if (extensionPrice === 0) {
      const currentEndDate = new Date(promotion.endDate);
      const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + duration);

      promotion.endDate = newEndDate;
      promotion.duration = promotion.duration + duration;
      promotion.isActive = true;
      if (appliedCouponCode) {
        promotion.notes = (promotion.notes || '') + ` | Extended with coupon: ${appliedCouponCode}`;
      }
      await promotion.save();

      await updatePropertyPromotion(promotion.propertyId.toString(), {
        isPromoted: true,
        promotionEndDate: newEndDate,
      });

      if (appliedCouponCode && couponDiscount > 0) {
        const coupon = await (PromotionCoupon as any).findValidCoupon(appliedCouponCode);
        if (coupon) {
          await coupon.recordUsage(currentUser._id, promotion._id, couponDiscount);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Promotion extended successfully (free with coupon)',
        promotion,
        newEndDate: newEndDate.toISOString(),
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
        originalPrice: extensionPrice + couponDiscount,
        discount: couponDiscount,
        finalPrice: extensionPrice,
        currency: 'EUR',
      },
    });
  } catch (error: any) {
    promotionLogger.error('Extend promotion error:', error);
    res.status(500).json({ message: 'Error extending promotion', error: error.message });
  }
};

/**
 * @desc    Confirm extension payment
 * @route   POST /api/promotions/confirm-extension
 * @access  Private
 */
export const confirmExtensionPayment = async (
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
    promotionLogger.error('Confirm extension payment error:', error);
    res.status(500).json({ message: 'Error confirming extension', error: error.message });
  }
};
