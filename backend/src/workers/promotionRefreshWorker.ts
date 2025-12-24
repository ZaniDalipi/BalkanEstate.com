/**
 * Promotion Refresh Worker
 *
 * This worker runs periodically to:
 * 1. Auto-refresh Highlight tier promotions (every 3 days)
 * 2. Process auto-extend for expiring promotions
 * 3. Deactivate expired promotions
 * 4. Update property promotion status
 *
 * Highlight tier promotions are automatically "refreshed" to the top
 * every 3 days, giving them continued visibility throughout their duration.
 */

import Stripe from 'stripe';
import Promotion from '../models/Promotion';
import Property from '../models/Property';
import User from '../models/User';
import {
  PROMOTION_TIERS,
  getPromotionPrice,
  PromotionTierType,
} from '../config/promotionTiers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-10-29.clover',
});

/**
 * Refresh Highlight tier promotions that are due for refresh
 */
export const refreshHighlightPromotions = async (): Promise<void> => {
  try {
    console.log('[PromotionRefreshWorker] Starting highlight promotion refresh...');

    // Find all highlight promotions that need refresh
    const promotionsToRefresh = await (Promotion as any).getPromotionsNeedingRefresh();

    if (promotionsToRefresh.length === 0) {
      console.log('[PromotionRefreshWorker] No promotions need refresh');
      return;
    }

    console.log(`[PromotionRefreshWorker] Found ${promotionsToRefresh.length} promotions to refresh`);

    let refreshedCount = 0;

    for (const promotion of promotionsToRefresh) {
      try {
        // Update last refresh and calculate next refresh date
        promotion.lastRefreshedAt = new Date();

        const nextRefresh = new Date();
        nextRefresh.setDate(nextRefresh.getDate() + 3); // Refresh every 3 days

        // Don't schedule refresh past the promotion end date
        if (nextRefresh > promotion.endDate) {
          promotion.nextRefreshAt = promotion.endDate;
        } else {
          promotion.nextRefreshAt = nextRefresh;
        }

        promotion.refreshCount = (promotion.refreshCount || 0) + 1;
        await promotion.save();

        // Update property's lastRenewed to push it to top in search results
        const property = await Property.findById(promotion.propertyId);
        if (property && property.isPromoted) {
          property.lastRenewed = new Date();
          await property.save();
        }

        refreshedCount++;
        console.log(
          `[PromotionRefreshWorker] Refreshed promotion ${promotion._id} for property ${promotion.propertyId}`
        );
      } catch (error) {
        console.error(
          `[PromotionRefreshWorker] Error refreshing promotion ${promotion._id}:`,
          error
        );
      }
    }

    console.log(
      `[PromotionRefreshWorker] Successfully refreshed ${refreshedCount}/${promotionsToRefresh.length} promotions`
    );
  } catch (error) {
    console.error('[PromotionRefreshWorker] Error in refresh worker:', error);
  }
};

/**
 * Process auto-extend for promotions expiring within 24 hours
 * Creates Stripe checkout sessions for users to complete payment
 */
export const processAutoExtends = async (): Promise<void> => {
  try {
    console.log('[PromotionRefreshWorker] Processing auto-extend promotions...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find promotions expiring within 24 hours that have auto-extend enabled
    // and haven't been processed yet (status is 'none' or failed attempts < 3)
    const promotionsToAutoExtend = await Promotion.find({
      isActive: true,
      autoExtend: true,
      autoExtendStatus: { $in: ['none', 'failed'] },
      autoExtendAttempts: { $lt: 3 },
      endDate: { $gt: now, $lte: in24Hours },
    }).populate('propertyId');

    if (promotionsToAutoExtend.length === 0) {
      console.log('[PromotionRefreshWorker] No promotions need auto-extend');
      return;
    }

    console.log(`[PromotionRefreshWorker] Found ${promotionsToAutoExtend.length} promotions to auto-extend`);

    let processedCount = 0;

    for (const promotion of promotionsToAutoExtend) {
      try {
        const property = promotion.propertyId as any;
        if (!property) {
          console.log(`[PromotionRefreshWorker] Property not found for promotion ${promotion._id}`);
          continue;
        }

        // Get user
        const user = await User.findById(promotion.userId);
        if (!user) {
          console.log(`[PromotionRefreshWorker] User not found for promotion ${promotion._id}`);
          continue;
        }

        // Calculate extension price
        const promotionTier = promotion.promotionTier as PromotionTierType;
        const duration = promotion.autoExtendDuration || 30;
        const extensionPrice = getPromotionPrice(promotionTier, duration as any, false);

        if (extensionPrice <= 0) {
          // Free extension - process directly
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

          // Update property
          property.promotionEndDate = newEndDate;
          await property.save();

          console.log(`[PromotionRefreshWorker] Auto-extended promotion ${promotion._id} for free`);
          processedCount++;
          continue;
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
          expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Expires in 24 hours
          metadata: {
            type: 'auto-extend',
            userId: String(user._id),
            promotionId: String(promotion._id),
            propertyId: String(property._id),
            duration: String(duration),
            promotionTier: promotionTier,
          },
        });

        // Update promotion with checkout session info
        promotion.autoExtendStatus = 'pending';
        promotion.autoExtendSessionId = session.id;
        promotion.autoExtendCheckoutUrl = session.url || '';
        promotion.autoExtendAttempts = (promotion.autoExtendAttempts || 0) + 1;
        promotion.lastAutoExtendAttempt = new Date();
        await promotion.save();

        console.log(
          `[PromotionRefreshWorker] Created auto-extend checkout for promotion ${promotion._id}, session: ${session.id}`
        );
        processedCount++;

        // TODO: Send email notification to user about pending auto-extend
        // await sendAutoExtendNotification(user.email, property.title, session.url, extensionPrice);

      } catch (error) {
        console.error(
          `[PromotionRefreshWorker] Error processing auto-extend for promotion ${promotion._id}:`,
          error
        );

        // Mark as failed
        promotion.autoExtendStatus = 'failed';
        promotion.autoExtendAttempts = (promotion.autoExtendAttempts || 0) + 1;
        promotion.lastAutoExtendAttempt = new Date();
        await promotion.save();
      }
    }

    console.log(
      `[PromotionRefreshWorker] Processed ${processedCount}/${promotionsToAutoExtend.length} auto-extend promotions`
    );
  } catch (error) {
    console.error('[PromotionRefreshWorker] Error in auto-extend processing:', error);
  }
};

/**
 * Deactivate expired promotions and update property status
 */
export const deactivateExpiredPromotions = async (): Promise<void> => {
  try {
    console.log('[PromotionRefreshWorker] Starting expired promotion cleanup...');

    const now = new Date();

    // Find all active promotions that have expired
    // Skip promotions with pending auto-extend (give them extra time to complete payment)
    const expiredPromotions = await Promotion.find({
      isActive: true,
      endDate: { $lt: now },
      $or: [
        { autoExtendStatus: { $ne: 'pending' } },
        {
          autoExtendStatus: 'pending',
          // If pending for more than 48 hours past expiry, deactivate anyway
          endDate: { $lt: new Date(now.getTime() - 48 * 60 * 60 * 1000) }
        }
      ]
    });

    if (expiredPromotions.length === 0) {
      console.log('[PromotionRefreshWorker] No expired promotions found');
      return;
    }

    console.log(`[PromotionRefreshWorker] Found ${expiredPromotions.length} expired promotions`);

    let deactivatedCount = 0;

    for (const promotion of expiredPromotions) {
      try {
        // Deactivate promotion
        promotion.isActive = false;
        await promotion.save();

        // Update property
        const property = await Property.findById(promotion.propertyId);
        if (property && property.isPromoted) {
          property.isPromoted = false;
          property.promotionTier = undefined;
          property.hasUrgentBadge = false;
          property.promotionStartDate = undefined;
          property.promotionEndDate = undefined;
          await property.save();
        }

        deactivatedCount++;
        console.log(
          `[PromotionRefreshWorker] Deactivated expired promotion ${promotion._id} for property ${promotion.propertyId}`
        );
      } catch (error) {
        console.error(
          `[PromotionRefreshWorker] Error deactivating promotion ${promotion._id}:`,
          error
        );
      }
    }

    console.log(
      `[PromotionRefreshWorker] Successfully deactivated ${deactivatedCount}/${expiredPromotions.length} promotions`
    );
  } catch (error) {
    console.error('[PromotionRefreshWorker] Error in cleanup worker:', error);
  }
};

/**
 * Run all promotion maintenance tasks
 */
export const runPromotionMaintenance = async (): Promise<void> => {
  console.log('[PromotionRefreshWorker] Starting promotion maintenance...');

  await refreshHighlightPromotions();
  await processAutoExtends();
  await deactivateExpiredPromotions();

  console.log('[PromotionRefreshWorker] Promotion maintenance completed');
};

/**
 * Start the promotion refresh worker
 * Runs every hour to check for promotions that need refresh or cleanup
 */
export const startPromotionRefreshWorker = (): NodeJS.Timeout => {
  console.log('[PromotionRefreshWorker] Starting promotion refresh worker...');

  // Run immediately on start
  runPromotionMaintenance();

  // Then run every hour
  const interval = setInterval(() => {
    runPromotionMaintenance();
  }, 60 * 60 * 1000); // Every hour

  return interval;
};

// Export for manual invocation
export default {
  startPromotionRefreshWorker,
  runPromotionMaintenance,
  refreshHighlightPromotions,
  processAutoExtends,
  deactivateExpiredPromotions,
};
