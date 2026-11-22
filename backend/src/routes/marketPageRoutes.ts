import express from 'express';
import {
  getMarketHubController,
  getMarketPageController,
  getPriceTableController,
  getPriceTableCsvController,
} from '../controllers/marketPageController';

/**
 * Public data for the "property for sale / for rent in …" landing pages
 * (/:lang/property-for-sale[/:country[/:city]]). Read-only, cached by apiCache.
 */
const router = express.Router();

router.get('/:deal', getMarketHubController);
router.get('/:deal/:country', getMarketPageController);
router.get('/:deal/:country/:city', getMarketPageController);

/** /api/market-prices: the "Property prices in the Balkans" table, as JSON and CSV. */
export const marketPriceRouter = express.Router();
marketPriceRouter.get('/', getPriceTableController);
marketPriceRouter.get('/csv', getPriceTableCsvController);

export default router;
