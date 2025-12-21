import express from 'express';
import {
  getFeaturedCitiesController,
  getCitiesByCountryController,
  getCityMarketDataController,
  triggerMarketDataUpdateController,
} from '../controllers/cityMarketDataController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/featured', getFeaturedCitiesController);
router.get('/country/:country', getCitiesByCountryController);
router.get('/market-data/:city/:country', getCityMarketDataController);

// Admin routes
router.post('/update-market-data', protect, triggerMarketDataUpdateController);

export default router;
