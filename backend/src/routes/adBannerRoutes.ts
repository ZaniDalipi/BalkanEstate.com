import express from 'express';
import {
  getActiveBanners,
  trackImpression,
  trackClick,
} from '../controllers/adBannerController';

const router = express.Router();

// Public routes - no authentication required
router.get('/', getActiveBanners);
router.post('/:id/impression', trackImpression);
router.post('/:id/click', trackClick);

export default router;
