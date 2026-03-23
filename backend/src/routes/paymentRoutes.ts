// express import removed - no longer needed for raw body
import express from 'express';
import {
  createUnifiedPayment,
  getPaymentProviders,
  getSupportedCountries,
  processPayment,
  getSubscriptionStatus,
  cancelSubscription,
  applyFreeSubscription,
  getCustomerPortal,
  getAvailablePaymentMethods,
  verifyPayPalPayment,
} from '../controllers/paymentController';
import { handlePayseraWebhook, verifyPayseraPayment } from '../controllers/payseraWebhookController';
import { handlePayPalWebhook } from '../controllers/paypalWebhookController';
import { handleBraintreeWebhook } from '../controllers/braintreeWebhookController';
import {
  getBraintreeClientToken,
  processBraintreePayment,
} from '../controllers/paymentController';
import { protect } from '../middleware/auth';
import { decryptPayload } from '../middleware/decryptPayload';
import {
  validateCreatePayment,
  validateCountryCode,
  validateFreeSubscription,
  validateBraintreePayment,
} from '../middleware/paymentValidation';

const router = express.Router();

// ============================================================
// UNIFIED PAYMENT ENDPOINTS
// ============================================================

/**
 * Create a payment using the appropriate provider based on country
 * POST /api/payments/create-payment
 * Body: { planName, planInterval, amount, productId, countryCode, language, preferredProvider? }
 *
 * Routes to:
 * - Braintree for GR, HR, BG, RO, SI, RS
 * - PayPal for AL, BA, MK, ME, XK
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

/** Get subscription status */
router.get('/subscription-status', protect, getSubscriptionStatus);

/** Cancel subscription */
router.post('/cancel-subscription', protect, cancelSubscription);

/** Get customer portal URL (update payment method, view invoices) */
router.get('/customer-portal', protect, getCustomerPortal);

// ============================================================
// PAYPAL ENDPOINTS (real payment verification)
// ============================================================

/**
 * PayPal webhook — signature-verified via PayPal API, no auth required.
 * This is the ONLY way PayPal payments are confirmed.
 */
router.post('/paypal/webhook', handlePayPalWebhook);

/** Verify PayPal order by order ID (server-side) */
router.get('/paypal/verify/:orderId', protect, verifyPayPalPayment);

// ============================================================
// BRAINTREE ENDPOINTS (on-site card payments for PayPal countries)
// ============================================================

/** Generate a client token for the Braintree Drop-in UI */
router.get('/braintree/client-token', protect, getBraintreeClientToken);

/** Process a Braintree payment using a payment method nonce */
router.post('/braintree/process-payment', protect, decryptPayload, validateBraintreePayment, processBraintreePayment);

/** Braintree webhook — for settlement declines and disputes */
router.post('/braintree/webhook', handleBraintreeWebhook);

// ============================================================
// PAYSERA ENDPOINTS (legacy — kept for backward compatibility)
// ============================================================

/** Paysera payment callback (signature-verified, no auth) */
router.post('/paysera/webhook', handlePayseraWebhook);

/** Verify Paysera payment by order ID */
router.get('/paysera/verify/:orderId', protect, verifyPayseraPayment);

// ============================================================
// LEGACY ENDPOINTS (backward compatibility)
// ============================================================

/** Legacy mock payment — disabled, returns error directing to real payment */
router.post('/process', protect, processPayment);

export default router;
