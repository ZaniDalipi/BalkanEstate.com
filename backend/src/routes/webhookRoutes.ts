import express from 'express';
import { handleGooglePlayNotification } from '../controllers/googlePlayWebhookController';
import { handleAppStoreNotification } from '../controllers/appStoreWebhookController';
import { handleProviderWebhook } from '../controllers/webhookController';
import { providerRegistry } from '../services/providers/providerRegistry';

const router = express.Router();

// Webhook endpoints (no authentication - verified via provider-specific signature)

// Google Play — Mobile app subscriptions (Pub/Sub)
router.post('/google-play', handleGooglePlayNotification);

// App Store — iOS app subscriptions (JWT)
router.post('/app-store', handleAppStoreNotification);

// Universal payment provider webhooks (Stripe, Paysera, Paddle, etc.)
// Providers that need raw body get express.raw() middleware automatically
router.post('/:provider', (req, res, next) => {
  const provider = providerRegistry.get(req.params.provider as string);
  if (provider?.requiresRawBody()) {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    next();
  }
}, handleProviderWebhook);

export default router;
