import express from 'express';
import {
  getNeighborhoodInsights,
  getUsageStats,
  getSavedInsight,
} from '../controllers/neighborhoodInsightsController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/neighborhood-insights - Get insights for a location
router.post('/', getNeighborhoodInsights);

// GET /api/neighborhood-insights/usage - Get current usage statistics
router.get('/usage', getUsageStats);

// GET /api/neighborhood-insights/saved/:listingId - The caller's own saved insight for a listing
router.get('/saved/:listingId', getSavedInsight);

export default router;
