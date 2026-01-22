import express from 'express';
import {
  createCheckoutSession,
  createUnifiedPayment,
  getPaymentProviders,
  getSupportedCountries,
  processPayment,
  getSubscriptionStatus,
  cancelSubscription,
  handleWebhook,
  verifySession,
  applyFreeSubscription,
} from '../controllers/paymentController';
import {
  handlePaddleWebhook,
  verifyPaddlePayment,
  getPaddleConfig,
} from '../controllers/paddleWebhookController';
import {
  handleLemonSqueezyWebhook,
  getLemonSqueezyConfig,
  getCustomerPortal,
} from '../controllers/lemonSqueezyWebhookController';
import { protect } from '../middleware/auth';

const router = express.Router();

// ============================================================
// UNIFIED PAYMENT ENDPOINTS (Recommended)
// ============================================================

/**
 * Create a payment using the appropriate provider based on country
 * POST /api/payments/create-payment
 * Body: { planName, planInterval, amount, productId, countryCode, language }
 */
router.post('/create-payment', protect, createUnifiedPayment);

/**
 * Get payment provider info for a specific country
 * GET /api/payments/providers/:countryCode
 */
router.get('/providers/:countryCode', getPaymentProviders);

/**
 * Get all supported countries and their payment providers
 * GET /api/payments/supported-countries
 */
router.get('/supported-countries', getSupportedCountries);

// ============================================================
// STRIPE ENDPOINTS
// ============================================================

// Stripe Checkout Session (protected) - redirects to external Stripe payment page
// Legacy endpoint - prefer /create-payment for new integrations
router.post('/create-checkout-session', protect, createCheckoutSession);

// Stripe Webhook (public but verified with signature)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Verify Stripe payment session after redirect (protected)
router.get('/verify-session/:sessionId', protect, verifySession);

// ============================================================
// PADDLE ENDPOINTS
// ============================================================

// Paddle Webhook (public but verified with signature)
// Paddle sends POST request with JSON body
router.post('/paddle/webhook', handlePaddleWebhook);

// Get Paddle client configuration for frontend
router.get('/paddle/config', getPaddleConfig);

// Verify Paddle payment by transaction ID (protected)
router.get('/paddle/verify/:transactionId', protect, verifyPaddlePayment);

// ============================================================
// LEMONSQUEEZY ENDPOINTS
// ============================================================

// LemonSqueezy Webhook (public but verified with signature)
// LemonSqueezy sends POST request with JSON body
router.post('/lemonsqueezy/webhook', handleLemonSqueezyWebhook);

// Get LemonSqueezy configuration for frontend
router.get('/lemonsqueezy/config', getLemonSqueezyConfig);

// Get customer portal URL (protected)
router.get('/lemonsqueezy/portal', protect, getCustomerPortal);

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

// Apply free subscription with 100% off coupon (protected)
router.post('/apply-free-subscription', protect, applyFreeSubscription);

// Subscription status (protected)
router.get('/subscription-status', protect, getSubscriptionStatus);

// Cancel subscription (protected)
router.post('/cancel-subscription', protect, cancelSubscription);

// ============================================================
// LEGACY ENDPOINTS (for backward compatibility)
// ============================================================

// Legacy: Process payment (protected)
router.post('/process', protect, processPayment);

export default router;
