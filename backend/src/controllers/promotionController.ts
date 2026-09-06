import { Request, Response } from 'express';
import { escapeRegex } from '../utils/escapeRegex';
import Promotion from '../models/Promotion';
import Property from '../models/Property';
import User, { IUser } from '../models/User';
import Agency from '../models/Agency';
import PromotionCoupon from '../models/PromotionCoupon';
import {
  PROMOTION_TIERS,
  PROMOTION_PRICING,
  URGENT_MODIFIER,
  AGENCY_PLAN_ALLOCATIONS,
  getPromotionPrice,
  getAgencyAllocation as getAgencyAllocationConfig, // Renamed import
  calculateDiscountedPrice,
  PromotionTierType,
  PromotionDuration,
} from '../config/promotionTiers';
import { paymentProviderFactory } from '../services/paymentProviderFactory';
import { promotionLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';

/**
 * @desc    Get available promotion tiers and pricing
 * @route   GET /api/promotions/tiers
 * @access  Public
 */
export const getPromotionTiers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json({
      tiers: PROMOTION_TIERS,
      pricing: PROMOTION_PRICING,
      urgentModifier: URGENT_MODIFIER,
      agencyAllocations: AGENCY_PLAN_ALLOCATIONS,
    });
  } catch (error: any) {
    promotionLogger.error('Get promotion tiers error:', error);
    res.status(500).json({ message: 'Error fetching promotion tiers' });
  }
};

/**
 * @desc    Get agency's monthly promotion allocation and usage
 * @route   GET /api/promotions/agency/allocation
 * @access  Private (Agency owners only)
 */
export const getAgencyPromotionAllocation = async ( // Renamed function
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Find agency owned by this user
    const agency = await Agency.findOne({ ownerId: user._id });

    if (!agency) {
      res.status(404).json({
        message: 'No agency found. Only agency owners can access allocation data.',
        code: 'NO_AGENCY_FOUND',
      });
      return;
    }

    // Get plan allocation
    const planAllocation = getAgencyAllocationConfig(agency.subscriptionPlan || 'free');

    if (!planAllocation) {
      res.status(404).json({ message: 'Invalid subscription plan' });
      return;
    }

    // Get current month usage
    const usage = await (Promotion as any).getAgencyMonthlyUsage(agency._id);

    const allocation = {
      plan: planAllocation,
      usage,
      remaining: {
        featured: Math.max(0, planAllocation.monthlyFeaturedAds - usage.featured),
        highlight: Math.max(0, planAllocation.monthlyHighlightAds - usage.highlight),
        premium: Math.max(0, planAllocation.monthlyPremiumAds - usage.premium),
      },
    };

    res.json({ allocation, agency: { id: agency._id, name: agency.name } });
  } catch (error: any) {
    promotionLogger.error('Get agency allocation error:', error);
    res.status(500).json({ message: 'Error fetching agency allocation' });
  }
};

/**
 * @desc    Purchase/Create a property promotion
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

    // Validation
    if (!propertyId || !promotionTier || !duration) {
      res.status(400).json({
        message: 'Property ID, promotion tier, and duration are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    const validTiers: PromotionTierType[] = ['featured', 'highlight', 'premium'];
    if (!validTiers.includes(promotionTier)) {
      res.status(400).json({
        message: 'Invalid promotion tier. Must be featured, highlight, or premium',
        code: 'INVALID_TIER',
      });
      return;
    }

    const validDurations: PromotionDuration[] = [7, 15, 30, 60, 90];
    if (!validDurations.includes(duration)) {
      res.status(400).json({
        message: 'Invalid duration. Must be 7, 15, 30, 60, or 90 days',
        code: 'INVALID_DURATION',
      });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if property exists and belongs to user
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== String(currentUser._id)) {
      res.status(403).json({
        message: 'You can only promote your own properties',
        code: 'NOT_PROPERTY_OWNER',
      });
      return;
    }

    // Check if property is already promoted
    const existingPromotion = await Promotion.findOne({
      propertyId,
      isActive: true,
      endDate: { $gt: new Date() },
    });

    if (existingPromotion) {
      res.status(400).json({
        message: 'This property is already promoted. Please wait for the current promotion to expire or cancel it first.',
        code: 'ALREADY_PROMOTED',
        promotion: existingPromotion,
      });
      return;
    }

    let isFromAgencyAllocation = false;
    let agencyId = null;
    let allocationAgency: any = null; // Reference to agency for coupon counter update
    let finalPrice = 0;
    let appliedCoupon = null;
    let couponDiscount = 0;
    let originalPrice = 0;

    // Check agency allocation if requested
    if (useAgencyAllocation) {
      const agency = await Agency.findOne({ ownerId: user._id });

      if (!agency) {
        res.status(403).json({
          message: 'Agency allocation requested but no agency found for this user',
          code: 'NO_AGENCY',
        });
        return;
      }

      const planAllocation = getAgencyAllocationConfig(agency.subscriptionPlan || 'free');

      if (!planAllocation) {
        res.status(403).json({
          message: 'Invalid agency subscription plan',
          code: 'INVALID_PLAN',
        });
        return;
      }

      // Get current month usage
      const usage = await (Promotion as any).getAgencyMonthlyUsage(agency._id);

      // Check if agency has remaining allocation for this tier
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
          allocation: {
            plan: planAllocation,
            usage,
          },
        });
        return;
      }

      isFromAgencyAllocation = true;
      agencyId = agency._id;
      allocationAgency = agency;
      originalPrice = hasUrgentBadge ? URGENT_MODIFIER.price : 0;
      finalPrice = originalPrice; // Urgent badge still costs if agency allocation is used

    } else {
      // Calculate price for paid promotion
      const basePrice = getPromotionPrice(promotionTier, duration, hasUrgentBadge);
      originalPrice = basePrice;

      // Apply agency discount if user is part of an agency
      const agency = await Agency.findOne({ agents: user._id });
      if (agency) {
        const planAllocation = getAgencyAllocationConfig(agency.subscriptionPlan || 'free');
        if (planAllocation && planAllocation.discountPercentage > 0) {
          finalPrice = calculateDiscountedPrice(basePrice, planAllocation.discountPercentage);
        } else {
          finalPrice = basePrice;
        }
      } else {
        finalPrice = basePrice;
      }
    }

    // Apply coupon code if provided
    if (couponCode && finalPrice > 0) {
      const coupon = await (PromotionCoupon as any).findValidCoupon(couponCode);

      if (!coupon) {
        res.status(400).json({
          message: 'Invalid or expired coupon code',
          code: 'INVALID_COUPON',
        });
        return;
      }

      // Check if user can use this coupon
      const canUse = await coupon.canBeUsedBy(user._id);
      if (!canUse) {
        res.status(403).json({
          message: 'You have reached the usage limit for this coupon',
          code: 'COUPON_LIMIT_REACHED',
        });
        return;
      }

      // Check if applicable to tier
      if (coupon.applicableTiers && coupon.applicableTiers.length > 0) {
        if (!coupon.applicableTiers.includes(promotionTier)) {
          res.status(403).json({
            message: `This coupon is only valid for: ${coupon.applicableTiers.join(', ')}`,
            code: 'INVALID_TIER_FOR_COUPON',
            applicableTiers: coupon.applicableTiers,
          });
          return;
        }
      }

      // Check minimum purchase amount
      if (coupon.minimumPurchaseAmount && finalPrice < coupon.minimumPurchaseAmount) {
        res.status(403).json({
          message: `Minimum purchase amount of €${coupon.minimumPurchaseAmount} required for this coupon`,
          code: 'MINIMUM_NOT_MET',
          minimumRequired: coupon.minimumPurchaseAmount,
          currentAmount: finalPrice,
        });
        return;
      }

      // Calculate discount
      couponDiscount = coupon.calculateDiscount(finalPrice);
      const priceAfterCoupon = Math.max(0, finalPrice - couponDiscount);

      appliedCoupon = coupon;
      finalPrice = priceAfterCoupon;
    }

    // Create promotion
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    // Calculate next refresh date for Highlight tier
    let nextRefreshAt = null;
    if (promotionTier === 'highlight') {
      nextRefreshAt = new Date(startDate);
      nextRefreshAt.setDate(nextRefreshAt.getDate() + 3); // Refresh every 3 days
    }

    // Create promotion with 'paid' status
    // NOTE: When integrating payment provider, change this flow to:
    // 1. Create promotion with 'pending' status
    // 2. Create checkout session
    // 3. On webhook confirmation, update to 'paid'
    // For now, we mark as 'paid' immediately to enable the feature
    const promotion = await Promotion.create({
      userId: user._id,
      propertyId,
      startDate,
      endDate,
      isActive: true,
      promotionType: promotionTier === 'highlight' ? 'highlighted' : promotionTier, // Legacy field
      promotionTier,
      duration,
      hasUrgentBadge,
      price: finalPrice,
      currency: 'EUR',
      paymentStatus: 'paid', // Mark as paid immediately (integrate with payment provider later)
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

    // Record coupon usage if applied
    if (appliedCoupon && couponDiscount > 0) {
      await appliedCoupon.recordUsage(user._id, promotion._id, couponDiscount);
    }

    // Update agency promotion coupon counters when using agency allocation
    if (isFromAgencyAllocation && allocationAgency) {
      // Refresh monthly pool if a new month has started
      if (allocationAgency.refreshPromotionCoupons) {
        allocationAgency.refreshPromotionCoupons();
      }
      if (allocationAgency.promotionCoupons && allocationAgency.promotionCoupons.available > 0) {
        allocationAgency.promotionCoupons.available -= 1;
        allocationAgency.promotionCoupons.used += 1;
      }

      // Also update the specific coupon code status if a coupon code from the agency pool was used
      if (couponCode && allocationAgency.promotionCoupons?.codes?.length > 0) {
        const matchingCode = allocationAgency.promotionCoupons.codes.find(
          (c: any) => c.code === couponCode && c.status === 'available'
        );
        if (matchingCode) {
          matchingCode.status = 'used';
          matchingCode.usedBy = { name: user.name || user.email };
        }
      }

      await allocationAgency.save();
    }

    // Update property
    property.isPromoted = true;
    property.promotionTier = promotionTier;
    property.promotionStartDate = startDate;
    property.promotionEndDate = endDate;
    property.hasUrgentBadge = hasUrgentBadge;
    await property.save();

    // Update user's promoted ads count
    user.promotedAdsCount = (user.promotedAdsCount || 0) + 1;
    await user.save();

    res.status(201).json({
      message: 'Property promotion created successfully',
      promotion,
      property: {
        id: property._id,
        title: property.title,
        address: property.address,
        city: property.city,
      },
      pricing: {
        originalAmount: originalPrice,
        couponDiscount: couponDiscount,
        finalAmount: finalPrice,
        currency: 'EUR',
        isFromAgencyAllocation,
        couponApplied: appliedCoupon ? {
          code: appliedCoupon.code,
          discountType: appliedCoupon.discountType,
          discountValue: appliedCoupon.discountValue,
        } : null,
      },
      // Include updated coupon counters so frontend can update immediately
      ...(isFromAgencyAllocation && allocationAgency?.promotionCoupons ? {
        promotionCoupons: {
          available: allocationAgency.promotionCoupons.available,
          used: allocationAgency.promotionCoupons.used,
          monthly: allocationAgency.promotionCoupons.monthly,
        },
      } : {}),
    });
  } catch (error: any) {
    promotionLogger.error('Purchase promotion error:', error);
    res.status(500).json({ message: 'Error creating promotion' });
  }
};

/**
 * @desc    Get user's promotions
 * @route   GET /api/promotions
 * @access  Private
 */
export const getMyPromotions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const promotions = await Promotion.find({
      userId: String((req.user as IUser)._id),
    })
      .populate('propertyId', 'title images price city country address propertyType status sellerId')
      .sort({ createdAt: -1 });

    // Add tier information to each promotion
    const enrichedPromotions = promotions.map(promo => {
      const tierInfo = PROMOTION_TIERS[promo.promotionTier as PromotionTierType];
      return {
        ...promo.toObject(),
        tierInfo,
      };
    });

    res.json({ promotions: enrichedPromotions });
  } catch (error: any) {
    promotionLogger.error('Get promotions error:', error);
    res.status(500).json({ message: 'Error fetching promotions' });
  }
};

/**
 * @desc    Cancel/deactivate a promotion
 * @route   DELETE /api/promotions/:id
 * @access  Private
 */
export const cancelPromotion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const promotionId = getObjectIdParam(req, res, 'id');
    if (!promotionId) return;
    const promotion = await Promotion.findById(promotionId);

    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Check ownership
    if (promotion.userId.toString() !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to cancel this promotion' });
      return;
    }

    // Deactivate promotion
    promotion.isActive = false;
    await promotion.save();

    // Update property
    const property = await Property.findById(promotion.propertyId);
    if (property) {
      property.isPromoted = false;
      property.promotionTier = undefined;
      property.hasUrgentBadge = false;
      await property.save();
    }

    // Update user's promoted ads count
    const user = await User.findById(String((req.user as IUser)._id));
    if (user && user.promotedAdsCount && user.promotedAdsCount > 0) {
      user.promotedAdsCount -= 1;
      await user.save();
    }

    res.json({ message: 'Promotion cancelled successfully' });
  } catch (error: any) {
    promotionLogger.error('Cancel promotion error:', error);
    res.status(500).json({ message: 'Error cancelling promotion' });
  }
};

/**
 * @desc    Get all promoted properties (public)
 * @route   GET /api/promotions/featured
 * @access  Public
 */
export const getFeaturedProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { city, tier, limit = 20 } = req.query;

    // Find active promotions
    const filter: any = {
      isActive: true,
      endDate: { $gt: new Date() },
      paymentStatus: 'paid',
    };

    if (tier) {
      filter.promotionTier = tier;
    }

    const promotions = await Promotion.find(filter)
      .populate({
        path: 'propertyId',
        match: city
          ? { city: new RegExp(escapeRegex(city as string), 'i'), status: 'active' }
          : { status: 'active' },
        populate: {
          path: 'sellerId',
          select: 'name email phone avatarUrl avatarOptions gender role agencyName',
        },
      })
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // Filter out promotions where property was not found or doesn't match filters
    const validPromotions = promotions.filter(p => p.propertyId !== null);

    // Sort by priority (Premium > Highlight > Featured)
    validPromotions.sort((a, b) => {
      const scoreA = (a as any).getPriorityScore();
      const scoreB = (b as any).getPriorityScore();
      return scoreB - scoreA;
    });

    // Add tier info to response
    const enrichedPromotions = validPromotions.map(promo => {
      const tierInfo = PROMOTION_TIERS[promo.promotionTier as PromotionTierType];
      return {
        ...promo.toObject(),
        tierInfo,
      };
    });

    res.json({
      promotions: enrichedPromotions,
      total: enrichedPromotions.length,
    });
  } catch (error: any) {
    promotionLogger.error('Get featured properties error:', error);
    res.status(500).json({ message: 'Error fetching featured properties' });
  }
};

/**
 * @desc    Get promotion statistics
 * @route   GET /api/promotions/:id/stats
 * @access  Private (Owner only)
 */
export const getPromotionStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const promotionId = getObjectIdParam(req, res, 'id');
    if (!promotionId) return;
    const promotion = await Promotion.findById(promotionId).populate('propertyId', 'title images price city country address propertyType status sellerId views saves inquiries');

    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Check ownership
    if (promotion.userId.toString() !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to view this promotion' });
      return;
    }

    const property = promotion.propertyId as any;

    // Calculate stats
    const daysActive = Math.floor(
      (Date.now() - promotion.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.max(
      0,
      Math.floor((promotion.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    const stats = {
      promotion: {
        id: promotion._id,
        tier: promotion.promotionTier,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        daysActive,
        daysRemaining,
        isActive: promotion.isActive && promotion.endDate > new Date(),
      },
      performance: {
        views: promotion.viewsGenerated,
        inquiries: promotion.inquiriesGenerated,
        saves: promotion.savesGenerated,
        refreshCount: promotion.refreshCount,
      },
      property: property ? {
        id: property._id,
        title: property.title,
        city: property.city,
        price: property.price,
        totalViews: property.views,
        totalSaves: property.saves,
        totalInquiries: property.inquiries,
      } : null,
      tierInfo: PROMOTION_TIERS[promotion.promotionTier as PromotionTierType],
    };

    res.json({ stats });
  } catch (error: any) {
    promotionLogger.error('Get promotion stats error:', error);
    res.status(500).json({ message: 'Error fetching promotion stats' });
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

    const {
      propertyId,
      promotionTier,
      duration,
      hasUrgentBadge = false,
      couponCode,
    } = req.body;

    // Validation
    if (!propertyId || !promotionTier || !duration) {
      res.status(400).json({
        message: 'Property ID, promotion tier, and duration are required',
        code: 'MISSING_REQUIRED_FIELDS',
      });
      return;
    }

    const validTiers: PromotionTierType[] = ['featured', 'highlight', 'premium'];
    if (!validTiers.includes(promotionTier)) {
      res.status(400).json({
        message: 'Invalid promotion tier',
        code: 'INVALID_TIER',
      });
      return;
    }

    const validDurations: PromotionDuration[] = [7, 15, 30, 60, 90];
    if (!validDurations.includes(duration)) {
      res.status(400).json({
        message: 'Invalid duration',
        code: 'INVALID_DURATION',
      });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if property exists and belongs to user
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== String(currentUser._id)) {
      res.status(403).json({
        message: 'You can only promote your own properties',
        code: 'NOT_PROPERTY_OWNER',
      });
      return;
    }

    // Check if property is already promoted
    const existingPromotion = await Promotion.findOne({
      propertyId,
      isActive: true,
      endDate: { $gt: new Date() },
    });

    if (existingPromotion) {
      res.status(400).json({
        message: 'This property is already promoted',
        code: 'ALREADY_PROMOTED',
      });
      return;
    }

    // Calculate price
    let finalPrice = getPromotionPrice(promotionTier, duration, hasUrgentBadge);
    let couponDiscount = 0;
    let appliedCouponCode: string | undefined;

    // Apply coupon if provided
    if (couponCode && finalPrice > 0) {
      const coupon = await (PromotionCoupon as any).findValidCoupon(couponCode);

      if (coupon) {
        const canUse = await coupon.canBeUsedBy(user._id);
        if (canUse) {
          if (!coupon.applicableTiers || coupon.applicableTiers.length === 0 || coupon.applicableTiers.includes(promotionTier)) {
            if (!coupon.minimumPurchaseAmount || finalPrice >= coupon.minimumPurchaseAmount) {
              couponDiscount = coupon.calculateDiscount(finalPrice);
              finalPrice = Math.max(0, finalPrice - couponDiscount);
              appliedCouponCode = couponCode;
            }
          }
        }
      }
    }

    // If price is 0 (free with coupon), process directly
    if (finalPrice === 0) {
      // Create promotion directly
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

      // Update property
      property.isPromoted = true;
      // Cast to property's tier type (excludes 'urgent' which is only a badge modifier)
      property.promotionTier = promotionTier as 'standard' | 'featured' | 'highlight' | 'premium';
      property.promotionStartDate = startDate;
      property.promotionEndDate = endDate;
      property.hasUrgentBadge = hasUrgentBadge;
      await property.save();

      res.status(201).json({
        success: true,
        message: 'Promotion activated (free with coupon)',
        promotion,
        isFree: true,
      });
      return;
    }

    // Create checkout session via payment provider factory
    const result = await paymentProviderFactory.createPromotionPayment({
      userId: String(user._id),
      userEmail: user.email ?? '',
      userName: user.name,
      propertyId: String(propertyId),
      propertyTitle: property.title ?? '',
      promotionTier: promotionTier as 'featured' | 'highlight' | 'premium',
      duration,
      hasUrgentBadge,
      amount: finalPrice,
      couponCode: appliedCouponCode,
      couponDiscount,
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to create checkout session',
        code: 'CHECKOUT_FAILED',
      });
      return;
    }

    res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      url: result.paymentUrl,
      provider: result.provider,
      pricing: {
        originalPrice: finalPrice + couponDiscount,
        discount: couponDiscount,
        finalPrice,
        currency: 'EUR',
      },
    });
  } catch (error: any) {
    promotionLogger.error('Create promotion checkout error:', error);
    res.status(500).json({ message: 'Error creating checkout session' });
  }
};

/**
 * @desc    Handle successful promotion payment (webhook or verification)
 * @route   POST /api/promotions/confirm-payment
 * @access  Private
 *
 * Note: Promotions are created via webhook (handlePromotionOrder).
 * This endpoint is for verification/polling after payment redirect.
 */
export const confirmPromotionPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId, propertyId: rawPropertyId } = req.body;

    if (!rawPropertyId && !sessionId) {
      res.status(400).json({ message: 'Property ID or Session ID is required' });
      return;
    }

    // Resolve obfuscated or raw ID
    const propertyId = rawPropertyId ? (resolveId(rawPropertyId) || rawPropertyId) : undefined;

    // Check if promotion was already created by webhook
    const searchCriteria: any = {
      isActive: true,
      paymentStatus: 'paid',
      endDate: { $gt: new Date() },
    };

    if (sessionId) {
      searchCriteria.transactionId = sessionId;
    }
    if (propertyId) {
      searchCriteria.propertyId = propertyId;
    }

    const existingPromotion = await Promotion.findOne(searchCriteria)
      .sort({ createdAt: -1 });

    if (existingPromotion) {
      const property = await Property.findById(existingPromotion.propertyId);
      res.status(200).json({
        success: true,
        message: 'Promotion activated successfully',
        promotion: existingPromotion,
        property: property ? {
          id: property._id,
          title: property.title,
        } : null,
      });
      return;
    }

    // If no promotion found yet, payment might still be processing
    res.status(200).json({
      success: true,
      paymentStatus: 'processing',
      message: 'Payment is being processed. Please wait a moment.',
    });
  } catch (error: any) {
    promotionLogger.error('Confirm promotion payment error:', error);
    res.status(500).json({ message: 'Error confirming payment' });
  }
};

/**
 * @desc    Extend an existing promotion by adding more days
 * @route   POST /api/promotions/:id/extend (id can be promotionId or propertyId)
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
    const idParam = getObjectIdParam(req, res, 'id');
    if (!idParam) return;

    const validDurations: PromotionDuration[] = [7, 15, 30, 60, 90];
    if (!validDurations.includes(duration)) {
      res.status(400).json({ message: 'Invalid duration', code: 'INVALID_DURATION' });
      return;
    }

    const currentUser = req.user as IUser;

    // Try to find promotion by ID first, then by propertyId
    let promotion = await Promotion.findById(idParam);
    if (!promotion) {
      // Try finding by propertyId (for active promotions)
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

    // Verify ownership
    if (promotion.userId.toString() !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to extend this promotion' });
      return;
    }

    // Get property
    const property = await Property.findById(promotion.propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Calculate extension price
    const promotionTier = promotion.promotionTier as PromotionTierType;
    let extensionPrice = getPromotionPrice(promotionTier, duration, false); // No urgent badge on extension
    let couponDiscount = 0;
    let appliedCouponCode: string | undefined;

    // Apply coupon if provided
    if (couponCode && extensionPrice > 0) {
      const coupon = await (PromotionCoupon as any).findValidCoupon(couponCode);
      if (coupon) {
        const canUse = await coupon.canBeUsedBy(currentUser._id);
        if (canUse) {
          if (!coupon.applicableTiers || coupon.applicableTiers.length === 0 || coupon.applicableTiers.includes(promotionTier)) {
            couponDiscount = coupon.calculateDiscount(extensionPrice);
            extensionPrice = Math.max(0, extensionPrice - couponDiscount);
            appliedCouponCode = couponCode;
          }
        }
      }
    }

    // If free with coupon, extend directly
    if (extensionPrice === 0) {
      // Calculate new end date from current end date (or now if expired)
      const currentEndDate = new Date(promotion.endDate);
      const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + duration);

      // Update promotion
      promotion.endDate = newEndDate;
      promotion.duration = promotion.duration + duration;
      promotion.isActive = true;
      if (appliedCouponCode) {
        promotion.notes = (promotion.notes || '') + ` | Extended with coupon: ${appliedCouponCode}`;
      }
      await promotion.save();

      // Update property
      property.promotionEndDate = newEndDate;
      property.isPromoted = true;
      await property.save();

      // Record coupon usage
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

    // Create checkout for paid extension
    const result = await paymentProviderFactory.createPromotionPayment({
      userId: String(currentUser._id),
      userEmail: currentUser.email ?? '',
      userName: currentUser.name,
      propertyId: String(property._id),
      propertyTitle: property.title ?? '',
      promotionTier: promotionTier as 'featured' | 'highlight' | 'premium',
      duration,
      hasUrgentBadge: false,
      amount: extensionPrice,
      couponCode: appliedCouponCode,
      couponDiscount,
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to create extension checkout',
        code: 'CHECKOUT_FAILED',
      });
      return;
    }

    res.status(200).json({
      success: true,
      sessionId: result.sessionId,
      url: result.paymentUrl,
      provider: result.provider,
      pricing: {
        originalPrice: extensionPrice + couponDiscount,
        discount: couponDiscount,
        finalPrice: extensionPrice,
        currency: 'EUR',
      },
    });
  } catch (error: any) {
    promotionLogger.error('Extend promotion error:', error);
    res.status(500).json({ message: 'Error extending promotion' });
  }
};

/**
 * @desc    Confirm extension payment (from payment redirect)
 * @route   POST /api/promotions/confirm-extension
 * @access  Private
 *
 * Note: Extensions are processed via webhook.
 * This endpoint is for verification/polling after payment redirect.
 */
export const confirmExtensionPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { promotionId: rawPromotionId, propertyId: rawPropId } = req.body;

    if (!rawPromotionId && !rawPropId) {
      res.status(400).json({ message: 'Promotion ID or Property ID is required' });
      return;
    }

    // Resolve obfuscated or raw IDs
    const promotionId = rawPromotionId ? (resolveId(rawPromotionId) || rawPromotionId) : undefined;
    const propertyId = rawPropId ? (resolveId(rawPropId) || rawPropId) : undefined;

    // Find the promotion
    let promotion;
    if (promotionId) {
      promotion = await Promotion.findById(promotionId);
    } else if (propertyId) {
      promotion = await Promotion.findOne({
        propertyId,
        isActive: true,
        endDate: { $gt: new Date() },
      }).sort({ createdAt: -1 });
    }

    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Return current promotion status
    res.status(200).json({
      success: true,
      message: promotion.isActive ? 'Promotion is active' : 'Promotion status pending',
      promotion,
      newEndDate: promotion.endDate.toISOString(),
    });
  } catch (error: any) {
    promotionLogger.error('Confirm extension payment error:', error);
    res.status(500).json({ message: 'Error confirming extension' });
  }
};

/**
 * @desc    Add urgent badge to existing promotion
 * @route   POST /api/promotions/:id/add-urgent
 * @access  Private (Owner only)
 */
export const addUrgentBadge = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const promotionId = getObjectIdParam(req, res, 'id');
    if (!promotionId) return;
    const userId = String((req.user as IUser)._id);

    // Find promotion
    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Check ownership
    if (promotion.userId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to modify this promotion' });
      return;
    }

    // Check if promotion is still active
    if (!promotion.isActive || promotion.endDate <= new Date()) {
      res.status(400).json({ message: 'Cannot add urgent badge to expired promotion' });
      return;
    }

    // Check if already has urgent badge
    if (promotion.hasUrgentBadge) {
      res.status(400).json({ message: 'Promotion already has urgent badge' });
      return;
    }

    // Create checkout for urgent badge payment
    const urgentPrice = URGENT_MODIFIER.price;

    // If price is 0, add badge directly
    if (urgentPrice === 0) {
      promotion.hasUrgentBadge = true;
      await promotion.save();

      // Update property
      const property = await Property.findById(promotion.propertyId);
      if (property) {
        property.hasUrgentBadge = true;
        await property.save();
      }

      res.status(200).json({
        success: true,
        isFree: true,
        message: 'Urgent badge added successfully',
        promotion,
      });
      return;
    }

    // Create checkout for urgent badge
    // Get the property to include in the payment
    const property = await Property.findById(promotion.propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const result = await paymentProviderFactory.createPromotionPayment({
      userId,
      userEmail: user.email ?? '',
      userName: user.name,
      propertyId: String(property._id),
      propertyTitle: property.title ?? '',
      promotionTier: promotion.promotionTier as 'featured' | 'highlight' | 'premium',
      duration: 0, // Urgent badge is not duration-based
      hasUrgentBadge: true,
      amount: urgentPrice,
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to create checkout session',
        code: 'CHECKOUT_FAILED',
      });
      return;
    }

    res.status(200).json({
      success: true,
      isFree: false,
      url: result.paymentUrl,
      sessionId: result.sessionId,
      provider: result.provider,
      price: urgentPrice,
    });
  } catch (error: any) {
    promotionLogger.error('Add urgent badge error:', error);
    res.status(500).json({ message: 'Error adding urgent badge' });
  }
};

/**
 * @desc    Confirm urgent badge payment
 * @route   POST /api/promotions/confirm-urgent
 * @access  Public (webhook or redirect)
 */
export const confirmUrgentBadgePayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { promotionId } = req.body;

    if (!promotionId) {
      res.status(400).json({ message: 'Promotion ID is required' });
      return;
    }

    // Find promotion
    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Return current status (urgent badge is added via webhook)
    res.status(200).json({
      success: true,
      hasUrgentBadge: promotion.hasUrgentBadge,
      message: promotion.hasUrgentBadge ? 'Urgent badge is active' : 'Urgent badge pending',
      promotion,
    });
  } catch (error: any) {
    promotionLogger.error('Confirm urgent badge payment error:', error);
    res.status(500).json({ message: 'Error confirming urgent badge' });
  }
};

/**
 * @desc    Get promotion history for a property
 * @route   GET /api/promotions/property/:propertyId/history
 * @access  Private (Owner only)
 */
export const getPromotionHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const propertyId = getObjectIdParam(req, res, 'propertyId');
    if (!propertyId) return;
    const userId = String((req.user as IUser)._id);

    // Verify property ownership
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to view this property\'s history' });
      return;
    }

    // Get all promotions for this property (active and inactive)
    const promotions = await Promotion.find({ propertyId })
      .sort({ createdAt: -1 });

    // Enrich with tier info and status
    const history = promotions.map(promo => {
      const isExpired = promo.endDate <= new Date();
      const daysRemaining = isExpired
        ? 0
        : Math.ceil((promo.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      return {
        _id: promo._id,
        tier: promo.promotionTier,
        tierInfo: PROMOTION_TIERS[promo.promotionTier as PromotionTierType],
        startDate: promo.startDate,
        endDate: promo.endDate,
        duration: promo.duration,
        hasUrgentBadge: promo.hasUrgentBadge,
        price: promo.price,
        isActive: promo.isActive && !isExpired,
        isExpired,
        daysRemaining,
        paymentStatus: promo.paymentStatus,
        isFromAgencyAllocation: promo.isFromAgencyAllocation,
        autoExtend: promo.autoExtend,
        performance: {
          views: promo.viewsGenerated,
          inquiries: promo.inquiriesGenerated,
          saves: promo.savesGenerated,
        },
        createdAt: promo.createdAt,
      };
    });

    // Calculate totals
    const totals = {
      totalPromotions: history.length,
      totalSpent: promotions.reduce((sum, p) => sum + (p.price || 0), 0),
      totalDaysPromoted: promotions.reduce((sum, p) => sum + (p.duration || 0), 0),
      totalViews: promotions.reduce((sum, p) => sum + (p.viewsGenerated || 0), 0),
      totalInquiries: promotions.reduce((sum, p) => sum + (p.inquiriesGenerated || 0), 0),
    };

    res.status(200).json({
      history,
      totals,
      property: {
        id: property._id,
        title: property.title,
      },
    });
  } catch (error: any) {
    promotionLogger.error('Get promotion history error:', error);
    res.status(500).json({ message: 'Error fetching promotion history' });
  }
};

/**
 * @desc    Update auto-extend settings for a promotion
 * @route   PUT /api/promotions/:id/auto-extend
 * @access  Private (Owner only)
 */
export const updateAutoExtend = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const promotionId = getObjectIdParam(req, res, 'id');
    if (!promotionId) return;
    const userId = String((req.user as IUser)._id);
    const { autoExtend, autoExtendDuration } = req.body;

    // Find promotion
    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Check ownership
    if (promotion.userId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to modify this promotion' });
      return;
    }

    // Check if promotion is still active
    if (!promotion.isActive || promotion.endDate <= new Date()) {
      res.status(400).json({ message: 'Cannot modify settings for expired promotion' });
      return;
    }

    // Update settings
    if (typeof autoExtend === 'boolean') {
      promotion.autoExtend = autoExtend;
    }

    if (autoExtendDuration && [7, 15, 30, 60, 90].includes(autoExtendDuration)) {
      promotion.autoExtendDuration = autoExtendDuration;
    }

    await promotion.save();

    res.status(200).json({
      success: true,
      message: `Auto-extend ${promotion.autoExtend ? 'enabled' : 'disabled'}`,
      promotion: {
        _id: promotion._id,
        autoExtend: promotion.autoExtend,
        autoExtendDuration: promotion.autoExtendDuration,
      },
    });
  } catch (error: any) {
    promotionLogger.error('Update auto-extend error:', error);
    res.status(500).json({ message: 'Error updating auto-extend' });
  }
};

/**
 * @desc    Confirm auto-extend payment
 * @route   POST /api/promotions/confirm-auto-extend
 * @access  Private
 *
 * Note: Auto-extend is processed via webhook.
 * This endpoint is for verification/polling after payment redirect.
 */
export const confirmAutoExtendPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { promotionId } = req.body;

    if (!promotionId) {
      res.status(400).json({ message: 'Promotion ID is required' });
      return;
    }

    // Find promotion
    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Return current status
    res.status(200).json({
      success: true,
      message: promotion.isActive ? 'Promotion is active' : 'Promotion status pending',
      promotion,
      newEndDate: promotion.endDate.toISOString(),
      autoExtendStatus: promotion.autoExtendStatus,
    });
  } catch (error: any) {
    promotionLogger.error('Confirm auto-extend payment error:', error);
    res.status(500).json({ message: 'Error confirming auto-extend' });
  }
};

/**
 * @desc    Get pending auto-extend checkout URL
 * @route   GET /api/promotions/:id/auto-extend-checkout
 * @access  Private (Owner only)
 */
export const getAutoExtendCheckout = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const promotionId = getObjectIdParam(req, res, 'id');
    if (!promotionId) return;
    const userId = String((req.user as IUser)._id);

    // Find promotion
    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Check ownership
    if (promotion.userId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to view this promotion' });
      return;
    }

    // Check if there's a pending auto-extend
    if (promotion.autoExtendStatus !== 'pending' || !promotion.autoExtendCheckoutUrl) {
      res.status(404).json({ message: 'No pending auto-extend found' });
      return;
    }

    res.status(200).json({
      success: true,
      url: promotion.autoExtendCheckoutUrl,
      sessionId: promotion.autoExtendSessionId,
      promotion: {
        _id: promotion._id,
        promotionTier: promotion.promotionTier,
        autoExtendDuration: promotion.autoExtendDuration,
        endDate: promotion.endDate,
      },
    });
  } catch (error: any) {
    promotionLogger.error('Get auto-extend checkout error:', error);
    res.status(500).json({ message: 'Error getting auto-extend checkout' });
  }
};