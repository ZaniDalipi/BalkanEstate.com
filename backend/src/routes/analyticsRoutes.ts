import express from 'express';
import {
  trackEvent,
  getActivityLog,
  getDashboardAnalytics,
  getNavigationHeatmap,
  getRecentSubscriptions,
} from '../controllers/analyticsController';
import { protect, restrictTo, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Public route - track events (can be called from frontend)
// Optional auth - if user is logged in, we capture their userId
router.post('/track', optionalAuth, trackEvent);

// Admin-only routes
router.get('/activity-log', protect, restrictTo('admin', 'super_admin'), getActivityLog);
router.get('/dashboard', protect, restrictTo('admin', 'super_admin'), getDashboardAnalytics);
router.get('/heatmap', protect, restrictTo('admin', 'super_admin'), getNavigationHeatmap);
router.get('/subscriptions/recent', protect, restrictTo('admin', 'super_admin'), getRecentSubscriptions);

export default router;
