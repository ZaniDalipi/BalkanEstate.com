import express from 'express';
import {
  trackEvent,
  getActivityLog,
  getDashboardAnalytics,
  getNavigationHeatmap,
  getRecentSubscriptions,
} from '../controllers/analyticsController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = express.Router();

// Public route - track events (can be called from frontend)
// Optional auth - if user is logged in, we capture their userId
router.post('/track', authMiddleware({ required: false }), trackEvent);

// Admin-only routes
router.get('/activity-log', authMiddleware(), adminMiddleware, getActivityLog);
router.get('/dashboard', authMiddleware(), adminMiddleware, getDashboardAnalytics);
router.get('/heatmap', authMiddleware(), adminMiddleware, getNavigationHeatmap);
router.get('/subscriptions/recent', authMiddleware(), adminMiddleware, getRecentSubscriptions);

export default router;
