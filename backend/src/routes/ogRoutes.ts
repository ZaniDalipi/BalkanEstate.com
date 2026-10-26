/**
 * OG (Open Graph) Routes
 *
 * Provides the /api/og/property/:slug endpoint used by the frontend share
 * button.  Because this lives under /api/, nginx always proxies it to
 * Express — even when nginx serves all other frontend routes from static files.
 */

import express from 'express';
import { ogShareHandler } from '../controllers/ogController';
import { residenceShareHandler, residenceShareImageHandler } from '../controllers/residenceOgController';

const router = express.Router();

/**
 * GET /api/og/property/:slug
 *
 * Social media bots  → 200 OG HTML (property photo, title, price, details)
 * Regular browsers   → 302 redirect to the real /en/property/:slug page
 */
router.get('/property/:slug', ogShareHandler);

/**
 * GET /api/og/residence/:slug/image.jpg — the residence's share card (1200×630).
 * GET /api/og/residence/:slug — the residence link to share (bots: preview; people: the page).
 */
router.get('/residence/:slug/image.jpg', residenceShareImageHandler);
router.get('/residence/:slug', residenceShareHandler);

export default router;
