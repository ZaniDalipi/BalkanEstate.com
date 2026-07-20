import { Request, Response } from 'express';
import AdBanner, { AD_PLACEMENTS, AD_PAGES, AdPage, AdPlacement } from '../models/AdBanner';
import { IUser } from '../models/User';
import { uploadImage, deleteImage } from '../services/cloudinaryService';
import { getObjectIdParam } from '../utils/validateParams';
import { encodeId } from '../utils/idObfuscation';

/** Transform lean document → obfuscated id, strip internals. */
const transformLean = (doc: any) => {
  if (!doc) return doc;
  const { _id, __v, imagePublicId, ...rest } = doc;
  const hex = _id?.toString();
  return { id: hex ? encodeId(hex) : hex, ...rest };
};

const isPlacement = (v: unknown): v is AdPlacement =>
  typeof v === 'string' && (AD_PLACEMENTS as readonly string[]).includes(v);
const isPage = (v: unknown): v is AdPage =>
  typeof v === 'string' && (AD_PAGES as readonly string[]).includes(v);

/**
 * @desc    Public: list active banners for a page + placement (respects date window)
 * @route   GET /api/ad-banners
 * @access  Public
 */
export const getPublicAdBanners = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, placement } = req.query;
    const now = new Date();

    const filter: Record<string, any> = {
      isActive: true,
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
      ],
    };

    // A banner on a specific page also shows on `all`; an `all` banner shows everywhere.
    if (page && isPage(page) && page !== 'all') {
      filter.page = { $in: [page, 'all'] };
    }
    if (placement && isPlacement(placement)) {
      filter.placement = placement;
    }

    const banners = await AdBanner.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .select('-impressions -clicks -price -advertiserContact')
      .lean();

    res.json({ banners: banners.map(transformLean) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch ad banners' });
  }
};

/**
 * @desc    Public: record a banner impression
 * @route   POST /api/ad-banners/:id/impression
 * @access  Public
 */
export const trackAdBannerImpression = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    await AdBanner.updateOne({ _id: id }, { $inc: { impressions: 1 } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Failed to record impression' });
  }
};

/**
 * @desc    Public: record a banner click
 * @route   POST /api/ad-banners/:id/click
 * @access  Public
 */
export const trackAdBannerClick = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    await AdBanner.updateOne({ _id: id }, { $inc: { clicks: 1 } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Failed to record click' });
  }
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/**
 * @desc    Admin: list all banners
 * @route   GET /api/admin/ad-banners
 * @access  Admin
 */
export const getAllAdBanners = async (_req: Request, res: Response): Promise<void> => {
  try {
    const banners = await AdBanner.find().sort({ page: 1, placement: 1, order: 1 }).lean();
    res.json({ banners: banners.map(transformLean) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch ad banners' });
  }
};

const sanitizePayload = (body: any) => {
  const payload: Record<string, any> = {};
  const fields = [
    'title', 'advertiserName', 'advertiserContact', 'imageUrl', 'imagePublicId',
    'linkUrl', 'placement', 'page', 'category', 'price', 'currency',
    'isActive', 'isSticky', 'startDate', 'endDate', 'order',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) payload[f] = body[f];
  }
  return payload;
};

/**
 * @desc    Admin: create a banner
 * @route   POST /api/admin/ad-banners
 * @access  Admin
 */
export const createAdBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = sanitizePayload(req.body);

    if (!payload.title || !payload.advertiserName || !payload.imageUrl || !payload.linkUrl) {
      res.status(400).json({ message: 'title, advertiserName, imageUrl and linkUrl are required' });
      return;
    }
    if (payload.placement && !isPlacement(payload.placement)) {
      res.status(400).json({ message: 'Invalid placement' });
      return;
    }
    if (payload.page && !isPage(payload.page)) {
      res.status(400).json({ message: 'Invalid page' });
      return;
    }

    const banner = await AdBanner.create(payload);
    res.status(201).json({ banner: transformLean(banner.toObject()) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create ad banner' });
  }
};

/**
 * @desc    Admin: update a banner
 * @route   PATCH /api/admin/ad-banners/:id
 * @access  Admin
 */
export const updateAdBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const payload = sanitizePayload(req.body);
    if (payload.placement && !isPlacement(payload.placement)) {
      res.status(400).json({ message: 'Invalid placement' });
      return;
    }
    if (payload.page && !isPage(payload.page)) {
      res.status(400).json({ message: 'Invalid page' });
      return;
    }

    const banner = await AdBanner.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!banner) {
      res.status(404).json({ message: 'Ad banner not found' });
      return;
    }
    res.json({ banner: transformLean(banner) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update ad banner' });
  }
};

/**
 * @desc    Admin: delete a banner
 * @route   DELETE /api/admin/ad-banners/:id
 * @access  Admin
 */
export const deleteAdBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const banner = await AdBanner.findById(id);
    if (!banner) {
      res.status(404).json({ message: 'Ad banner not found' });
      return;
    }

    if (banner.imagePublicId) {
      await deleteImage(banner.imagePublicId).catch(() => {});
    }
    await banner.deleteOne();
    res.json({ message: 'Ad banner deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete ad banner' });
  }
};

/**
 * @desc    Admin: upload a banner image to Cloudinary
 * @route   POST /api/admin/ad-banners/upload-image
 * @access  Admin
 */
export const uploadAdBannerImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const currentUser = req.user as IUser;

    const result = await uploadImage(req.file.buffer, {
      userId: String(currentUser._id),
      userEmail: currentUser.email,
      type: 'ad-banner',
      maxWidth: 1600,
      maxHeight: 600,
    });

    res.status(200).json({ url: result.url, publicId: result.publicId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload banner image' });
  }
};
