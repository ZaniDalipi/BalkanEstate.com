import express from 'express';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  getStatus,
} from '../controllers/pushSubscriptionController';
import { protect } from '../middleware/auth';
import {
  pushSubscribeRateLimiterIP,
  pushVapidKeyRateLimiterIP,
} from '../middleware/rateLimiter';

const router = express.Router();

// Public: get VAPID key for browser push subscription
router.get('/vapid-public-key', pushVapidKeyRateLimiterIP, getVapidPublicKey);

// Protected routes (rate-limited to prevent subscription spam)
router.post('/subscribe', protect, pushSubscribeRateLimiterIP, subscribe);
router.post('/unsubscribe', protect, pushSubscribeRateLimiterIP, unsubscribe);
router.get('/status', protect, getStatus);

export default router;
