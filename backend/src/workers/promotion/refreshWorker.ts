/**
 * Highlight Refresh Worker
 * Auto-refreshes Highlight tier promotions every 3 days
 */

import Promotion from '../../models/Promotion';
import Property from '../../models/Property';
import { cronLogger } from '../../utils/logger';

/**
 * Refresh Highlight tier promotions that are due for refresh
 */
export const refreshHighlightPromotions = async (): Promise<void> => {
  try {
    cronLogger.info('[RefreshWorker] Starting highlight promotion refresh...');

    const promotionsToRefresh = await (Promotion as any).getPromotionsNeedingRefresh();

    if (promotionsToRefresh.length === 0) {
      cronLogger.info('[RefreshWorker] No promotions need refresh');
      return;
    }

    cronLogger.info(`[RefreshWorker] Found ${promotionsToRefresh.length} promotions to refresh`);

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
        cronLogger.info(
          `[RefreshWorker] Refreshed promotion ${promotion._id} for property ${promotion.propertyId}`
        );
      } catch (error) {
        cronLogger.error(
          `[RefreshWorker] Error refreshing promotion ${promotion._id}:`,
          error
        );
      }
    }

    cronLogger.info(
      `[RefreshWorker] Successfully refreshed ${refreshedCount}/${promotionsToRefresh.length} promotions`
    );
  } catch (error) {
    cronLogger.error('[RefreshWorker] Error in refresh worker:', error);
  }
};
