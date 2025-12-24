/**
 * Highlight Refresh Worker
 * Auto-refreshes Highlight tier promotions every 3 days
 */

import Promotion from '../../models/Promotion';
import Property from '../../models/Property';

/**
 * Refresh Highlight tier promotions that are due for refresh
 */
export const refreshHighlightPromotions = async (): Promise<void> => {
  try {
    console.log('[RefreshWorker] Starting highlight promotion refresh...');

    const promotionsToRefresh = await (Promotion as any).getPromotionsNeedingRefresh();

    if (promotionsToRefresh.length === 0) {
      console.log('[RefreshWorker] No promotions need refresh');
      return;
    }

    console.log(`[RefreshWorker] Found ${promotionsToRefresh.length} promotions to refresh`);

    let refreshedCount = 0;

    for (const promotion of promotionsToRefresh) {
      try {
        promotion.lastRefreshedAt = new Date();

        const nextRefresh = new Date();
        nextRefresh.setDate(nextRefresh.getDate() + 3);

        if (nextRefresh > promotion.endDate) {
          promotion.nextRefreshAt = promotion.endDate;
        } else {
          promotion.nextRefreshAt = nextRefresh;
        }

        promotion.refreshCount = (promotion.refreshCount || 0) + 1;
        await promotion.save();

        const property = await Property.findById(promotion.propertyId);
        if (property && property.isPromoted) {
          property.lastRenewed = new Date();
          await property.save();
        }

        refreshedCount++;
        console.log(
          `[RefreshWorker] Refreshed promotion ${promotion._id} for property ${promotion.propertyId}`
        );
      } catch (error) {
        console.error(
          `[RefreshWorker] Error refreshing promotion ${promotion._id}:`,
          error
        );
      }
    }

    console.log(
      `[RefreshWorker] Successfully refreshed ${refreshedCount}/${promotionsToRefresh.length} promotions`
    );
  } catch (error) {
    console.error('[RefreshWorker] Error in refresh worker:', error);
  }
};
