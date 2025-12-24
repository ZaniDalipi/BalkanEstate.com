/**
 * Core Promotion Controller
 * Handles basic promotion operations: get tiers, list promotions, cancel
 */

import { Request, Response } from 'express';
import Promotion from '../../models/Promotion';
import User, { IUser } from '../../models/User';
import Agency from '../../models/Agency';
import {
  PROMOTION_TIERS,
  PROMOTION_PRICING,
  URGENT_MODIFIER,
  getAgencyAllocation,
  enrichPromotion,
  clearPropertyPromotion,
} from '../../services/promotion/promotionService';

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
export const getAgencyPromotionAllocation = async (
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

    const agency = await Agency.findOne({ ownerId: user._id });

    if (!agency) {
      res.status(404).json({
        message: 'No agency found. Only agency owners can access allocation data.',
        code: 'NO_AGENCY_FOUND',
      });
      return;
    }

    const planAllocation = getAgencyAllocation(agency.subscriptionPlan || 'free');

    if (!planAllocation) {
      res.status(404).json({ message: 'Invalid subscription plan' });
      return;
    }

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

    const enrichedPromotions = promotions.map(enrichPromotion);

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

    if (promotion.userId.toString() !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to cancel this promotion' });
      return;
    }

    promotion.isActive = false;
    await promotion.save();

    await clearPropertyPromotion(promotion.propertyId.toString());

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

    const validPromotions = promotions.filter(p => p.propertyId !== null);

    validPromotions.sort((a, b) => {
      const scoreA = (a as any).getPriorityScore();
      const scoreB = (b as any).getPriorityScore();
      return scoreB - scoreA;
    });

    const enrichedPromotions = validPromotions.map(enrichPromotion);

    res.json({
      promotions: enrichedPromotions,
      total: enrichedPromotions.length,
    });
  } catch (error: any) {
    console.error('Get featured properties error:', error);
    res.status(500).json({ message: 'Error fetching featured properties', error: error.message });
  }
};
