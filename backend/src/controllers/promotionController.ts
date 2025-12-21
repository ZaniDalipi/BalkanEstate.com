import { Request, Response } from 'express';
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
    console.error('Get promotion tiers error:', error);
    res.status(500).json({ message: 'Error fetching promotion tiers', error: error.message });
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
    console.error('Get agency allocation error:', error);
    res.status(500).json({ message: 'Error fetching agency allocation', error: error.message });
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
      paymentStatus: isFromAgencyAllocation ? 'paid' : 'pending', // In real app, integrate with payment gateway
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
    });
  } catch (error: any) {
    console.error('Purchase promotion error:', error);
    res.status(500).json({ message: 'Error creating promotion', error: error.message });
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
      .populate('propertyId')
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
    console.error('Get promotions error:', error);
    res.status(500).json({ message: 'Error fetching promotions', error: error.message });
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

    const promotion = await Promotion.findById(req.params.id);

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
    console.error('Cancel promotion error:', error);
    res.status(500).json({ message: 'Error cancelling promotion', error: error.message });
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
          ? { city: new RegExp(city as string, 'i'), status: 'active' }
          : { status: 'active' },
        populate: {
          path: 'sellerId',
          select: 'name email phone avatarUrl role agencyName',
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
    console.error('Get featured properties error:', error);
    res.status(500).json({ message: 'Error fetching featured properties', error: error.message });
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

    const promotion = await Promotion.findById(req.params.id).populate('propertyId');

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
    console.error('Get promotion stats error:', error);
    res.status(500).json({ message: 'Error fetching promotion stats', error: error.message });
  }
};