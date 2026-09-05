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
import { videoLogger } from '../utils/logger';
import { getParam, getObjectIdParam } from '../utils/validateParams';
import { storagePathFromUrl } from '../utils/bunnyUrl';

/**
 * @desc    Generate video for a property (synchronous - for smaller videos)
 * @route   POST /api/videos/generate/:propertyId
 * @access  Private (property owner only)
 */
export const generateVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = getObjectIdParam(req, res, 'propertyId');
    if (!propertyId) return;

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
      backgroundStyle = 'elegant', // Professional background style
      embedInListing = true, // Save video to property for auto-play on listing
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

    // Validate background style
    if (!['gradient', 'blur', 'dark', 'elegant'].includes(backgroundStyle)) {
      res.status(400).json({ message: 'Invalid background style. Must be gradient, blur, dark, or elegant' });
      return;
    }

    // Prepare image URLs
    const imageUrls = property.images.map(img => img.url);

    // Get seller info
    const seller = await User.findById(property.sellerId);
    const sellerName = property.createdByName || seller?.name || '';
    const sellerPhone = seller?.phone || '';
    const agencyName = seller?.agencyName || '';

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
      agencyName,
      format,
      quality,
      duration,
      includeWatermark,
      musicStyle,
      backgroundStyle,
      embedInListing,
    };

    videoLogger.info(`🎬 Starting video generation for property ${propertyId} by user ${userId} (quality: ${quality}, background: ${backgroundStyle})`);

    // Generate video
    const result = await generatePropertyVideo(options);

    // Update property with generated video information
    if (embedInListing) {
      // Save to generated video fields for auto-play in listing
      property.generatedVideoUrl = result.url;
      property.generatedVideoPublicId = result.publicId;
      property.generatedVideoFormat = format;
      property.generatedVideoDuration = result.duration;
      property.hasGeneratedVideo = true;
    }
    // Also store in videoUrl for backwards compatibility
    property.videoUrl = result.url;
    await property.save();

    videoLogger.info(`✅ Video generated successfully for property ${propertyId}`);

    res.status(200).json({
      message: 'Video generated successfully',
      video: result,
    });
  } catch (error: any) {
    videoLogger.error('❌ Video generation error:', error);
    res.status(500).json({
      message: 'Failed to generate video',
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
    const propertyId = getObjectIdParam(req, res, 'propertyId');
    if (!propertyId) return;

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
      backgroundStyle = 'elegant', // Professional background style
      embedInListing = true, // Save video to property for auto-play on listing
    } = req.body;

    // Prepare image URLs
    const imageUrls = property.images.map(img => img.url);

    // Get seller info
    const seller = await User.findById(property.sellerId);
    const sellerName = property.createdByName || seller?.name || '';
    const sellerPhone = seller?.phone || '';
    const agencyName = seller?.agencyName || '';

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
      agencyName,
      format,
      quality,
      duration,
      includeWatermark,
      musicStyle,
      backgroundStyle,
      embedInListing,
    };

    // Start async job
    const jobId = await startVideoGenerationJob(options);

    res.status(202).json({
      message: 'Video generation started',
      jobId,
      statusUrl: `/api/videos/status/${jobId}`,
    });
  } catch (error: any) {
    videoLogger.error('❌ Failed to start video generation:', error);
    res.status(500).json({
      message: 'Failed to start video generation',
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
    const jobId = getParam(req, 'jobId');

    const job = getVideoGenerationJobStatus(jobId);

    if (!job) {
      res.status(404).json({ message: 'Job not found' });
      return;
    }

    res.status(200).json(job);
  } catch (error: any) {
    videoLogger.error('❌ Failed to get job status:', error);
    res.status(500).json({
      message: 'Failed to get job status',
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
    const propertyId = getObjectIdParam(req, res, 'propertyId');
    if (!propertyId) return;

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

    // If property has a generated video with a storage path, delete the object
    if (property.generatedVideoPublicId) {
      await deleteGeneratedVideo(property.generatedVideoPublicId);
    } else {
      // Fallback for a row that kept only the URL: the storage path is simply
      // the URL's pathname, so it needs no parsing of version or transform
      // segments the way the Cloudinary form did. Returns '' — and so deletes
      // nothing — for a URL that is not ours.
      const storagePath = storagePathFromUrl(property.videoUrl || '');
      if (storagePath) {
        await deleteGeneratedVideo(storagePath);
      }
    }

    // Clear all video fields from property
    property.videoUrl = undefined;
    property.generatedVideoUrl = undefined;
    property.generatedVideoPublicId = undefined;
    property.generatedVideoFormat = undefined;
    property.generatedVideoDuration = undefined;
    property.hasGeneratedVideo = false;
    await property.save();

    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error: any) {
    videoLogger.error('❌ Failed to delete video:', error);
    res.status(500).json({
      message: 'Failed to delete video',
    });
  }
};

/**
 * @desc    Add generated video to listing (sets videoUrl, replacing YouTube/Instagram if present)
 * @route   PATCH /api/videos/:propertyId/add-to-listing
 * @access  Private (property owner only)
 */
export const addVideoToListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = getObjectIdParam(req, res, 'propertyId');
    if (!propertyId) return;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);

    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.sellerId.toString() !== userId) {
      res.status(403).json({ message: 'Not authorized to modify this property' });
      return;
    }

    // Use the generated video URL, or accept a videoUrl from the request body
    const videoUrl = req.body.videoUrl || property.generatedVideoUrl;
    if (!videoUrl) {
      res.status(400).json({ message: 'No generated video found. Generate a video first.' });
      return;
    }

    const previousVideoUrl = property.videoUrl;
    property.videoUrl = videoUrl;
    await property.save();

    videoLogger.info(`🎬 Added generated video to listing ${propertyId} (replaced: ${previousVideoUrl || 'none'})`);

    res.status(200).json({
      success: true,
      message: previousVideoUrl ? 'Video replaced on listing' : 'Video added to listing',
      videoUrl,
      previousVideoUrl: previousVideoUrl || null,
    });
  } catch (error: any) {
    videoLogger.error('❌ Failed to add video to listing:', error);
    res.status(500).json({ message: 'Failed to add video to listing' });
  }
};

/**
 * @desc    Resolve TikTok short link to get video ID and username
 * @route   POST /api/videos/resolve-tiktok-short-link
 * @access  Public (no auth required)
 */
export const resolveTikTokShortLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ message: 'Missing or invalid URL parameter' });
      return;
    }

    // Validate that it's a TikTok short link
    const shortLinkPatterns = [
      /v[mt]\.tiktok\.com\/([^\s/?#]+)/i, // vm.tiktok.com or vt.tiktok.com
      /tiktok\.com\/t\/([^\s/?#]+)/i, // tiktok.com/t/CODE
    ];

    const isShortLink = shortLinkPatterns.some(pattern => pattern.test(url));

    if (!isShortLink) {
      res.status(400).json({ message: 'Invalid TikTok short link format' });
      return;
    }

    try {
      // Follow the redirect to get the full URL
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://www.tiktok.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 200) {
        videoLogger.warn(`TikTok returned status ${response.status} for ${url}`);
      }

      const finalUrl = response.url;

      // Extract video ID and username from the full URL
      // Expected format: https://www.tiktok.com/@username/video/123456789
      const videoIdMatch = finalUrl.match(/\/video\/(\d+)/);
      const usernameMatch = finalUrl.match(/@([\w.-]+)\//);

      if (!videoIdMatch) {
        videoLogger.warn(`Could not extract video ID from resolved URL: ${finalUrl}`);
        res.status(400).json({ message: 'Could not extract video ID from TikTok link. The link may be invalid or expired.' });
        return;
      }

      const videoId = videoIdMatch[1];
      const username = usernameMatch ? usernameMatch[1] : '';

      videoLogger.info(`✅ Successfully resolved TikTok link: ${videoId}`);

      res.status(200).json({
        videoId,
        username,
        fullUrl: finalUrl,
      });
    } catch (fetchError: any) {
      videoLogger.error('Failed to follow TikTok redirect:', fetchError.message);
      res.status(502).json({
        message: 'Failed to resolve TikTok link. The link may be invalid, expired, or temporarily unavailable. Please try again in a few moments.',
        error: process.env.NODE_ENV === 'development' ? fetchError.message : undefined,
      });
    }
  } catch (error: any) {
    videoLogger.error('❌ Failed to resolve TikTok short link:', error);
    res.status(500).json({
      message: 'Failed to resolve TikTok short link',
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
    const propertyId = getObjectIdParam(req, res, 'propertyId');
    if (!propertyId) return;

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
      backgroundStyles: {
        gradient: 'Animated purple-blue gradient (Canva style)',
        blur: 'Blurred background effect',
        dark: 'Elegant dark background',
        elegant: 'Premium dark with gold accents (recommended)',
      },
      musicStyles: {
        elegant: 'Sophisticated piano - perfect for luxury properties',
        upbeat: 'Energetic corporate - great for modern homes',
        calm: 'Peaceful ambient - ideal for countryside properties',
        modern: 'Contemporary electronic - suits urban apartments',
      },
      existingVideo: property.videoUrl || null,
      generatedVideo: property.hasGeneratedVideo ? {
        url: property.generatedVideoUrl,
        format: property.generatedVideoFormat,
        duration: property.generatedVideoDuration,
      } : null,
    });
  } catch (error: any) {
    videoLogger.error('❌ Failed to get video preview:', error);
    res.status(500).json({
      message: 'Failed to get video preview',
    });
  }
};
