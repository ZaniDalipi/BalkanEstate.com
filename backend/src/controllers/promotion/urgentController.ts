/**
 * Urgent Badge Controller
 * Handles adding urgent badge to existing promotions
 */

import { Request, Response } from 'express';
import Promotion from '../../models/Promotion';
import Property from '../../models/Property';
import { IUser } from '../../models/User';
import {
  stripe,
  URGENT_MODIFIER,
  verifyPromotionOwnership,
  isPromotionActive,
  getBaseUrl,
} from '../../services/promotion/promotionService';

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

    const promotionId = req.params.id;
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

    // Create Stripe checkout
    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Urgent Badge',
              description: `Add urgent badge to your ${promotion.promotionTier} promotion`,
            },
            unit_amount: Math.round(urgentPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'add_urgent_badge',
        promotionId: String(promotion._id),
        userId,
      },
      success_url: `${baseUrl}/settings?tab=promotions&urgent_added=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings?tab=promotions&urgent_cancelled=true`,
    });

    res.status(200).json({
      success: true,
      isFree: false,
      url: session.url,
      sessionId: session.id,
      price: urgentPrice,
    });
  } catch (error: any) {
    console.error('Add urgent badge error:', error);
    res.status(500).json({ message: 'Error adding urgent badge', error: error.message });
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

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      res.status(400).json({ message: 'Payment not completed' });
      return;
    }

    const { promotionId, type } = session.metadata || {};

    if (type !== 'add_urgent_badge' || !promotionId) {
      res.status(400).json({ message: 'Invalid session metadata' });
      return;
    }

    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      res.status(404).json({ message: 'Promotion not found' });
      return;
    }

    // Check if already processed
    if (promotion.hasUrgentBadge) {
      res.status(200).json({
        success: true,
        message: 'Urgent badge already added',
        promotion,
      });
      return;
    }

    promotion.hasUrgentBadge = true;
    promotion.notes = (promotion.notes || '') + ` | Urgent badge added (${sessionId})`;
    await promotion.save();

    const property = await Property.findById(promotion.propertyId);
    if (property) {
      property.hasUrgentBadge = true;
      await property.save();
    }

    res.status(200).json({
      success: true,
      message: 'Urgent badge added successfully',
      promotion,
    });
  } catch (error: any) {
    console.error('Confirm urgent badge payment error:', error);
    res.status(500).json({ message: 'Error confirming urgent badge', error: error.message });
  }
};
