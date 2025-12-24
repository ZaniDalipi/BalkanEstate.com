/**
 * Auto-Extend Worker
 * Processes auto-extend for promotions expiring within 24 hours
 * Creates Stripe checkout sessions for users to complete payment
 */

import Stripe from 'stripe';
import Promotion from '../../models/Promotion';
import User from '../../models/User';
import {
  PROMOTION_TIERS,
  getPromotionPrice,
  PromotionTierType,
} from '../../config/promotionTiers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

/**
 * Process a single promotion for auto-extend
 */
const processPromotion = async (promotion: any, property: any): Promise<boolean> => {
  const user = await User.findById(promotion.userId);
  if (!user) {
    console.log(`[AutoExtendWorker] User not found for promotion ${promotion._id}`);
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

    console.log(`[AutoExtendWorker] Auto-extended promotion ${promotion._id} for free`);
    return true;
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

  console.log(
    `[AutoExtendWorker] Created auto-extend checkout for promotion ${promotion._id}, session: ${session.id}`
  );

  return true;
};

/**
 * Process auto-extend for promotions expiring within 24 hours
 */
export const processAutoExtends = async (): Promise<void> => {
  try {
    console.log('[AutoExtendWorker] Processing auto-extend promotions...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const promotionsToAutoExtend = await Promotion.find({
      isActive: true,
      autoExtend: true,
      autoExtendStatus: { $in: ['none', 'failed'] },
      autoExtendAttempts: { $lt: 3 },
      endDate: { $gt: now, $lte: in24Hours },
    }).populate('propertyId');

    if (promotionsToAutoExtend.length === 0) {
      console.log('[AutoExtendWorker] No promotions need auto-extend');
      return;
    }

    console.log(`[AutoExtendWorker] Found ${promotionsToAutoExtend.length} promotions to auto-extend`);

    let processedCount = 0;

    for (const promotion of promotionsToAutoExtend) {
      try {
        const property = promotion.propertyId as any;
        if (!property) {
          console.log(`[AutoExtendWorker] Property not found for promotion ${promotion._id}`);
          continue;
        }

        const success = await processPromotion(promotion, property);
        if (success) {
          processedCount++;
        }
      } catch (error) {
        console.error(
          `[AutoExtendWorker] Error processing auto-extend for promotion ${promotion._id}:`,
          error
        );

        promotion.autoExtendStatus = 'failed';
        promotion.autoExtendAttempts = (promotion.autoExtendAttempts || 0) + 1;
        promotion.lastAutoExtendAttempt = new Date();
        await promotion.save();
      }
    }

    console.log(
      `[AutoExtendWorker] Processed ${processedCount}/${promotionsToAutoExtend.length} auto-extend promotions`
    );
  } catch (error) {
    console.error('[AutoExtendWorker] Error in auto-extend processing:', error);
  }
};
