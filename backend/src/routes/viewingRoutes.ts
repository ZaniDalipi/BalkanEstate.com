import express from 'express';
import rateLimit from 'express-rate-limit';
import { getViewingAvailability, scheduleViewing, getSellerViewings, updateViewingStatus } from '../controllers/viewingController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Rate limit viewing requests (10 per hour per IP)
const viewingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many viewing requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Get available viewing slots for a property (public)
router.get('/availability/:propertyId', getViewingAvailability);

// Schedule a viewing (public, rate limited)
router.post('/', viewingRateLimiter, scheduleViewing);

// Get all viewings for the authenticated seller (private)
router.get('/seller', protect, getSellerViewings);

// Update viewing status - approve/reject/complete (private)
router.patch('/:viewingId/status', protect, updateViewingStatus);

export default router;
