/**
 * Promotion Service
 * Shared utilities and business logic for promotions
 */

import Promotion, { IPromotion } from '../../models/Promotion';
import Property from '../../models/Property';
import Agency from '../../models/Agency';
import PromotionCoupon from '../../models/PromotionCoupon';
import {
  PROMOTION_TIERS,
  PROMOTION_PRICING,
  URGENT_MODIFIER,
  getPromotionPrice,
  getAgencyAllocation,
  calculateDiscountedPrice,
  PromotionTierType,
  PromotionDuration,
} from '../../config/promotionTiers';

// Re-export tier config for convenience
export {
  PROMOTION_TIERS,
  PROMOTION_PRICING,
  URGENT_MODIFIER,
  getPromotionPrice,
  getAgencyAllocation,
  calculateDiscountedPrice,
};

export type { PromotionTierType, PromotionDuration };

/**
 * Validate promotion tier
 */
export const isValidTier = (tier: string): tier is PromotionTierType => {
  return ['featured', 'highlight', 'premium'].includes(tier);
};

/**
 * Validate promotion duration
 */
export const isValidDuration = (duration: number): duration is PromotionDuration => {
  return [7, 15, 30, 60, 90].includes(duration);
};

/**
 * Check if user owns the property
 */
export const verifyPropertyOwnership = async (
  propertyId: string,
  userId: string
): Promise<{ property: any; error?: string }> => {
  const property = await Property.findById(propertyId);

  if (!property) {
    return { property: null, error: 'Property not found' };
  }

  if (property.sellerId.toString() !== userId) {
    return { property: null, error: 'You can only promote your own properties' };
  }

  return { property };
};

/**
 * Check if property already has active promotion
 */
export const hasActivePromotion = async (propertyId: string): Promise<IPromotion | null> => {
  return Promotion.findOne({
    propertyId,
    isActive: true,
    endDate: { $gt: new Date() },
  });
};

/**
 * Verify promotion ownership
 */
export const verifyPromotionOwnership = async (
  promotionId: string,
  userId: string
): Promise<{ promotion: IPromotion | null; error?: string }> => {
  const promotion = await Promotion.findById(promotionId);

  if (!promotion) {
    return { promotion: null, error: 'Promotion not found' };
  }

  if (promotion.userId.toString() !== userId) {
    return { promotion: null, error: 'Not authorized to modify this promotion' };
  }

  return { promotion };
};

/**
 * Check if promotion is still active
 */
export const isPromotionActive = (promotion: IPromotion): boolean => {
  return promotion.isActive && promotion.endDate > new Date();
};

/**
 * Apply coupon and calculate final price
 */
export const applyCoupon = async (
  couponCode: string,
  basePrice: number,
  userId: string,
  promotionTier: PromotionTierType
): Promise<{
  finalPrice: number;
  couponDiscount: number;
  coupon: any | null;
  error?: string;
}> => {
  if (!couponCode || basePrice <= 0) {
    return { finalPrice: basePrice, couponDiscount: 0, coupon: null };
  }

  const coupon = await (PromotionCoupon as any).findValidCoupon(couponCode);

  if (!coupon) {
    return { finalPrice: basePrice, couponDiscount: 0, coupon: null, error: 'Invalid or expired coupon code' };
  }

  const canUse = await coupon.canBeUsedBy(userId);
  if (!canUse) {
    return { finalPrice: basePrice, couponDiscount: 0, coupon: null, error: 'You have reached the usage limit for this coupon' };
  }

  // Check tier applicability
  if (coupon.applicableTiers?.length > 0 && !coupon.applicableTiers.includes(promotionTier)) {
    return {
      finalPrice: basePrice,
      couponDiscount: 0,
      coupon: null,
      error: `This coupon is only valid for: ${coupon.applicableTiers.join(', ')}`
    };
  }

  // Check minimum purchase
  if (coupon.minimumPurchaseAmount && basePrice < coupon.minimumPurchaseAmount) {
    return {
      finalPrice: basePrice,
      couponDiscount: 0,
      coupon: null,
      error: `Minimum purchase amount of €${coupon.minimumPurchaseAmount} required`
    };
  }

  const couponDiscount = coupon.calculateDiscount(basePrice);
  const finalPrice = Math.max(0, basePrice - couponDiscount);

  return { finalPrice, couponDiscount, coupon };
};

/**
 * Get agency discount for user
 */
export const getAgencyDiscount = async (userId: string): Promise<number> => {
  const agency = await Agency.findOne({ agents: userId });
  if (!agency) return 0;

  const allocation = getAgencyAllocation(agency.subscriptionPlan || 'free');
  return allocation?.discountPercentage || 0;
};

/**
 * Update property with promotion data
 */
export const updatePropertyPromotion = async (
  propertyId: string,
  data: {
    isPromoted: boolean;
    promotionTier?: string;
    promotionStartDate?: Date;
    promotionEndDate?: Date;
    hasUrgentBadge?: boolean;
  }
): Promise<void> => {
  const property = await Property.findById(propertyId);
  if (!property) return;

  Object.assign(property, data);
  await property.save();
};

/**
 * Clear property promotion data
 */
export const clearPropertyPromotion = async (propertyId: string): Promise<void> => {
  await updatePropertyPromotion(propertyId, {
    isPromoted: false,
    promotionTier: undefined,
    hasUrgentBadge: false,
    promotionStartDate: undefined,
    promotionEndDate: undefined,
  });
};

/**
 * Calculate next refresh date for Highlight tier
 */
export const calculateNextRefreshDate = (startDate: Date, endDate: Date): Date | null => {
  const nextRefresh = new Date(startDate);
  nextRefresh.setDate(nextRefresh.getDate() + 3);

  return nextRefresh > endDate ? endDate : nextRefresh;
};

/**
 * Enrich promotion with tier info
 */
export const enrichPromotion = (promotion: any) => {
  const tierInfo = PROMOTION_TIERS[promotion.promotionTier as PromotionTierType];
  return {
    ...promotion.toObject?.() || promotion,
    tierInfo,
  };
};

/**
 * Get base URL for payment redirects
 */
export const getBaseUrl = (): string => {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};
