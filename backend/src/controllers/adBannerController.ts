import { Request, Response } from 'express';
import AdBanner, { AD_PLACEMENTS, AD_BILLING_PERIODS, AdPlacement } from '../models/AdBanner';
import { getObjectIdParam } from '../utils/validateParams';

const isValidPlacement = (value: unknown): value is AdPlacement =>
  typeof value === 'string' && (AD_PLACEMENTS as readonly string[]).includes(value);

/**
 * Sanitise and coerce the request body into a persistable banner payload.
 * `partial` controls whether missing fields are skipped (update) or defaulted (create).
 */
const buildBannerPayload = (body: any, partial: boolean): Record<string, any> => {
  const payload: Record<string, any> = {};
  const setString = (key: string, max: number) => {
    if (body[key] !== undefined) payload[key] = body[key] === null ? undefined : String(body[key]).trim().slice(0, max);
  };

  setString('title', 120);
  setString('advertiserName', 120);
  setString('imageUrl', 2000);
  setString('imagePublicId', 300);
  setString('mobileImageUrl', 2000);
  setString('mobileImagePublicId', 300);
  setString('linkUrl', 2000);
  setString('notes', 1000);

  if (body.placement !== undefined && isValidPlacement(body.placement)) payload.placement = body.placement;
  if (body.openInNewTab !== undefined) payload.openInNewTab = body.openInNewTab === true || body.openInNewTab === 'true';
  if (body.isActive !== undefined) payload.isActive = body.isActive === true || body.isActive === 'true';
  if (body.isSticky !== undefined) payload.isSticky = body.isSticky === true || body.isSticky === 'true';
  if (body.dismissible !== undefined) payload.dismissible = body.dismissible === true || body.dismissible === 'true';
  if (body.priority !== undefined) payload.priority = Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0;
  if (body.price !== undefined) payload.price = body.price === null || body.price === '' ? undefined : Math.max(0, Number(body.price) || 0);
  if (body.currency !== undefined) payload.currency = String(body.currency || 'EUR').trim().toUpperCase().slice(0, 3);
  if (body.billingPeriod !== undefined && (AD_BILLING_PERIODS as readonly string[]).includes(body.billingPeriod)) {
    payload.billingPeriod = body.billingPeriod;
  }
  if (body.startDate !== undefined) payload.startDate = body.startDate ? new Date(body.startDate) : undefined;
  if (body.endDate !== undefined) payload.endDate = body.endDate ? new Date(body.endDate) : undefined;

  if (!partial) {
    payload.openInNewTab = payload.openInNewTab ?? true;
    payload.isActive = payload.isActive ?? true;
    payload.isSticky = payload.isSticky ?? false;
    payload.dismissible = payload.dismissible ?? true;
    payload.priority = payload.priority ?? 0;
    payload.currency = payload.currency ?? 'EUR';
    payload.billingPeriod = payload.billingPeriod ?? 'monthly';
  }

  return payload;
};

// ============================================================
// Public endpoints
// ============================================================

/**
 * GET /api/ad-banners?placement=home-top
 * Returns the currently-live banners for a placement (active + within schedule),
 * ordered by priority. Only fields needed for rendering are exposed.
 */
export const getActiveBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const placement = req.query.placement;
    const now = new Date();
    const query: Record<string, any> = {
      isActive: true,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
      ],
    };

    if (placement !== undefined) {
      if (!isValidPlacement(placement)) {
        res.json([]);
        return;
      }
      query.placement = placement;
    }

    const banners = await AdBanner.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .select('title advertiserName imageUrl mobileImageUrl linkUrl openInNewTab placement isSticky dismissible priority')
      .lean();

    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load banners' });
  }
};

/** POST /api/ad-banners/:id/impression — fire-and-forget view counter. */
export const trackImpression = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    await AdBanner.updateOne({ _id: id }, { $inc: { impressions: 1 } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to track impression' });
  }
};

/** POST /api/ad-banners/:id/click — click counter. */
export const trackClick = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    await AdBanner.updateOne({ _id: id }, { $inc: { clicks: 1 } });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to track click' });
  }
};

// ============================================================
// Admin endpoints
// ============================================================

/** GET /api/admin/ad-banners */
export const getAllBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const { placement, status } = req.query;
    const filter: Record<string, any> = {};
    if (placement && isValidPlacement(placement)) filter.placement = placement;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const banners = await AdBanner.find(filter).sort({ placement: 1, priority: -1, createdAt: -1 }).lean();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch banners' });
  }
};

/** POST /api/admin/ad-banners */
export const createBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = buildBannerPayload(req.body, false);

    if (!payload.title || !payload.imageUrl || !payload.linkUrl || !payload.placement) {
      res.status(400).json({
        message: 'title, imageUrl, linkUrl and a valid placement are required',
      });
      return;
    }

    payload.createdBy = (req as any).user?._id;
    const banner = await AdBanner.create(payload);
    res.status(201).json(banner);
  } catch (error: any) {
    if (error?.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation failed', error: String(error) });
      return;
    }
    res.status(500).json({ message: 'Failed to create banner' });
  }
};

/** PATCH /api/admin/ad-banners/:id */
export const updateBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const payload = buildBannerPayload(req.body, true);
    const banner = await AdBanner.findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true });
    if (!banner) {
      res.status(404).json({ message: 'Banner not found' });
      return;
    }
    res.json(banner);
  } catch (error: any) {
    if (error?.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation failed', error: String(error) });
      return;
    }
    res.status(500).json({ message: 'Failed to update banner' });
  }
};

/** DELETE /api/admin/ad-banners/:id */
export const deleteBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const banner = await AdBanner.findById(id);
    if (!banner) {
      res.status(404).json({ message: 'Banner not found' });
      return;
    }

    // Best-effort cleanup of uploaded creatives.
    const publicIds = [banner.imagePublicId, banner.mobileImagePublicId].filter(Boolean) as string[];
    if (publicIds.length) {
      try {
        const cloudinary = (await import('../config/cloudinary')).default;
        await Promise.all(publicIds.map((pid) => cloudinary.uploader.destroy(pid)));
      } catch {
        /* ignore cleanup errors */
      }
    }

    await banner.deleteOne();
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete banner' });
  }
};

/** POST /api/admin/ad-banners/upload-image */
export const uploadBannerImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    const { uploadImage } = await import('../services/cloudinaryService');
    const result = await uploadImage(req.file.buffer, {
      userId: (req as any).user._id.toString(),
      type: 'business-banner',
      maxWidth: 1920,
      maxHeight: 1080,
    });

    res.json({ url: result.url, publicId: result.publicId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload image', error: String(error) });
  }
};
