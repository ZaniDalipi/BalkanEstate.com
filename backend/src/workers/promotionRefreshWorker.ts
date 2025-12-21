/**
 * Promotion Refresh Worker
 *
 * This worker runs periodically to:
 * 1. Auto-refresh Highlight tier promotions (every 3 days)
 * 2. Deactivate expired promotions
 * 3. Update property promotion status
 *
 * Highlight tier promotions are automatically "refreshed" to the top
 * every 3 days, giving them continued visibility throughout their duration.
 */

import Promotion from '../models/Promotion';
import Property from '../models/Property';

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
 * Deactivate expired promotions and update property status
 */
export const deactivateExpiredPromotions = async (): Promise<void> => {
  try {
    console.log('[PromotionRefreshWorker] Starting expired promotion cleanup...');

    const now = new Date();

    // Find all active promotions that have expired
    const expiredPromotions = await Promotion.find({
      isActive: true,
      endDate: { $lt: now },
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
  deactivateExpiredPromotions,
};
