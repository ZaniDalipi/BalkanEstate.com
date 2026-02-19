import { Request, Response } from 'express';
import { getNeighborhoodInsights as getNeighborhoodInsightsFromGemini } from '../services/geminiService';
import User from '../models/User';
import Product from '../models/Product';
import { apiLogger } from '../utils/logger';

// Usage limits
const FREE_USER_MONTHLY_LIMIT = 3; // Free users get 3 insights per month

/**
 * Get neighborhood insights for a property location
 * Requires authentication and enforces usage limits
 */
export const getNeighborhoodInsights = async (req: Request, res: Response) => {
  try {
    const { lat, lng, address, city, country, language } = req.body;

    // Validate required fields
    if (!lat || !lng || !address || !city || !country) {
      return res.status(400).json({
        message: 'Missing required fields: lat, lng, address, city, country',
      });
    }

    // Default to English if no language specified
    const responseLanguage = language || 'English';

    // Validate coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        message: 'Latitude and longitude must be numbers',
      });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        message: 'Invalid coordinates',
      });
    }

    // Get current user ID from JWT
    const currentUserId = (req.user as any)?._id;
    if (!currentUserId) {
      return res.status(401).json({
        message: 'Authentication required to access neighborhood insights',
      });
    }

    // Fetch full user document from database
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(401).json({
        message: 'User not found',
      });
    }

    // Initialize neighborhoodInsights if it doesn't exist
    if (!user.neighborhoodInsights) {
      user.neighborhoodInsights = {
        monthlyCount: 0,
        monthResetDate: getNextMonthStart(),
      };
    }

    // Check if we need to reset the monthly counter
    const now = new Date();
    if (now >= user.neighborhoodInsights.monthResetDate) {
      user.neighborhoodInsights.monthlyCount = 0;
      user.neighborhoodInsights.monthResetDate = getNextMonthStart();
    }

    // Determine usage limit based on subscription plan from DB
    const isSubscribed = user.isSubscribed && user.hasActiveSubscription();
    let monthlyLimit = FREE_USER_MONTHLY_LIMIT;
    if (isSubscribed && user.subscriptionPlan) {
      const product = await Product.findOne({ productId: user.subscriptionPlan });
      if (product && product.aiInsightsLimit === -1) {
        monthlyLimit = -1; // unlimited
      } else if (product && product.aiInsightsLimit > 0) {
        monthlyLimit = product.aiInsightsLimit;
      }
    }

    // Check if user has exceeded their monthly limit (-1 = unlimited, skip check)
    if (monthlyLimit !== -1 && user.neighborhoodInsights.monthlyCount >= monthlyLimit) {
      return res.status(429).json({
        message: `You have reached your monthly limit of ${monthlyLimit} neighborhood insights. ${isSubscribed ? 'Your limit will reset next month.' : 'Upgrade to a premium plan for more insights.'}`,
        limit: monthlyLimit,
        used: user.neighborhoodInsights.monthlyCount,
        resetDate: user.neighborhoodInsights.monthResetDate,
        isSubscribed,
      });
    }

    // Get insights from Gemini
    try {
      const insights = await getNeighborhoodInsightsFromGemini(
        Number(lat),
        Number(lng),
        String(address),
        String(city),
        String(country),
        responseLanguage
      );

      // Increment usage counter
      user.neighborhoodInsights.monthlyCount += 1;
      user.neighborhoodInsights.lastUsed = now;
      await user.save();

      return res.status(200).json({
        insights,
        usage: {
          used: user.neighborhoodInsights.monthlyCount,
          limit: monthlyLimit,
          resetDate: user.neighborhoodInsights.monthResetDate,
          remaining: monthlyLimit === -1 ? -1 : monthlyLimit - user.neighborhoodInsights.monthlyCount,
        },
      });
    } catch (error) {
      apiLogger.error('Error getting neighborhood insights:', error);
      return res.status(500).json({
        message: 'Failed to generate neighborhood insights. Please try again later.',
      });
    }
  } catch (error) {
    apiLogger.error('Error in getNeighborhoodInsights controller:', error);
    return res.status(500).json({
      message: 'An error occurred while processing your request',
    });
  }
};

/**
 * Get current usage statistics for the user
 */
export const getUsageStats = async (req: Request, res: Response) => {
  try {
    // Get current user ID from JWT
    const currentUserId = (req.user as any)?._id;
    if (!currentUserId) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    // Fetch full user document from database
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(401).json({
        message: 'User not found',
      });
    }

    // Initialize if doesn't exist
    if (!user.neighborhoodInsights) {
      user.neighborhoodInsights = {
        monthlyCount: 0,
        monthResetDate: getNextMonthStart(),
      };
      await user.save();
    }

    // Check if we need to reset
    const now = new Date();
    if (now >= user.neighborhoodInsights.monthResetDate) {
      user.neighborhoodInsights.monthlyCount = 0;
      user.neighborhoodInsights.monthResetDate = getNextMonthStart();
      await user.save();
    }

    const isSubscribed = user.isSubscribed && user.hasActiveSubscription();
    let monthlyLimit = FREE_USER_MONTHLY_LIMIT;
    if (isSubscribed && user.subscriptionPlan) {
      const product = await Product.findOne({ productId: user.subscriptionPlan });
      if (product && product.aiInsightsLimit === -1) {
        monthlyLimit = -1; // unlimited
      } else if (product && product.aiInsightsLimit > 0) {
        monthlyLimit = product.aiInsightsLimit;
      }
    }

    return res.status(200).json({
      used: user.neighborhoodInsights.monthlyCount,
      limit: monthlyLimit,
      resetDate: user.neighborhoodInsights.monthResetDate,
      remaining: monthlyLimit === -1 ? -1 : monthlyLimit - user.neighborhoodInsights.monthlyCount,
      isSubscribed,
    });
  } catch (error) {
    apiLogger.error('Error in getUsageStats controller:', error);
    return res.status(500).json({
      message: 'An error occurred while fetching usage statistics',
    });
  }
};

/**
 * Helper function to get the start of next month
 */
function getNextMonthStart(): Date {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth;
}
