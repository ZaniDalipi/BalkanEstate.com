import { Request, Response } from 'express';
import SiteContent from '../models/SiteContent';
import cloudinary from '../config/cloudinary';

// Get all content for a section (public)
export const getContentBySection = async (req: Request, res: Response) => {
  try {
    const { section, subsection } = req.params;
    const query: any = { section, isActive: true };
    if (subsection) query.subsection = subsection;

    const content = await SiteContent.find(query)
      .sort({ order: 1 })
      .select('-createdBy -__v');

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
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
    res.status(500).json({ message: error.message });
  }
};

// Admin: Update content
export const updateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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
    res.status(500).json({ message: error.message });
  }
};

// Admin: Delete content
export const deleteContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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
    res.status(500).json({ message: error.message });
  }
};

// Admin: Upload showcase image to Cloudinary
export const uploadShowcaseImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'balkan-estate/site-content/showcase',
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good', fetch_format: 'auto' }
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(file.buffer);
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Admin: Upload video to Cloudinary
export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Upload to Cloudinary as video
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'balkan-estate/site-content/how-it-works',
          resource_type: 'video',
          eager: [
            { format: 'mp4', video_codec: 'h264' }
          ],
          eager_async: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(file.buffer);
    });

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
