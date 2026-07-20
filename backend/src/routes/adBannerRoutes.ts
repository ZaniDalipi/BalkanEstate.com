import express from 'express';
import {
  getPublicAdBanners,
  trackAdBannerImpression,
  trackAdBannerClick,
} from '../controllers/adBannerController';

const router = express.Router();

// Public — visitors fetch active banners and report impressions/clicks.
router.get('/', getPublicAdBanners);
router.post('/:id/impression', trackAdBannerImpression);
router.post('/:id/click', trackAdBannerClick);

export default router;
