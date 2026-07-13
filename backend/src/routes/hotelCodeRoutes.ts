import express from 'express';
import {
  generateHotelCodes,
  getHotelCodes,
  validateHotelCode,
  revokeHotelCode,
} from '../controllers/hotelCodeController';
import { protect } from '../middleware/auth';
import { couponValidationRateLimiterIP } from '../middleware/rateLimiter';

const router = express.Router();

// Public (rate-limited) — validate a code without redeeming it.
router.post('/validate', couponValidationRateLimiterIP, validateHotelCode);

// Admin (role checked inside controllers).
router.post('/generate', protect, generateHotelCodes);
router.get('/', protect, getHotelCodes);
router.delete('/:id', protect, revokeHotelCode);

export default router;
