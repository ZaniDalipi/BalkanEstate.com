/**
 * Cleanup Worker
 * Deactivates expired promotions and updates property status
 */

import Promotion from '../../models/Promotion';
import Property from '../../models/Property';

/**
 * Deactivate expired promotions and update property status
 */
export const deactivateExpiredPromotions = async (): Promise<void> => {
  try {
    console.log('[CleanupWorker] Starting expired promotion cleanup...');

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
      console.log('[CleanupWorker] No expired promotions found');
      return;
    }

    console.log(`[CleanupWorker] Found ${expiredPromotions.length} expired promotions`);

    let deactivatedCount = 0;

    for (const promotion of expiredPromotions) {
      try {
        promotion.isActive = false;
        await promotion.save();

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
          `[CleanupWorker] Deactivated expired promotion ${promotion._id} for property ${promotion.propertyId}`
        );
      } catch (error) {
        console.error(
          `[CleanupWorker] Error deactivating promotion ${promotion._id}:`,
          error
        );
      }
    }

    console.log(
      `[CleanupWorker] Successfully deactivated ${deactivatedCount}/${expiredPromotions.length} promotions`
    );
  } catch (error) {
    console.error('[CleanupWorker] Error in cleanup worker:', error);
  }
};
