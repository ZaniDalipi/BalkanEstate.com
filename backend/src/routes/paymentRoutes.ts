import express from 'express';
import {
  createUnifiedPayment,
  getPaymentProviders,
  getSupportedCountries,
  processPayment,
  getSubscriptionStatus,
  cancelSubscription,
  applyFreeSubscription,
  reactivateSubscription,
  getCustomerPortal,
  getAvailablePaymentMethods,
} from '../controllers/paymentController';
import { handlePayseraWebhook, verifyPayseraPayment } from '../controllers/payseraWebhookController';
import { protect } from '../middleware/auth';
import { decryptPayload } from '../middleware/decryptPayload';
import {
  validateCreatePayment,
  validateCountryCode,
  validateFreeSubscription,
} from '../middleware/paymentValidation';

const router = express.Router();

// ============================================================
// UNIFIED PAYMENT ENDPOINTS
// ============================================================

/**
 * Create a payment using the appropriate provider based on country
 * POST /api/payments/create-payment
 * Body: { planName, planInterval, amount, productId, countryCode, language, preferredProvider? }
 */
router.post('/create-payment', protect, decryptPayload, validateCreatePayment, createUnifiedPayment);

/**
 * Get payment provider info for a specific country
 * GET /api/payments/providers/:countryCode
 */
router.get('/providers/:countryCode', validateCountryCode, getPaymentProviders);

/**
 * Get all supported countries and their payment providers
 * GET /api/payments/supported-countries
 */
router.get('/supported-countries', getSupportedCountries);

/**
 * Get available payment methods for a country
 * GET /api/payments/methods/:countryCode
 */
router.get('/methods/:countryCode', validateCountryCode, getAvailablePaymentMethods);

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

/** Apply free subscription with 100% off coupon */
router.post('/apply-free-subscription', protect, decryptPayload, validateFreeSubscription, applyFreeSubscription);

/** Reactivate an expired subscription (no payment required) */
router.post('/reactivate-subscription', protect, reactivateSubscription);

/** Get subscription status */
router.get('/subscription-status', protect, getSubscriptionStatus);

/** Cancel subscription */
router.post('/cancel-subscription', protect, cancelSubscription);

/** Get customer portal URL (update payment method, view invoices) */
router.get('/customer-portal', protect, getCustomerPortal);

// ============================================================
// PAYSERA ENDPOINTS (bank transfer webhook + verification)
// ============================================================

/** Paysera payment callback (signature-verified, no auth) */
router.post('/paysera/webhook', handlePayseraWebhook);

/** Verify Paysera payment by order ID */
router.get('/paysera/verify/:orderId', protect, verifyPayseraPayment);

// ============================================================
// LEGACY ENDPOINTS (backward compatibility)
// ============================================================

router.post('/process', protect, processPayment);

export default router;
