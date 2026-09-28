import { Request, Response } from 'express';
import Property from '../models/Property';
import User, { IUser } from '../models/User';
import { generatePropertyVideo, VideoGenerationOptions } from '../services/videoGenerationService';
import { videoLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';

const VIDEO_FORMATS = ['vertical', 'horizontal', 'square'] as const;
const VIDEO_QUALITIES = ['standard', 'mobile'] as const;
const MUSIC_STYLES = ['elegant', 'upbeat', 'calm', 'modern'] as const;
const BACKGROUND_STYLES = ['gradient', 'blur', 'dark', 'elegant'] as const;

type VideoRequestOptions = Pick<
  VideoGenerationOptions,
  'format' | 'quality' | 'duration' | 'includeWatermark' | 'musicStyle' | 'backgroundStyle'
>;

/** Validate the generator options from the request body. Never throws. */
export const validateVideoRequest = (
  body: Record<string, unknown> | undefined
): { isValid: true; value: VideoRequestOptions } | { isValid: false; error: string } => {
  const {
    format = 'vertical',
    quality = 'mobile',
    duration = 3,
    includeWatermark = true,
    musicStyle = 'elegant',
    backgroundStyle = 'elegant',
  } = body || {};

  if (!VIDEO_FORMATS.includes(format as never)) {
    return { isValid: false, error: 'Invalid format. Must be vertical, horizontal, or square' };
  }
  if (!VIDEO_QUALITIES.includes(quality as never)) {
    return { isValid: false, error: 'Invalid quality. Must be standard or mobile' };
  }
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 2 || duration > 10) {
    return { isValid: false, error: 'Duration must be between 2 and 10 seconds per image' };
  }
  if (!MUSIC_STYLES.includes(musicStyle as never)) {
    return { isValid: false, error: 'Invalid music style' };
  }
  if (!BACKGROUND_STYLES.includes(backgroundStyle as never)) {
    return { isValid: false, error: 'Invalid background style. Must be gradient, blur, dark, or elegant' };
  }
  if (typeof includeWatermark !== 'boolean') {
    return { isValid: false, error: 'includeWatermark must be true or false' };
  }

  return {
    isValid: true,
    value: {
      format: format as VideoRequestOptions['format'],
      quality: quality as VideoRequestOptions['quality'],
      duration,
      includeWatermark,
      musicStyle: musicStyle as VideoRequestOptions['musicStyle'],
      backgroundStyle: backgroundStyle as VideoRequestOptions['backgroundStyle'],
    },
  };
};

/** "Sea View Villa" → "sea-view-villa-video.mp4" */
const downloadName = (title: string | undefined): string => {
  const slug = (title || 'listing')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'listing'}-video.mp4`;
};

/**
 * @desc    Render a showcase video for a listing and send it as a download.
 *          Nothing is stored: the seller posts it to TikTok/YouTube/Instagram
 *          and pastes that link into the listing.
 * @route   POST /api/videos/generate/:propertyId
 * @access  Private (property owner only)
 */
export const generateVideo = async (req: Request, res: Response): Promise<void> => {
  let cleanup: (() => void) | undefined;

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
      res.status(403).json({ message: 'Not authorized to generate video for this property' });
      return;
    }
    if (!property.images || property.images.length === 0) {
      res.status(400).json({ message: 'Property must have at least one image to generate a video' });
      return;
    }

    const validation = validateVideoRequest(req.body);
    if (!validation.isValid) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const seller = await User.findById(property.sellerId);
    const options: VideoGenerationOptions = {
      propertyId: String(property._id),
      userId,
      imageUrls: property.images.map((img) => img.url),
      title: property.title,
      price: property.price,
      city: property.city,
      beds: property.beds,
      baths: property.baths,
      sqft: property.sqft,
      sellerName: property.createdByName || seller?.name || '',
      sellerPhone: seller?.phone || '',
      agencyName: seller?.agencyName || '',
      ...validation.value,
    };

    videoLogger.info(`🎬 Generating download video for property ${propertyId} (quality: ${options.quality})`);
    const result = await generatePropertyVideo(options);
    cleanup = result.cleanup;

    res.set('X-Video-Duration', String(result.duration));
    res.set('X-Video-Width', String(result.width));
    res.set('X-Video-Height', String(result.height));
    res.set('Access-Control-Expose-Headers', 'X-Video-Duration, X-Video-Width, X-Video-Height, Content-Disposition');
    res.set('Cache-Control', 'no-store');

    res.download(result.filePath, downloadName(property.title), (error) => {
      result.cleanup();
      if (error && !res.headersSent) {
        res.status(500).json({ message: 'Failed to send video' });
      } else if (error) {
        videoLogger.warn(`⚠️ Video download interrupted for ${propertyId}: ${error.message}`);
      }
    });
  } catch (error: any) {
    cleanup?.();
    videoLogger.error('❌ Video generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate video' });
    }
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
