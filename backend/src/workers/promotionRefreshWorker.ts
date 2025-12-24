/**
 * Promotion Refresh Worker
 *
 * This file re-exports from the modular promotion workers for backwards compatibility.
 * @see ./promotion/index.ts for the modular implementation
 */

export {
  refreshHighlightPromotions,
  processAutoExtends,
  deactivateExpiredPromotions,
  runPromotionMaintenance,
  startPromotionRefreshWorker,
} from './promotion';

export { default } from './promotion';
