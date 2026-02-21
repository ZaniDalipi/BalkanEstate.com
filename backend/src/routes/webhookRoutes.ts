import express from 'express';
import { handleGooglePlayNotification } from '../controllers/googlePlayWebhookController';
import { handleAppStoreNotification } from '../controllers/appStoreWebhookController';
import { handleLemonSqueezyWebhook } from '../controllers/lemonSqueezyWebhookController';

const router = express.Router();

// Webhook endpoints (no authentication - verified via cryptographic signature)

// LemonSqueezy — Primary payment provider (HMAC-SHA256 verification)
// Requires raw body for signature verification; see rawBodyMiddleware in server.ts
router.post('/lemon-squeezy', handleLemonSqueezyWebhook);

// Google Play — Mobile app subscriptions
router.post('/google-play', handleGooglePlayNotification);

// App Store — iOS app subscriptions
router.post('/app-store', handleAppStoreNotification);

export default router;
