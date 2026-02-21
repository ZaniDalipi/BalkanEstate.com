/**
 * Promotion Stats & History Controller
 * Handles promotion statistics and history queries
 */

import { Request, Response } from 'express';
import Promotion from '../../models/Promotion';
import Property from '../../models/Property';
import { IUser } from '../../models/User';
import {
  PROMOTION_TIERS,
  PromotionTierType,
} from '../../services/promotion/promotionService';
import { promotionLogger } from '../../utils/logger';
import { getObjectIdParam } from '../../utils/validateParams';

/**
 * @desc    Get promotion statistics
 * @route   GET /api/promotions/:id/stats
 * @access  Private
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

    const userId = String((req.user as IUser)._id);
    const promotionId = getObjectIdParam(req, res, 'id');
    if (!promotionId) return;
    const promotion = await Promotion.findById(promotionId).populate('propertyId', 'title images price city country address propertyType status sellerId views saves inquiries');

    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    if (promotion.userId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to view this promotion' });
      return;
    }

    const property = promotion.propertyId as any;

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
 * @desc    Get promotion history for a property
 * @route   GET /api/promotions/property/:propertyId/history
 * @access  Private
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

    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== userId) {
      res.status(403).json({ message: "Not authorized to view this property's history" });
      return;
    }

    const promotions = await Promotion.find({ propertyId }).sort({ createdAt: -1 });

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
