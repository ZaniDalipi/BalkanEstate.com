import express from 'express';
import { proxyWeatherTile, proxyFirmsWms, getAvailableServices } from '../controllers/mapProxyController';

const router = express.Router();

// Public - tile proxies (API keys stay server-side)
router.get('/available', getAvailableServices);
router.get('/weather-tile/:layer/:z/:x/:y', proxyWeatherTile);
router.get('/firms-wms', proxyFirmsWms);

export default router;
