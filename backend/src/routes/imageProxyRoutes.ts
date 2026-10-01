import express from 'express';
import { proxyExternalImage } from '../controllers/imageProxyController';
import { imageProxyRateLimiter } from '../middleware/security';
import { sweepImageProxyCache } from '../services/imageProxy/imageProxyService';

const router = express.Router();

// Resize + cache external (feed) images on our server — never on Cloudinary.
// GET /api/image-proxy?url=<encoded-url>&w=<width>
router.get('/', imageProxyRateLimiter, proxyExternalImage);

// Keep the disk cache within its age and size limits.
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
setInterval(() => {
  void sweepImageProxyCache();
}, SWEEP_INTERVAL_MS).unref();

export default router;
