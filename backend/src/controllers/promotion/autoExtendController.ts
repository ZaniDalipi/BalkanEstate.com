/**
 * Auto-Extend Controller
 * Handles auto-extend settings and payment confirmation
 */

import { Request, Response } from 'express';
import Promotion from '../../models/Promotion';
import Property from '../../models/Property';
import { IUser } from '../../models/User';
import {
  verifyPromotionOwnership,
  isPromotionActive,
  isValidDuration,
} from '../../services/promotion/promotionService';
import { promotionLogger } from '../../utils/logger';

/**
 * @desc    Update auto-extend settings
 * @route   PUT /api/promotions/:id/auto-extend
 * @access  Private
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

    const promotionId = req.params.id;
    const userId = String((req.user as IUser)._id);
    const { autoExtend, autoExtendDuration } = req.body;

    const { promotion, error } = await verifyPromotionOwnership(promotionId, userId);
    if (error || !promotion) {
      res.status(promotion ? 403 : 404).json({ message: error });
      return;
    }

    if (!isPromotionActive(promotion)) {
      res.status(400).json({ message: 'Cannot modify settings for expired promotion' });
      return;
    }

    if (typeof autoExtend === 'boolean') {
      promotion.autoExtend = autoExtend;
    }

    if (autoExtendDuration && isValidDuration(autoExtendDuration)) {
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
    res.status(500).json({ message: 'Error updating auto-extend', error: error.message });
  }
};

/**
 * @desc    Confirm auto-extend payment
 * @route   POST /api/promotions/confirm-auto-extend
 * @access  Private
 */
export const confirmAutoExtendPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ message: 'Session ID is required' });
      return;
    }

    // TODO: Integrate with payment provider to verify session
    // Payment verification not yet configured
    res.status(503).json({
      success: false,
      message: 'Payment confirmation is not yet configured. Please contact support.',
      code: 'PAYMENT_NOT_CONFIGURED',
    });
    return;

    const { type, promotionId, duration } = {} as any;

    if (type !== 'auto-extend' || !promotionId || !duration) {
      res.status(400).json({ message: 'Invalid session metadata' });
      return;
    }

    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Check if already processed
    if (promotion.autoExtendStatus === 'completed' && promotion.autoExtendSessionId === sessionId) {
      res.status(200).json({
        success: true,
        message: 'Auto-extend already processed',
        promotion,
      });
      return;
    }

    const currentEndDate = new Date(promotion.endDate);
    const baseDate = currentEndDate > new Date() ? currentEndDate : new Date();
    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + parseInt(duration));

    promotion.endDate = newEndDate;
    promotion.duration = promotion.duration + parseInt(duration);
    promotion.isActive = true;
    promotion.autoExtendStatus = 'completed';
    promotion.notes = (promotion.notes || '') + ` | Auto-extended: +${duration} days (${sessionId})`;
    await promotion.save();

    const property = await Property.findById(promotion.propertyId);
    if (property) {
      property.promotionEndDate = newEndDate;
      property.isPromoted = true;
      await property.save();
    }

    res.status(200).json({
      success: true,
      message: 'Promotion auto-extended successfully',
      promotion,
      newEndDate: newEndDate.toISOString(),
    });
  } catch (error: any) {
    promotionLogger.error('Confirm auto-extend payment error:', error);
    res.status(500).json({ message: 'Error confirming auto-extend', error: error.message });
  }
};

/**
 * @desc    Get pending auto-extend checkout URL
 * @route   GET /api/promotions/:id/auto-extend-checkout
 * @access  Private
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

    const promotionId = req.params.id;
    const userId = String((req.user as IUser)._id);

    const { promotion, error } = await verifyPromotionOwnership(promotionId, userId);
    if (error || !promotion) {
      res.status(promotion ? 403 : 404).json({ message: error });
      return;
    }

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
    res.status(500).json({ message: 'Error getting auto-extend checkout', error: error.message });
  }
};
