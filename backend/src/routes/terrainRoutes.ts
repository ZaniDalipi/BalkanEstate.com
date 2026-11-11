import express from 'express';
import rateLimit from 'express-rate-limit';
import { getTerrainElevationGrid } from '../controllers/terrainController';
import { rateLimitStore } from '../middleware/redisRateLimitStore';

const router = express.Router();

/**
 * Per visitor IP: plenty for drawing and redrawing areas, not enough to use
 * us as a free elevation service. Counted in Redis when REDIS_URL is set; if
 * Redis can't be reached the request goes through.
 */
const terrainRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  store: rateLimitStore('terrain'),
  passOnStoreError: true,
  standardHeaders: false,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
  message: { message: 'Too many terrain requests. Please try again in a few minutes.' },
  validate: { xForwardedForHeader: false },
});

// Public: anyone browsing the map can check how steep a piece of land is.
router.get('/elevation-grid', terrainRateLimiter, getTerrainElevationGrid);

export default router;
