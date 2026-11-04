import express from 'express';
import rateLimit from 'express-rate-limit';
import { getTravelRoute } from '../controllers/routingController';
import { rateLimitStore } from '../middleware/redisRateLimitStore';

const router = express.Router();

/**
 * Per visitor IP: plenty for switching travel modes, not enough to use us as
 * a free router. Counted in Redis when REDIS_URL is set (shared by every
 * instance); if Redis can't be reached the request goes through rather than
 * failing — directions are not worth an outage.
 */
const routingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  store: rateLimitStore('routing'),
  passOnStoreError: true,
  standardHeaders: false,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
  message: { message: 'Too many route requests. Please try again in a few minutes.' },
  validate: { xForwardedForHeader: false },
});

// Public: visitors need not sign in to see how far a business is.
router.get('/route', routingRateLimiter, getTravelRoute);

export default router;
