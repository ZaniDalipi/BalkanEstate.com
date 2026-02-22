import express from 'express';
import { handleGooglePlayNotification } from '../controllers/googlePlayWebhookController';
import { handleAppStoreNotification } from '../controllers/appStoreWebhookController';

const router = express.Router();

// Webhook endpoints (no authentication - verified via cryptographic signature)

// Google Play — Mobile app subscriptions
router.post('/google-play', handleGooglePlayNotification);

// App Store — iOS app subscriptions
router.post('/app-store', handleAppStoreNotification);

export default router;
