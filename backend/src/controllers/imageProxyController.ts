import type { Request, Response } from 'express';
import { mediaLogger } from '../utils/logger';
import {
  getProxiedImage,
  ImageProxyError,
  validateProxyRequest,
} from '../services/imageProxy/imageProxyService';

/**
 * GET /api/image-proxy?url=<encoded-url>&w=<width>
 *
 * Serves external (feed) photos resized to WebP from our own server, so they
 * cost nothing on Cloudinary. See services/imageProxy for the pipeline.
 */
export const proxyExternalImage = async (req: Request, res: Response): Promise<void> => {
  const validation = validateProxyRequest({ url: req.query.url, w: req.query.w });
  if (!validation.isValid || !validation.value) {
    res.status(400).json({ error: validation.error || 'Invalid request' });
    return;
  }

  try {
    const { body, etag, fromCache } = await getProxiedImage(validation.value);

    // Browsers and any CDN in front of us keep it for a week, and may serve a
    // stale copy for a day while revalidating — each (url, w) is effectively
    // immutable for us, and re-fetching costs the source site bandwidth.
    res.set('Cache-Control', 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400');
    res.set('ETag', etag);
    res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.type('image/webp').send(body);
  } catch (error) {
    if (error instanceof ImageProxyError) {
      // Short cache on errors so a broken image doesn't hammer us or the source.
      res.set('Cache-Control', 'public, max-age=300');
      res.status(error.status).json({ error: error.message });
      return;
    }
    mediaLogger.error('❌ Image proxy failed unexpectedly:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
};
