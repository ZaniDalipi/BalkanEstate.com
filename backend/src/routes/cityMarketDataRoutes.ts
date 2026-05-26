import express from 'express';
import {
  getFeaturedCitiesController,
  getCitiesByCountryController,
  getCityMarketDataController,
  triggerMarketDataUpdateController,
  refreshCityImagesController,
  getCityImagesController,
} from '../controllers/cityMarketDataController';
import {
  getSuburbDataController,
  refreshSuburbDataController,
} from '../controllers/suburbDataController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/featured', getFeaturedCitiesController);
router.get('/country/:country', getCitiesByCountryController);
router.get('/market-data/:city/:country', getCityMarketDataController);
router.get('/suburbs/:city/:country', getSuburbDataController);
router.get('/images/:city/:country', getCityImagesController);

// Admin routes
router.post('/update-market-data', protect, triggerMarketDataUpdateController);
router.post('/refresh-images', protect, refreshCityImagesController);
router.post('/suburbs/:city/:country/refresh', protect, refreshSuburbDataController);

export default router;
