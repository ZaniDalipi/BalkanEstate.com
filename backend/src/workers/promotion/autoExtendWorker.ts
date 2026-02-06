/**
 * Auto-Extend Worker
 * Processes auto-extend for promotions expiring within 24 hours
 * Creates Stripe checkout sessions for users to complete payment
 */

import Stripe from 'stripe';
import Promotion from '../../models/Promotion';
import User from '../../models/User';
import { cronLogger } from '../../utils/logger';
import {
  PROMOTION_TIERS,
  getPromotionPrice,
  PromotionTierType,
} from '../../config/promotionTiers';

// Check if Stripe is properly configured
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const isStripeConfigured = stripeKey && stripeKey.startsWith('sk_') && !stripeKey.includes('placeholder');

const stripe = isStripeConfigured
  ? new Stripe(stripeKey, { apiVersion: '2025-10-29.clover' })
  : null;

/**
 * Process a single promotion for auto-extend
 */
const processPromotion = async (promotion: any, property: any): Promise<boolean> => {
  const user = await User.findById(promotion.userId);
  if (!user) {
    cronLogger.info(`[AutoExtendWorker] User not found for promotion ${promotion._id}`);
    return false;
  }

  const promotionTier = promotion.promotionTier as PromotionTierType;
  const duration = promotion.autoExtendDuration || 30;
  const extensionPrice = getPromotionPrice(promotionTier, duration as any, false);

  // Free extension - process directly
  if (extensionPrice <= 0) {
    const currentEndDate = new Date(promotion.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + duration);

    promotion.endDate = newEndDate;
    promotion.duration = promotion.duration + duration;
    promotion.autoExtendStatus = 'completed';
    promotion.autoExtendAttempts = (promotion.autoExtendAttempts || 0) + 1;
    promotion.lastAutoExtendAttempt = new Date();
    promotion.notes = (promotion.notes || '') + ` | Auto-extended (free) on ${new Date().toISOString()}`;
    await promotion.save();

    property.promotionEndDate = newEndDate;
    await property.save();

    cronLogger.info(`[AutoExtendWorker] Auto-extended promotion ${promotion._id} for free`);
    return true;
  }

  // Skip paid extensions if Stripe is not configured
  if (!stripe) {
    cronLogger.info(`[AutoExtendWorker] Stripe not configured, skipping paid auto-extend for promotion ${promotion._id}`);
    promotion.autoExtendStatus = 'failed';
    promotion.notes = (promotion.notes || '') + ` | Skipped: Payment provider not configured`;
    await promotion.save();
    return false;
  }

  // Create Stripe checkout session for paid extension
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const tierInfo = PROMOTION_TIERS[promotionTier];

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Auto-Extend ${tierInfo.name} Promotion`,
            description: `Automatically extend ${duration} days for "${property.title}"`,
          },
          unit_amount: Math.round(extensionPrice * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${baseUrl}/promotions/auto-extend-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/my-properties?auto_extend_cancelled=true`,
    client_reference_id: String(user._id),
    expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    metadata: {
      type: 'auto-extend',
      userId: String(user._id),
      promotionId: String(promotion._id),
      propertyId: String(property._id),
      duration: String(duration),
      promotionTier: promotionTier,
    },
  });

  promotion.autoExtendStatus = 'pending';
  promotion.autoExtendSessionId = session.id;
  promotion.autoExtendCheckoutUrl = session.url || '';
  promotion.autoExtendAttempts = (promotion.autoExtendAttempts || 0) + 1;
  promotion.lastAutoExtendAttempt = new Date();
  await promotion.save();

  cronLogger.info(
    `[AutoExtendWorker] Created auto-extend checkout for promotion ${promotion._id}, session: ${session.id}`
  );

  return true;
};

/**
 * Process auto-extend for promotions expiring within 24 hours
 */
export const processAutoExtends = async (): Promise<void> => {
  try {
    if (!isStripeConfigured) {
      cronLogger.info('[AutoExtendWorker] Stripe not configured, skipping auto-extend processing');
      return;
    }

    cronLogger.info('[AutoExtendWorker] Processing auto-extend promotions...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const promotionsToAutoExtend = await Promotion.find({
      isActive: true,
      autoExtend: true,
      autoExtendStatus: { $in: ['none', 'failed'] },
      autoExtendAttempts: { $lt: 3 },
      endDate: { $gt: now, $lte: in24Hours },
    }).populate('propertyId', 'title images price city country address propertyType status sellerId');

    if (promotionsToAutoExtend.length === 0) {
      cronLogger.info('[AutoExtendWorker] No promotions need auto-extend');
      return;
    }

    cronLogger.info(`[AutoExtendWorker] Found ${promotionsToAutoExtend.length} promotions to auto-extend`);

    let processedCount = 0;

    for (const promotion of promotionsToAutoExtend) {
      try {
        const property = promotion.propertyId as any;
        if (!property) {
          cronLogger.info(`[AutoExtendWorker] Property not found for promotion ${promotion._id}`);
          continue;
        }

        const success = await processPromotion(promotion, property);
        if (success) {
          processedCount++;
        }
      } catch (error) {
        cronLogger.error(
          `[AutoExtendWorker] Error processing auto-extend for promotion ${promotion._id}:`,
          error
        );

        promotion.autoExtendStatus = 'failed';
        promotion.autoExtendAttempts = (promotion.autoExtendAttempts || 0) + 1;
        promotion.lastAutoExtendAttempt = new Date();
        await promotion.save();
      }
    }

    cronLogger.info(
      `[AutoExtendWorker] Processed ${processedCount}/${promotionsToAutoExtend.length} auto-extend promotions`
    );
  } catch (error) {
    cronLogger.error('[AutoExtendWorker] Error in auto-extend processing:', error);
  }
};
