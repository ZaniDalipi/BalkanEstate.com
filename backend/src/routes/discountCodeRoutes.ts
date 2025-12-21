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

const router = express.Router();

// Public routes
router.post('/validate', validateDiscountCode);

// Protected routes (authentication required)
router.post('/redeem', protect, redeemDiscountCode);

// Admin routes (authentication required)
router.post('/', protect, createDiscountCode);
router.post('/generate', protect, generateDiscountCodes);
router.get('/', protect, getAllDiscountCodes);
router.patch('/:id/deactivate', protect, deactivateDiscountCode);
router.delete('/:id', protect, deleteDiscountCode);

export default router;
