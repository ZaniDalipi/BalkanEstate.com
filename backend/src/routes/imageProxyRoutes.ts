import express from 'express';
import { proxyExternalImage } from '../controllers/imageProxyController';

const router = express.Router();

// Proxy external images to avoid CORS on the frontend.
// GET /api/image-proxy?url=<encoded-url>
router.get('/', proxyExternalImage);

export default router;
