import express from 'express';
import { handleGooglePlayNotification } from '../controllers/googlePlayWebhookController';
import { handleAppStoreNotification } from '../controllers/appStoreWebhookController';

const router = express.Router();

// Webhook endpoints (no authentication - verified via signature)
router.post('/google-play', handleGooglePlayNotification);
router.post('/app-store', handleAppStoreNotification);

export default router;
