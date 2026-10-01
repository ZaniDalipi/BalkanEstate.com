import { Request, Response } from 'express';
import SiteContent from '../models/SiteContent';
import cloudinary from '../config/cloudinary';
import { getParam, getObjectIdParam } from '../utils/validateParams';
import { toYouTubeEmbedUrl, validateYouTubeLink } from '../utils/videoLinks';

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

/** Guides and FAQs carry no media; their url is a placeholder. */
const isVideoContent = (body: { contentType?: unknown; url?: unknown }): boolean =>
  body.contentType === 'video' || (body.contentType === undefined && body.url !== undefined && body.url !== 'placeholder');

// Admin: Create content
export const createContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, type, title, description, section, subsection, order } = req.body;
    let { url } = req.body;
    const userId = (req as any).user._id;

    // Videos are YouTube links only — nothing is uploaded to Cloudinary.
    if (isVideoContent(req.body)) {
      const check = validateYouTubeLink(url);
      if (!check.isValid) {
        res.status(400).json({ message: check.error });
        return;
      }
      url = toYouTubeEmbedUrl(url);
    }

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
    const updates = { ...req.body };
    // Never let an update point a record at an uploaded file.
    delete updates.publicId;

    if (updates.url !== undefined && isVideoContent(updates)) {
      const check = validateYouTubeLink(updates.url);
      if (!check.isValid) {
        res.status(400).json({ message: check.error });
        return;
      }
      updates.url = toYouTubeEmbedUrl(updates.url);
    }

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

    // Delete from Cloudinary if publicId exists
    if (content.publicId) {
      try {
        await cloudinary.uploader.destroy(content.publicId, {
          resource_type: content.type === 'video' ? 'video' : 'image'
        });
      } catch (_cloudErr) {
        // Cloudinary deletion failed silently - content will still be removed from database
      }
    }

    await SiteContent.findByIdAndDelete(id);
    res.json({ message: 'Content deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
