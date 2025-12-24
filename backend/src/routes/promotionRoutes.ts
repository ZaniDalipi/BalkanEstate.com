import express from 'express';
import {
  getPromotionTiers,
  getAgencyPromotionAllocation,
  purchasePromotion,
  getMyPromotions,
  cancelPromotion,
  getFeaturedProperties,
  getPromotionStats,
  createPromotionCheckout,
  confirmPromotionPayment,
  extendPromotion,
  confirmExtensionPayment,
  addUrgentBadge,
  confirmUrgentBadgePayment,
  getPromotionHistory,
  updateAutoExtend,
} from '../controllers/promotionController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/tiers', getPromotionTiers); // Get all promotion tiers and pricing
router.get('/featured', getFeaturedProperties); // Get all featured properties

// Protected routes
router.post('/', protect, purchasePromotion); // Purchase a promotion (legacy/free allocations)
router.post('/checkout', protect, createPromotionCheckout); // Create Stripe checkout session
router.post('/confirm-payment', protect, confirmPromotionPayment); // Confirm payment and activate promotion
router.post('/confirm-extension', protect, confirmExtensionPayment); // Confirm extension payment
router.post('/confirm-urgent', protect, confirmUrgentBadgePayment); // Confirm urgent badge payment
router.get('/', protect, getMyPromotions); // Get user's promotions
router.delete('/:id', protect, cancelPromotion); // Cancel a promotion
router.get('/:id/stats', protect, getPromotionStats); // Get promotion statistics
router.post('/:id/extend', protect, extendPromotion); // Extend an existing promotion
router.post('/:id/add-urgent', protect, addUrgentBadge); // Add urgent badge to existing promotion
router.put('/:id/auto-extend', protect, updateAutoExtend); // Update auto-extend settings
router.get('/agency/allocation', protect, getAgencyPromotionAllocation); // Get agency allocation
router.get('/property/:propertyId/history', protect, getPromotionHistory); // Get promotion history for a property

export default router;
