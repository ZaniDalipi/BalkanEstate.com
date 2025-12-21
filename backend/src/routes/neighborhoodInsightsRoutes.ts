import express from 'express';
import {
  getNeighborhoodInsights,
  getUsageStats,
} from '../controllers/neighborhoodInsightsController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/neighborhood-insights - Get insights for a location
router.post('/', getNeighborhoodInsights);

// GET /api/neighborhood-insights/usage - Get current usage statistics
router.get('/usage', getUsageStats);

export default router;
