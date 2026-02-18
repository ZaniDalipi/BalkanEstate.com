import express from 'express';
import {
  createCoupon,
  validateCoupon,
  getAllCoupons,
  getPublicCoupons,
  getCouponDetails,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController';
import { protect } from '../middleware/auth';
import { couponValidationRateLimiterIP } from '../middleware/rateLimiter';

const router = express.Router();

// Public routes
router.get('/public', getPublicCoupons); // Get public coupons

// Protected routes (rate-limited to prevent code enumeration)
router.post('/validate', couponValidationRateLimiterIP, protect, validateCoupon); // Validate a coupon code

// Admin routes
router.post('/', protect, createCoupon); // Create coupon (admin)
router.get('/', protect, getAllCoupons); // Get all coupons (admin)
router.get('/:id', protect, getCouponDetails); // Get coupon details (admin)
router.put('/:id', protect, updateCoupon); // Update coupon (admin)
router.delete('/:id', protect, deleteCoupon); // Disable coupon (admin)

export default router;
