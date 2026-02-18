import express from 'express';
import {
  createDiscountCode,
  generateDiscountCodes,
  validateDiscountCode,
  redeemDiscountCode,
  getAllDiscountCodes,
  deactivateDiscountCode,
  deleteDiscountCode,
} from '../controllers/discountCodeController';
import { protect } from '../middleware/auth';
import { couponValidationRateLimiterIP } from '../middleware/rateLimiter';

const router = express.Router();

// Public routes (rate-limited to prevent code enumeration)
router.post('/validate', couponValidationRateLimiterIP, validateDiscountCode);

// Protected routes (authentication required)
router.post('/redeem', protect, redeemDiscountCode);

// Admin routes (authentication required)
router.post('/', protect, createDiscountCode);
router.post('/generate', protect, generateDiscountCodes);
router.get('/', protect, getAllDiscountCodes);
router.patch('/:id/deactivate', protect, deactivateDiscountCode);
router.delete('/:id', protect, deleteDiscountCode);

export default router;
