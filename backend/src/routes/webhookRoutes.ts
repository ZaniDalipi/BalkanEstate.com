import express from 'express';
import { handleGooglePlayNotification } from '../controllers/googlePlayWebhookController';
import { handleAppStoreNotification } from '../controllers/appStoreWebhookController';
import { handleStripeWebhook } from '../controllers/stripeWebhookController';

const router = express.Router();

// Webhook endpoints (no authentication - verified via cryptographic signature)

// Google Play — Mobile app subscriptions
router.post('/google-play', handleGooglePlayNotification);

// App Store — iOS app subscriptions
router.post('/app-store', handleAppStoreNotification);

// Stripe — Web subscriptions (requires raw body for signature verification)
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
