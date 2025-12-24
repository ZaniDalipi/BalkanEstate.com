/**
 * Promotion Controllers
 * Re-exports all promotion-related controllers
 */

// Core operations
export {
  getPromotionTiers,
  getAgencyPromotionAllocation,
  getMyPromotions,
  cancelPromotion,
  getFeaturedProperties,
} from './coreController';

// Checkout and payment
export {
  purchasePromotion,
  createPromotionCheckout,
  confirmPromotionPayment,
} from './checkoutController';

// Extension
export {
  extendPromotion,
  confirmExtensionPayment,
} from './extensionController';

// Urgent badge
export {
  addUrgentBadge,
  confirmUrgentBadgePayment,
} from './urgentController';

// Auto-extend
export {
  updateAutoExtend,
  confirmAutoExtendPayment,
  getAutoExtendCheckout,
} from './autoExtendController';

// Stats and history
export {
  getPromotionStats,
  getPromotionHistory,
} from './statsController';
