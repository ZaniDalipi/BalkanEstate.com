import express from 'express';
import { getMarketHubController, getMarketPageController } from '../controllers/marketPageController';

/**
 * Public data for the "property for sale / for rent in …" landing pages
 * (/:lang/property-for-sale[/:country[/:city]]). Read-only, cached by apiCache.
 */
const router = express.Router();

router.get('/:deal', getMarketHubController);
router.get('/:deal/:country', getMarketPageController);
router.get('/:deal/:country/:city', getMarketPageController);

export default router;
