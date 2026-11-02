import { Request, Response } from 'express';
import { getNeighborhoodInsights as generateWithGemini } from '../services/geminiService';
import User from '../models/User';
import { apiLogger } from '../utils/logger';
import { parseInsightRequest, parseListingId } from '../utils/neighborhoodInsightValidation';
import { findSavedInsight, saveInsight } from '../services/savedNeighborhoodInsightService';
import {
  ensureCurrentWindow,
  hasReachedLimit,
  isSubscribedUser,
  resolveMonthlyLimit,
  toUsage,
} from '../services/neighborhoodInsightQuotaService';

const requesterId = (req: Request) => (req.user as { _id?: string } | undefined)?._id;

/**
 * POST /api/neighborhood-insights
 *
 * Returns the caller's saved insight for the listing when there is one (no AI
 * call, no quota); otherwise validates, checks the monthly limit, generates,
 * saves it for that user and counts it.
 */
export const getNeighborhoodInsights = async (req: Request, res: Response) => {
  try {
    const userId = requesterId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required to access neighborhood insights' });
    }

    const parsed = parseInsightRequest(req.body);
    if (parsed.ok === false) {
      return res.status(400).json({ message: parsed.message, field: parsed.field });
    }
    const { lat, lng, address, city, country, language, listingId } = parsed.value;

    // A saved insight is served before the AI-availability and quota checks.
    if (listingId) {
      const saved = await findSavedInsight(userId, listingId);
      if (saved) return res.status(200).json({ insights: saved, saved: true });
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return res.status(503).json({ message: 'AI service is temporarily unavailable. Please try again later.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const now = new Date();
    ensureCurrentWindow(user, now);
    const limit = await resolveMonthlyLimit(user);
    const usage = toUsage(user, limit);

    if (hasReachedLimit(usage.used, limit)) {
      const subscribed = isSubscribedUser(user);
      return res.status(429).json({
        message: `You have reached your monthly limit of ${limit} neighborhood insights. ${
          subscribed ? 'Your limit will reset next month.' : 'Upgrade to a premium plan for more insights.'
        }`,
        limit,
        used: usage.used,
        resetDate: usage.resetDate,
        isSubscribed: subscribed,
      });
    }

    let insights: string;
    try {
      insights = await generateWithGemini(lat, lng, address, city, country, language);
    } catch (error) {
      apiLogger.error('Error getting neighborhood insights:', error);
      return res.status(500).json({ message: 'Failed to generate neighborhood insights. Please try again later.' });
    }

    // Keeping it is best effort: a failed save must not lose the report the user just waited for.
    if (listingId) {
      try {
        await saveInsight(userId, listingId, insights, language);
      } catch (error) {
        apiLogger.error('Failed to save neighborhood insight:', error);
      }
    }

    user.neighborhoodInsights!.monthlyCount += 1;
    user.neighborhoodInsights!.lastUsed = now;
    await user.save();

    return res.status(200).json({ insights, usage: toUsage(user, limit) });
  } catch (error) {
    apiLogger.error('Error in getNeighborhoodInsights controller:', error);
    return res.status(500).json({ message: 'An error occurred while processing your request' });
  }
};

/** GET /api/neighborhood-insights/saved/:listingId — only the caller's own insight. */
export const getSavedInsight = async (req: Request, res: Response) => {
  try {
    const userId = requesterId(req);
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const listingId = parseListingId(req.params.listingId);
    if (!listingId) return res.status(400).json({ message: 'Invalid listingId' });

    return res.status(200).json({ insights: await findSavedInsight(userId, listingId) });
  } catch (error) {
    apiLogger.error('Error in getSavedInsight controller:', error);
    return res.status(500).json({ message: 'An error occurred while fetching the saved insight' });
  }
};

/** GET /api/neighborhood-insights/usage — the caller's monthly usage. */
export const getUsageStats = async (req: Request, res: Response) => {
  try {
    const userId = requesterId(req);
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    if (ensureCurrentWindow(user)) await user.save();

    const limit = await resolveMonthlyLimit(user);
    return res.status(200).json({ ...toUsage(user, limit), isSubscribed: isSubscribedUser(user) });
  } catch (error) {
    apiLogger.error('Error in getUsageStats controller:', error);
    return res.status(500).json({ message: 'An error occurred while fetching usage statistics' });
  }
};
