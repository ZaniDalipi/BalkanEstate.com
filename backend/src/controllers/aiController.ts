import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import * as geminiService from '../services/geminiService';
import User from '../models/User';
import Product from '../models/Product';
import {
  FREE_TIER_LIMITS,
  PRO_TIER_LIMITS,
  ENTERPRISE_TIER_LIMITS,
  PRO_BUYER_LIMITS,
} from '../config/subscriptionConstants';
import { getRoomStyle } from '../data/roomStyles';
import { getRoomStyleUsageStats } from '../utils/roomStyleLimits';

function getNextMonthStart(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if the GOOGLE_AI_API_KEY is configured
 */
const isApiKeyConfigured = (): boolean => {
  return !!process.env.GOOGLE_AI_API_KEY;
};

/**
 * POST /api/ai/generate-description
 * Generate property description and analysis from uploaded images
 * Expects multipart form data with images and JSON body fields
 */
export const generateDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'At least one image is required.' });
      return;
    }

    // Enforce imageDescriptionLimit per plan
    const userId = (req.user as any)?._id;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        // Reset monthly counter if needed
        const now = new Date();
        if (!user.imageDescriptionUsage) {
          user.imageDescriptionUsage = { monthlyCount: 0, monthResetDate: getNextMonthStart() };
        }
        if (now >= user.imageDescriptionUsage.monthResetDate) {
          user.imageDescriptionUsage.monthlyCount = 0;
          user.imageDescriptionUsage.monthResetDate = getNextMonthStart();
        }

        // Get limit from product
        const isSubscribed = user.isSubscribed && user.hasActiveSubscription();
        if (isSubscribed && user.subscriptionPlan) {
          const product = await Product.findOne({ productId: user.subscriptionPlan });
          const rawLimit = product?.imageDescriptionLimit;
          const limit = typeof rawLimit === 'number' ? rawLimit : undefined;

          if (typeof limit === 'number' && limit !== -1) {
            const wouldExceed = user.imageDescriptionUsage.monthlyCount + files.length > limit;
            if (wouldExceed) {
              const remaining = Math.max(0, limit - user.imageDescriptionUsage.monthlyCount);
              res.status(429).json({
                message: `Auto-label limit reached. You can label ${remaining} more image${remaining === 1 ? '' : 's'} this month (limit: ${limit}/month).`,
                limit,
                used: user.imageDescriptionUsage.monthlyCount,
                remaining,
                resetDate: user.imageDescriptionUsage.monthResetDate,
              });
              return;
            }
          }

          // Count the images used
          if (typeof limit === 'number' && limit !== -1) {
            user.imageDescriptionUsage.monthlyCount += files.length;
            await user.save();
          }
        }
      }
    }

    const { language, propertyType } = req.body;

    if (!language || !propertyType) {
      res.status(400).json({ message: 'language and propertyType are required fields.' });
      return;
    }

    const validPropertyTypes = ['house', 'apartment', 'villa', 'land', 'other'];
    if (!validPropertyTypes.includes(propertyType)) {
      res.status(400).json({ message: `propertyType must be one of: ${validPropertyTypes.join(', ')}` });
      return;
    }

    // Parse location if provided (sent as JSON string in form data)
    let location: geminiService.LocationContext | undefined;
    if (req.body.location) {
      try {
        location = typeof req.body.location === 'string'
          ? JSON.parse(req.body.location)
          : req.body.location;
      } catch (_e) {
        res.status(400).json({ message: 'Invalid location JSON format.' });
        return;
      }
    }

    const images = files.map(f => f.buffer);
    const mimeTypes = files.map(f => f.mimetype);

    apiLogger.info(`Generating description from ${images.length} images for ${propertyType} in ${language}`);

    const result = await geminiService.generateDescriptionFromImages(
      images,
      mimeTypes,
      language,
      propertyType,
      location
    );

    res.json(result);
  } catch (error) {
    apiLogger.error('Error in generateDescription:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to generate property description. Please try again later.' });
  }
};

/**
 * POST /api/ai/calculate-distances
 * Calculate estimated distances from a property to key amenities
 */
export const calculateDistances = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const { address, city, country, lat, lng } = req.body;

    if (!address || !city || !country || lat === undefined || lng === undefined) {
      res.status(400).json({ message: 'address, city, country, lat, and lng are all required fields.' });
      return;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      res.status(400).json({ message: 'lat and lng must be numbers.' });
      return;
    }

    apiLogger.info(`Calculating distances for ${address}, ${city}, ${country}`);

    const result = await geminiService.calculatePropertyDistances(address, city, country, lat, lng);

    res.json(result);
  } catch (error) {
    apiLogger.error('Error in calculateDistances:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to calculate distances. Please try again later.' });
  }
};

/**
 * POST /api/ai/chat
 * Get AI chat response for the real estate assistant
 */
export const aiChat = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const { history, properties } = req.body;

    if (!history || !Array.isArray(history)) {
      res.status(400).json({ message: 'history is required and must be an array.' });
      return;
    }

    // Validate history entries have sender and text
    for (const msg of history) {
      if (!msg.sender || !msg.text) {
        res.status(400).json({ message: 'Each history entry must have sender and text fields.' });
        return;
      }
    }

    if (!properties || !Array.isArray(properties)) {
      res.status(400).json({ message: 'properties is required and must be an array.' });
      return;
    }

    // Enforce aiMessagesLimit per plan
    const userId = (req.user as any)?._id;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const now = new Date();
        if (!user.aiMessagesUsage) {
          user.aiMessagesUsage = { monthlyCount: 0, monthResetDate: getNextMonthStart() };
        }
        if (now >= user.aiMessagesUsage.monthResetDate) {
          user.aiMessagesUsage.monthlyCount = 0;
          user.aiMessagesUsage.monthResetDate = getNextMonthStart();
        }

        const isSubscribed = user.isSubscribed && user.hasActiveSubscription();
        let messageLimit: number = FREE_TIER_LIMITS.AI_MESSAGES; // Default for free users

        if (isSubscribed && user.subscriptionPlan) {
          const product = await Product.findOne({ productId: user.subscriptionPlan });
          const rawLimit = product?.aiMessagesLimit;
          const limit = typeof rawLimit === 'number' ? rawLimit : undefined;

          if (typeof limit === 'number') {
            messageLimit = limit;
          } else {
            // Product doesn't have aiMessagesLimit set - use plan-based defaults
            const plan = user.subscriptionPlan.toLowerCase();
            if (plan.includes('enterprise') || plan.includes('agency')) {
              messageLimit = ENTERPRISE_TIER_LIMITS.AI_MESSAGES;
            } else if (plan.includes('buyer')) {
              messageLimit = PRO_BUYER_LIMITS.AI_MESSAGES;
            } else if (plan.includes('yearly')) {
              messageLimit = PRO_TIER_LIMITS.YEARLY.AI_MESSAGES;
            } else if (plan.includes('monthly')) {
              messageLimit = PRO_TIER_LIMITS.MONTHLY.AI_MESSAGES;
            }
          }
        }

        // Enforce limit (-1 = unlimited, skip check)
        if (messageLimit !== -1) {
          if (user.aiMessagesUsage.monthlyCount >= messageLimit) {
            res.status(429).json({
              message: `AI message limit reached. You have used all ${messageLimit} messages for this month.`,
              limit: messageLimit,
              used: user.aiMessagesUsage.monthlyCount,
              remaining: 0,
              resetDate: user.aiMessagesUsage.monthResetDate,
            });
            return;
          }
          user.aiMessagesUsage.monthlyCount += 1;
          await user.save();
        }
      }
    }

    apiLogger.info(`Processing AI chat with ${history.length} messages and ${properties.length} properties`);

    const result = await geminiService.getAiChatResponse(history, properties);

    res.json(result);
  } catch (error) {
    apiLogger.error('Error in aiChat:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to get AI chat response. Please try again later.' });
  }
};

/**
 * POST /api/ai/restyle-room
 * Restyle a listing's room photo into a chosen interior design style.
 * Expects JSON body { imageUrl, style }. The image is fetched server-side
 * (restricted to Cloudinary) and sent to Gemini's image model.
 */
const MAX_RESTYLE_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_HOSTS = new Set(['res.cloudinary.com']);

export const restyleRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const { imageUrl, style } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      res.status(400).json({ message: 'imageUrl is required.' });
      return;
    }
    if (!style || typeof style !== 'string') {
      res.status(400).json({ message: 'style is required.' });
      return;
    }

    const styleDef = getRoomStyle(style);
    if (!styleDef) {
      res.status(400).json({ message: 'Unknown style.' });
      return;
    }

    // SSRF guard: only allow https Cloudinary image URLs (listing photos).
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      res.status(400).json({ message: 'Invalid imageUrl.' });
      return;
    }
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(parsedUrl.hostname)) {
      res.status(400).json({ message: 'imageUrl must be a Cloudinary https URL.' });
      return;
    }

    // Enforce roomStyle monthly limit. Resolve the limit from the user's REAL
    // account status (agency/pro/buyer via embedded subscription, Subscription
    // doc, proSubscription, or the isSubscribed flag) — not just `isSubscribed`,
    // so paying/agency users are never wrongly capped at the free tier.
    const userId = (req.user as any)?._id;
    let resolvedLimit: number = FREE_TIER_LIMITS.ROOM_STYLES;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const stats = await getRoomStyleUsageStats(user);
        resolvedLimit = stats.limit;

        // Enforce only when the plan is limited (-1 = unlimited).
        if (stats.limit !== -1 && stats.remaining <= 0) {
          res.status(429).json({
            message: `Room styler limit reached. You have used all ${stats.limit} restyles for this month.`,
            limit: stats.limit,
            used: stats.used,
            remaining: 0,
            resetDate: stats.resetDate,
          });
          return;
        }
      }
    }

    // Fetch the source image server-side.
    let imageBase64: string;
    let sourceMime: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const upstream = await fetch(imageUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'BalkanEstate/1.0 (+https://balkanestateai.com)' },
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        res.status(400).json({ message: 'Could not fetch the source image.' });
        return;
      }

      sourceMime = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!sourceMime.startsWith('image/')) {
        res.status(400).json({ message: 'imageUrl does not point to an image.' });
        return;
      }

      const arrayBuffer = await upstream.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_RESTYLE_IMAGE_BYTES) {
        res.status(400).json({ message: 'Source image is too large (max 10 MB).' });
        return;
      }
      imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    } catch (fetchErr) {
      apiLogger.error('Error fetching source image for restyle:', fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      res.status(400).json({ message: 'Could not fetch the source image.' });
      return;
    }

    apiLogger.info(`Restyling room image in "${styleDef.label}" style`);

    const result = await geminiService.restyleRoomImage(
      imageBase64,
      sourceMime,
      styleDef.id,
      styleDef.label,
      styleDef.prompt,
      styleDef.category === 'exterior' ? 'exterior' : 'interior'
    );

    // Count usage only on a successful generation, and only for limited plans.
    // Atomic $inc avoids a read-modify-write race between concurrent requests.
    if (userId && resolvedLimit !== -1) {
      await User.findByIdAndUpdate(userId, {
        $inc: { 'roomStyleUsage.monthlyCount': 1 },
      });
    }

    const imageDataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
    res.json({ imageDataUrl, style: styleDef.id });
  } catch (error) {
    apiLogger.error('Error in restyleRoom:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to restyle the room. Please try again later.' });
  }
};

/**
 * GET /api/ai/room-style/usage
 * Return the current user's room-styler usage + resolved monthly limit so the
 * client can render a usage meter and only show the upgrade prompt when the
 * user's REAL account status has actually run out (limit !== -1 && remaining 0).
 */
export const getRoomStyleUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.user as any)?._id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const stats = await getRoomStyleUsageStats(user);
    res.json({
      used: stats.used,
      limit: stats.limit,
      remaining: stats.remaining,
      resetDate: stats.resetDate,
      isPremium: stats.isPremium,
    });
  } catch (error) {
    apiLogger.error('Error in getRoomStyleUsage:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to load room styler usage.' });
  }
};

/**
 * POST /api/ai/generate-search-name
 * Generate a human-readable name for a saved search based on filters
 */
export const generateSearchName = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const { filters, lat, lng } = req.body;

    if (!filters || typeof filters !== 'object') {
      res.status(400).json({ message: 'filters is required and must be an object.' });
      return;
    }

    // If lat/lng provided (from generateSearchNameFromCoords fallback), generate location-based name
    if (typeof lat === 'number' && typeof lng === 'number') {
      apiLogger.info(`Generating search name from coordinates: ${lat}, ${lng}`);
      const name = await geminiService.generateSearchNameFromCoords(lat, lng);
      res.json({ name });
      return;
    }

    apiLogger.info('Generating search name from filters');

    const name = await geminiService.generateSearchName(filters);

    res.json({ name });
  } catch (error) {
    apiLogger.error('Error in generateSearchName:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to generate search name. Please try again later.' });
  }
};
