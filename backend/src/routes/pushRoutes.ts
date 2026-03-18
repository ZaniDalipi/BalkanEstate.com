import express from 'express';
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  getStatus,
} from '../controllers/pushSubscriptionController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public: get VAPID key for browser push subscription
router.get('/vapid-public-key', getVapidPublicKey);

// Protected routes
router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);
router.get('/status', protect, getStatus);

export default router;
