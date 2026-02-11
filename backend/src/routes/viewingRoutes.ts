import express from 'express';
import rateLimit from 'express-rate-limit';
import { getViewingAvailability, scheduleViewing } from '../controllers/viewingController';

const router = express.Router();

// Rate limit viewing requests (20 per hour per IP)
const viewingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { message: 'You\'ve scheduled several viewings. Please wait a bit before requesting more.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Get available viewing slots for a property (public)
router.get('/availability/:propertyId', getViewingAvailability);

// Schedule a viewing (public, rate limited)
router.post('/', viewingRateLimiter, scheduleViewing);

export default router;
