import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import { BusinessNotFoundError, businessShareImage } from '../services/businessShare/businessShareImage';

/** Ids, encoded ids and SEO slugs — nothing that could be a path trick. */
const PARAM = /^[A-Za-z0-9_-]{1,200}$/;

/**
 * GET /api/og/business/:id/image.jpg — the business's 1200×630 share card,
 * the og:image of its shared link (see functions/_og-business.ts).
 */
export const businessShareImageHandler = async (req: Request, res: Response): Promise<void> => {
  const param = String(req.params.id || '');
  if (!PARAM.test(param)) {
    res.status(404).end();
    return;
  }
  try {
    const { body, etag } = await businessShareImage(param);
    if (req.get('if-none-match') === etag) {
      res.status(304).end();
      return;
    }
    res
      .set('Content-Type', 'image/jpeg')
      .set('Cache-Control', 'public, max-age=3600, s-maxage=86400')
      .set('ETag', etag)
      .send(body);
  } catch (error) {
    if (error instanceof BusinessNotFoundError) {
      res.status(404).end();
      return;
    }
    apiLogger.error(`Business share card failed for ${param}:`, error);
    res.status(500).end();
  }
};
