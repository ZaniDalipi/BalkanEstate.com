import express from 'express';
import { searchLocation, reverseGeocode } from '../controllers/geocodingController';

const router = express.Router();

// Public routes - no authentication required
router.get('/search', searchLocation);
router.get('/reverse', reverseGeocode);

export default router;
