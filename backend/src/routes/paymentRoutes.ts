import express from 'express';
import {
  createCheckoutSession,
  processPayment,
  getSubscriptionStatus,
  cancelSubscription,
  handleWebhook,
  verifySession,
  applyFreeSubscription,
} from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Stripe Checkout Session (protected) - redirects to external Stripe payment page
router.post('/create-checkout-session', protect, createCheckoutSession);

// Apply free subscription with 100% off coupon (protected)
router.post('/apply-free-subscription', protect, applyFreeSubscription);

// Stripe Webhook (public but verified with signature) - must be BEFORE express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Verify payment session after redirect (protected)
router.get('/verify-session/:sessionId', protect, verifySession);

// Legacy: Process payment (protected) - for backward compatibility
router.post('/process', protect, processPayment);

// Subscription status (protected)
router.get('/subscription-status', protect, getSubscriptionStatus);

// Cancel subscription (protected)
router.post('/cancel-subscription', protect, cancelSubscription);

export default router;
