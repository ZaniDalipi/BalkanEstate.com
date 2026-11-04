import express from 'express';
import rateLimit from 'express-rate-limit';
import { getTravelRoute } from '../controllers/routingController';

const router = express.Router();

/** Per visitor IP: plenty for switching travel modes, not enough to use us as a free router. */
const routingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: false,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
  message: { message: 'Too many route requests. Please try again in a few minutes.' },
  validate: { xForwardedForHeader: false },
});

// Public: visitors need not sign in to see how far a business is.
router.get('/route', routingRateLimiter, getTravelRoute);

export default router;
