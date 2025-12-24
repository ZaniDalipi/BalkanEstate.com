/**
 * Promotion Routes
 * All routes for promotion-related operations
 */

import express from 'express';
import {
  // Core
  getPromotionTiers,
  getAgencyPromotionAllocation,
  getMyPromotions,
  cancelPromotion,
  getFeaturedProperties,
  // Checkout
  purchasePromotion,
  createPromotionCheckout,
  confirmPromotionPayment,
  // Extension
  extendPromotion,
  confirmExtensionPayment,
  // Urgent
  addUrgentBadge,
  confirmUrgentBadgePayment,
  // Auto-extend
  updateAutoExtend,
  confirmAutoExtendPayment,
  getAutoExtendCheckout,
  // Stats
  getPromotionStats,
  getPromotionHistory,
} from '../controllers/promotion';
import { protect } from '../middleware/auth';

const router = express.Router();

// ============ Public Routes ============
router.get('/tiers', getPromotionTiers);
router.get('/featured', getFeaturedProperties);

// ============ Protected Routes ============

// --- Core Operations ---
router.get('/', protect, getMyPromotions);
router.delete('/:id', protect, cancelPromotion);

// --- Checkout & Payment ---
router.post('/', protect, purchasePromotion);
router.post('/checkout', protect, createPromotionCheckout);
router.post('/confirm-payment', protect, confirmPromotionPayment);

// --- Extension ---
router.post('/:id/extend', protect, extendPromotion);
router.post('/confirm-extension', protect, confirmExtensionPayment);

// --- Urgent Badge ---
router.post('/:id/add-urgent', protect, addUrgentBadge);
router.post('/confirm-urgent', protect, confirmUrgentBadgePayment);

// --- Auto-Extend ---
router.put('/:id/auto-extend', protect, updateAutoExtend);
router.post('/confirm-auto-extend', protect, confirmAutoExtendPayment);
router.get('/:id/auto-extend-checkout', protect, getAutoExtendCheckout);

// --- Stats & History ---
router.get('/:id/stats', protect, getPromotionStats);
router.get('/property/:propertyId/history', protect, getPromotionHistory);

// --- Agency ---
router.get('/agency/allocation', protect, getAgencyPromotionAllocation);

export default router;
