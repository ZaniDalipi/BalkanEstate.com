/**
 * Promotion Workers
 * Main entry point for all promotion-related worker tasks
 *
 * This module coordinates:
 * 1. Auto-refresh Highlight tier promotions (every 3 days)
 * 2. Process auto-extend for expiring promotions
 * 3. Deactivate expired promotions
 * 4. Update property promotion status
 */

import { refreshHighlightPromotions } from './refreshWorker';
import { processAutoExtends } from './autoExtendWorker';
import { deactivateExpiredPromotions } from './cleanupWorker';
import { cronLogger } from '../../utils/logger';

// Re-export individual workers
export { refreshHighlightPromotions } from './refreshWorker';
export { processAutoExtends } from './autoExtendWorker';
export { deactivateExpiredPromotions } from './cleanupWorker';

/**
 * Run all promotion maintenance tasks
 */
export const runPromotionMaintenance = async (): Promise<void> => {
  cronLogger.info('[PromotionWorker] Starting promotion maintenance...');

  await refreshHighlightPromotions();
  await processAutoExtends();
  await deactivateExpiredPromotions();

  cronLogger.info('[PromotionWorker] Promotion maintenance completed');
};

/**
 * Start the promotion refresh worker
 * Runs every hour to check for promotions that need refresh or cleanup
 */
export const startPromotionRefreshWorker = (): NodeJS.Timeout => {
  cronLogger.info('[PromotionWorker] Starting promotion worker...');

  // Run immediately on start
  runPromotionMaintenance();

  // Then run every hour
  const interval = setInterval(() => {
    runPromotionMaintenance();
  }, 60 * 60 * 1000);

  return interval;
};

export default {
  startPromotionRefreshWorker,
  runPromotionMaintenance,
  refreshHighlightPromotions,
  processAutoExtends,
  deactivateExpiredPromotions,
};
