/**
 * Urgent Badge Controller
 * Handles adding urgent badge to existing promotions
 */

import { Request, Response } from 'express';
import Property from '../../models/Property';
import { IUser } from '../../models/User';
import {
  URGENT_MODIFIER,
  verifyPromotionOwnership,
  isPromotionActive,
} from '../../services/promotion/promotionService';
import { promotionLogger } from '../../utils/logger';
import { getObjectIdParam } from '../../utils/validateParams';

/**
 * @desc    Add urgent badge to existing promotion
 * @route   POST /api/promotions/:id/add-urgent
 * @access  Private
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

    const { promotion, error } = await verifyPromotionOwnership(promotionId, userId);
    if (error || !promotion) {
      res.status(promotion ? 403 : 404).json({ message: error });
      return;
    }

    if (!isPromotionActive(promotion)) {
      res.status(400).json({ message: 'Cannot add urgent badge to expired promotion' });
      return;
    }

    if (promotion.hasUrgentBadge) {
      res.status(400).json({ message: 'Promotion already has urgent badge' });
      return;
    }

    const urgentPrice = URGENT_MODIFIER.price;

    // If free, add directly
    if (urgentPrice === 0) {
      promotion.hasUrgentBadge = true;
      await promotion.save();

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

    // Payment provider not yet configured
    // TODO: Integrate with new payment provider when selected
    res.status(503).json({
      success: false,
      message: 'Payment processing is not yet configured. Please contact support.',
      code: 'PAYMENT_NOT_CONFIGURED',
      price: urgentPrice,
    });
  } catch (error: any) {
    promotionLogger.error('Add urgent badge error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding urgent badge'
    });
  }
};

/**
 * @desc    Confirm urgent badge payment
 * @route   POST /api/promotions/confirm-urgent
 * @access  Private
 */
export const confirmUrgentBadgePayment = async (
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
    res.status(503).json({
      success: false,
      message: 'Payment confirmation is not yet configured. Please contact support.',
      code: 'PAYMENT_NOT_CONFIGURED',
    });
  } catch (error: any) {
    promotionLogger.error('Confirm urgent badge payment error:', error);
    res.status(500).json({ message: 'Error confirming urgent badge' });
  }
};
