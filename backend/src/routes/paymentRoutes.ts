import express from 'express';
import {
  createUnifiedPayment,
  getPaymentProviders,
  getSupportedCountries,
  processPayment,
  getSubscriptionStatus,
  cancelSubscription,
  applyFreeSubscription,
} from '../controllers/paymentController';
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
