import express from 'express';
import {
  createSubscription,
  getUserSubscriptions,
  getCurrentSubscription,
  getSubscriptionById,
  cancelSubscription,
  restoreSubscription,
  getSubscriptionEvents,
  getSubscriptionPayments,
  verifySubscription,
  activateTestProSubscription,
  syncProSubscription,
} from '../controllers/subscriptionController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Subscription management
router.post('/', createSubscription);
router.get('/', getUserSubscriptions);
router.get('/current', getCurrentSubscription); // Must be before /:id to avoid conflict
router.post('/activate-test-pro', activateTestProSubscription); // Development only - must be before /:id
router.post('/sync-pro', syncProSubscription); // Sync user.proSubscription with active Subscription

router.get('/:id', getSubscriptionById);
router.post('/:id/cancel', cancelSubscription);
router.post('/:id/restore', restoreSubscription);
router.post('/:id/verify', verifySubscription);

// Subscription details
router.get('/:id/events', getSubscriptionEvents);
router.get('/:id/payments', getSubscriptionPayments);

export default router;
