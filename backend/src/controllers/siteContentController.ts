import { Request, Response } from 'express';
import SiteContent from '../models/SiteContent';
import { randomBytes } from 'crypto';
import { putObject, deleteObject } from '../services/bunnyStorageService';
import { buildBunnyUrl } from '../utils/bunnyUrl';
import { getParam, getObjectIdParam } from '../utils/validateParams';

// Get all content for a section (public)
export const getContentBySection = async (req: Request, res: Response) => {
  try {
    const section = getParam(req, 'section');
    const subsection = getParam(req, 'subsection');
    const query: any = { section, isActive: true };
    if (subsection) query.subsection = subsection;

    const content = await SiteContent.find(query)
      .sort({ order: 1 })
      .select('-createdBy -__v');

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all how-it-works content (public)
export const getHowItWorksContent = async (_req: Request, res: Response) => {
  try {
    const content = await SiteContent.find({
      section: 'how-it-works',
      isActive: true
    })
      .sort({ subsection: 1, order: 1 })
      .select('-createdBy -__v');

    // Group by subsection
    const grouped = content.reduce((acc: any, item) => {
      const key = item.subsection || 'general';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    res.json(grouped);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Get all content
export const getAllContent = async (_req: Request, res: Response) => {
  try {
    const content = await SiteContent.find()
      .sort({ section: 1, subsection: 1, order: 1 })
      .populate('createdBy', 'name email');

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Create content
export const createContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, type, url, title, description, section, subsection, order } = req.body;
    const userId = (req as any).user._id;

    // Check if key already exists
    const existing = await SiteContent.findOne({ key });
    if (existing) {
      res.status(400).json({ message: 'Content with this key already exists' });
      return;
    }

    const content = await SiteContent.create({
      key,
      type,
      url,
      title,
      description,
      section,
      subsection,
      order: order || 0,
      isActive: true,
      createdBy: userId,
    });

    res.status(201).json(content);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Update content
export const updateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const updates = req.body;

    const content = await SiteContent.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!content) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin: Delete content
export const deleteContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const content = await SiteContent.findById(id);
    if (!content) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    // Delete from storage if a path exists
    if (content.publicId) {
      try {
        await deleteObject(content.publicId);
      } catch (_storageErr) {
        // Storage deletion failed silently - content will still be removed from database
      }
    }

    await SiteContent.findByIdAndDelete(id);
    res.json({ message: 'Content deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

/** Container formats a browser will play directly from the CDN. */
const PLAYABLE_VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mp4', // .mov is H.264 in practice; served as mp4 it plays
};

/**
 * Admin: upload a site-content video.
 *
 * Bunny Edge Storage stores and serves the file as-is — unlike Cloudinary it
 * does not transcode, so a format browsers cannot play is rejected here rather
 * than silently stored and discovered broken on the page. (Bunny Stream is the
 * product that transcodes, if arbitrary uploads ever become a requirement.)
 */
export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const extension = PLAYABLE_VIDEO_TYPES[file.mimetype];
    if (!extension) {
      res.status(400).json({
        message: `Unsupported video format ${file.mimetype}. Upload an MP4 (H.264) or WebM file.`,
      });
      return;
    }

    const storagePath =
      `balkan-estate/site-content/how-it-works/` +
      `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${extension}`;

    await putObject(storagePath, file.buffer, extension === 'webm' ? 'video/webm' : 'video/mp4');

    res.json({
      url: buildBunnyUrl(storagePath),
      publicId: storagePath,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
