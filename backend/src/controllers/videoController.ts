import { Request, Response } from 'express';
import Property from '../models/Property';
import User, { IUser } from '../models/User';
import {
  generatePropertyVideo,
  startVideoGenerationJob,
  getVideoGenerationJobStatus,
  deleteGeneratedVideo,
  VideoGenerationOptions,
} from '../services/videoGenerationService';

/**
 * @desc    Generate video for a property (synchronous - for smaller videos)
 * @route   POST /api/videos/generate/:propertyId
 * @access  Private (property owner only)
 */
export const generateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);

    // Find property and verify ownership
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to generate video for this property' });
      return;
    }

    // Check if property has images
    if (!property.images || property.images.length === 0) {
      res.status(400).json({ message: 'Property must have at least one image to generate a video' });
      return;
    }

    // Get options from request body
    const {
      format = 'vertical',
      quality = 'mobile', // Default to mobile-optimized
      duration = 3,
      includeWatermark = true,
      musicStyle = 'elegant',
    } = req.body;

    // Validate format
    if (!['vertical', 'horizontal', 'square'].includes(format)) {
      res.status(400).json({ message: 'Invalid format. Must be vertical, horizontal, or square' });
      return;
    }

    // Validate quality
    if (!['standard', 'mobile'].includes(quality)) {
      res.status(400).json({ message: 'Invalid quality. Must be standard or mobile' });
      return;
    }

    // Validate duration
    if (duration < 2 || duration > 10) {
      res.status(400).json({ message: 'Duration must be between 2 and 10 seconds per image' });
      return;
    }

    // Prepare image URLs
    const imageUrls = property.images.map(img => img.url);

    // Get seller info
    const seller = await User.findById(property.sellerId);
    const sellerName = property.createdByName || seller?.name || '';
    const sellerPhone = seller?.phone || '';

    // Generate video options with full property details
    const options: VideoGenerationOptions = {
      propertyId: String(property._id),
      userId,
      imageUrls,
      title: property.title,
      price: property.price,
      city: property.city,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      sellerName,
      sellerPhone,
      format,
      quality,
      duration,
      includeWatermark,
      musicStyle,
    };

    console.log(`🎬 Starting video generation for property ${propertyId} by user ${userId} (quality: ${quality})`);

    // Generate video
    const result = await generatePropertyVideo(options);

    // Update property with generated video URL
    property.videoUrl = result.url;
    await property.save();

    console.log(`✅ Video generated successfully for property ${propertyId}`);

    res.status(200).json({
      message: 'Video generated successfully',
      video: result,
    });
  } catch (error: any) {
    console.error('❌ Video generation error:', error);
    res.status(500).json({
      message: 'Failed to generate video',
      error: error.message,
    });
  }
};

/**
 * @desc    Start async video generation job (for larger videos)
 * @route   POST /api/videos/generate-async/:propertyId
 * @access  Private (property owner only)
 */
export const startAsyncVideoGeneration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);

    // Find property and verify ownership
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to generate video for this property' });
      return;
    }

    // Check if property has images
    if (!property.images || property.images.length === 0) {
      res.status(400).json({ message: 'Property must have at least one image to generate a video' });
      return;
    }

    // Get options from request body
    const {
      format = 'vertical',
      quality = 'mobile', // Default to mobile-optimized
      duration = 3,
      includeWatermark = true,
      musicStyle = 'elegant',
    } = req.body;

    // Prepare image URLs
    const imageUrls = property.images.map(img => img.url);

    // Get seller info
    const seller = await User.findById(property.sellerId);
    const sellerName = property.createdByName || seller?.name || '';
    const sellerPhone = seller?.phone || '';

    // Generate video options with full property details
    const options: VideoGenerationOptions = {
      propertyId: String(property._id),
      userId,
      imageUrls,
      title: property.title,
      price: property.price,
      city: property.city,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      sellerName,
      sellerPhone,
      format,
      quality,
      duration,
      includeWatermark,
      musicStyle,
    };

    // Start async job
    const jobId = await startVideoGenerationJob(options);

    res.status(202).json({
      message: 'Video generation started',
      jobId,
      statusUrl: `/api/videos/status/${jobId}`,
    });
  } catch (error: any) {
    console.error('❌ Failed to start video generation:', error);
    res.status(500).json({
      message: 'Failed to start video generation',
      error: error.message,
    });
  }
};

/**
 * @desc    Get video generation job status
 * @route   GET /api/videos/status/:jobId
 * @access  Private
 */
export const getJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const job = getVideoGenerationJobStatus(jobId);

    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }

    res.status(200).json(job);
  } catch (error: any) {
    console.error('❌ Failed to get job status:', error);
    res.status(500).json({
      message: 'Failed to get job status',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete generated video
 * @route   DELETE /api/videos/:propertyId
 * @access  Private (property owner only)
 */
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);

    // Find property and verify ownership
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to delete video for this property' });
      return;
    }

    // If property has a generated video URL from Cloudinary, delete it
    if (property.videoUrl && property.videoUrl.includes('cloudinary')) {
      // Extract public_id from Cloudinary URL
      const urlParts = property.videoUrl.split('/');
      const versionIndex = urlParts.findIndex(part => part.startsWith('v') && !isNaN(parseInt(part.substring(1))));
      if (versionIndex !== -1) {
        const publicIdWithExtension = urlParts.slice(versionIndex + 1).join('/');
        const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ''); // Remove extension
        await deleteGeneratedVideo(publicId);
      }
    }

    // Clear video URL from property
    property.videoUrl = undefined;
    await property.save();

    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('❌ Failed to delete video:', error);
    res.status(500).json({
      message: 'Failed to delete video',
      error: error.message,
    });
  }
};

/**
 * @desc    Get video generation preview (estimate duration and size)
 * @route   GET /api/videos/preview/:propertyId
 * @access  Private (property owner only)
 */
export const getVideoPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);

    // Find property and verify ownership
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // Check if property has images
    if (!property.images || property.images.length === 0) {
      res.status(400).json({ message: 'Property must have at least one image' });
      return;
    }

    const { format = 'vertical', duration = '3' } = req.query;

    const imageCount = property.images.length;
    const durationNum = parseInt(duration as string) || 3;
    const transitionDuration = 0.5;

    // Calculate estimated video duration
    const estimatedDuration = (imageCount * durationNum) - ((imageCount - 1) * transitionDuration);

    // Estimate file size based on format and duration
    const bitrates: Record<string, number> = {
      vertical: 4000000, // 4 Mbps for 1080x1920
      horizontal: 4000000, // 4 Mbps for 1920x1080
      square: 3000000, // 3 Mbps for 1080x1080
    };

    const bitrate = bitrates[format as string] || bitrates.vertical;
    const estimatedSizeBytes = (estimatedDuration * bitrate) / 8;
    const estimatedSizeMB = Math.round(estimatedSizeBytes / (1024 * 1024) * 10) / 10;

    res.status(200).json({
      imageCount,
      estimatedDuration: Math.round(estimatedDuration * 10) / 10,
      estimatedSizeMB,
      formats: {
        vertical: { width: 1080, height: 1920, description: 'Perfect for Instagram Reels & TikTok' },
        horizontal: { width: 1920, height: 1080, description: 'Perfect for YouTube & websites' },
        square: { width: 1080, height: 1080, description: 'Perfect for Instagram feed' },
      },
      musicStyles: {
        elegant: 'Sophisticated piano - perfect for luxury properties',
        upbeat: 'Energetic corporate - great for modern homes',
        calm: 'Peaceful ambient - ideal for countryside properties',
        modern: 'Contemporary electronic - suits urban apartments',
      },
      existingVideo: property.videoUrl || null,
    });
  } catch (error: any) {
    console.error('❌ Failed to get video preview:', error);
    res.status(500).json({
      message: 'Failed to get video preview',
      error: error.message,
    });
  }
};
