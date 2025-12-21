import express from 'express';
import {
  getPromotionTiers,
  getAgencyPromotionAllocation,
  purchasePromotion,
  getMyPromotions,
  cancelPromotion,
  getFeaturedProperties,
  getPromotionStats,
} from '../controllers/promotionController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/tiers', getPromotionTiers); // Get all promotion tiers and pricing
router.get('/featured', getFeaturedProperties); // Get all featured properties

// Protected routes
router.post('/', protect, purchasePromotion); // Purchase a promotion
router.get('/', protect, getMyPromotions); // Get user's promotions
router.delete('/:id', protect, cancelPromotion); // Cancel a promotion
router.get('/:id/stats', protect, getPromotionStats); // Get promotion statistics
router.get('/agency/allocation', protect, getAgencyPromotionAllocation); // Get agency allocation

export default router;
