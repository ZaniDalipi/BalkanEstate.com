import { Request, Response } from 'express';
import Analytics, { AnalyticsEventType, AnalyticsCategory } from '../models/Analytics';
import SubscriptionEvent from '../models/SubscriptionEvent';
import User from '../models/User';
import Property from '../models/Property';
import Inquiry from '../models/Inquiry';
import { apiLogger } from '../utils/logger';

// Simple user agent parser (no external dependency)
const parseUserAgent = (ua: string) => {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'MacOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS';

  return { deviceType, browser, os };
};

/**
 * Track an analytics event
 */
export const trackEvent = async (req: Request, res: Response) => {
  try {
    const {
      eventType,
      category,
      action,
      label,
      value,
      pagePath,
      pageTitle,
      referrer,
      targetType,
      targetId,
      metadata,
      sessionId,
    } = req.body;

    // Parse user agent
    const userAgent = req.headers['user-agent'] || '';
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Get IP and geo info (in production, use a geo-IP service)
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0] || '';

    const event = new Analytics({
      eventType,
      category,
      action,
      label,
      value,
      pagePath,
      pageTitle,
      referrer,
      targetType,
      targetId,
      metadata,
      sessionId,
      userId: (req as any).userId,
      userAgent,
      deviceType,
      browser,
      os,
      ipAddress,
      timestamp: new Date(),
    });

    await event.save();

    res.status(201).json({ success: true, eventId: event._id });
  } catch (error) {
    apiLogger.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
};

/**
 * Get activity log for admin dashboard
 */
export const getActivityLog = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      dateRange = 'week',
      eventType,
    } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Build query
    const query: any = { timestamp: { $gte: startDate } };
    if (category && category !== 'all') {
      query.category = category;
    }
    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, total] = await Promise.all([
      Analytics.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'name email role')
        .lean(),
      Analytics.countDocuments(query),
    ]);

    res.json({
      activities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    apiLogger.error('Error fetching activity log:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
};

/**
 * Get dashboard analytics summary
 */
export const getDashboardAnalytics = async (req: Request, res: Response) => {
  try {
    const { dateRange = 'week' } = req.query;

    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get current period stats
    const [
      subscriptionClicks,
      subscriptionCompletions,
      pageViews,
      newUsers,
      newProperties,
      newInquiries,
    ] = await Promise.all([
      Analytics.countDocuments({
        eventType: { $in: ['subscription_button_click', 'subscription_modal_opened'] },
        timestamp: { $gte: startDate },
      }),
      SubscriptionEvent.countDocuments({
        eventType: 'subscription_purchased',
        eventDate: { $gte: startDate },
      }),
      Analytics.countDocuments({
        eventType: 'page_view',
        timestamp: { $gte: startDate },
      }),
      User.countDocuments({
        createdAt: { $gte: startDate },
      }),
      Property.countDocuments({
        createdAt: { $gte: startDate },
      }),
      Inquiry.countDocuments({
        createdAt: { $gte: startDate },
      }),
    ]);

    // Get previous period stats for comparison
    const [
      prevSubscriptionClicks,
      prevSubscriptionCompletions,
      prevPageViews,
      prevNewUsers,
    ] = await Promise.all([
      Analytics.countDocuments({
        eventType: { $in: ['subscription_button_click', 'subscription_modal_opened'] },
        timestamp: { $gte: previousStartDate, $lt: startDate },
      }),
      SubscriptionEvent.countDocuments({
        eventType: 'subscription_purchased',
        eventDate: { $gte: previousStartDate, $lt: startDate },
      }),
      Analytics.countDocuments({
        eventType: 'page_view',
        timestamp: { $gte: previousStartDate, $lt: startDate },
      }),
      User.countDocuments({
        createdAt: { $gte: previousStartDate, $lt: startDate },
      }),
    ]);

    // Calculate conversion rate
    const conversionRate = subscriptionClicks > 0
      ? ((subscriptionCompletions / subscriptionClicks) * 100).toFixed(1)
      : 0;

    const prevConversionRate = prevSubscriptionClicks > 0
      ? ((prevSubscriptionCompletions / prevSubscriptionClicks) * 100).toFixed(1)
      : 0;

    // Calculate percentage changes
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    res.json({
      summary: {
        subscriptionClicks: {
          value: subscriptionClicks,
          change: calcChange(subscriptionClicks, prevSubscriptionClicks),
        },
        subscriptionCompletions: {
          value: subscriptionCompletions,
          change: calcChange(subscriptionCompletions, prevSubscriptionCompletions),
        },
        conversionRate: {
          value: conversionRate,
          change: (Number(conversionRate) - Number(prevConversionRate)).toFixed(1),
        },
        pageViews: {
          value: pageViews,
          change: calcChange(pageViews, prevPageViews),
        },
        newUsers: {
          value: newUsers,
          change: calcChange(newUsers, prevNewUsers),
        },
        newProperties,
        newInquiries,
      },
      dateRange,
    });
  } catch (error) {
    apiLogger.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

/**
 * Get page navigation heatmap data
 */
export const getNavigationHeatmap = async (req: Request, res: Response) => {
  try {
    const { dateRange = 'week' } = req.query;

    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get page view counts by path
    const pageViews = await Analytics.aggregate([
      {
        $match: {
          eventType: 'page_view',
          timestamp: { $gte: startDate },
          pagePath: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$pagePath',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $project: {
          path: '$_id',
          views: '$count',
          uniqueVisitors: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 20 },
    ]);

    // Get button click counts
    const buttonClicks = await Analytics.aggregate([
      {
        $match: {
          eventType: 'button_click',
          timestamp: { $gte: startDate },
          label: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { label: '$label', pagePath: '$pagePath' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          button: '$_id.label',
          page: '$_id.pagePath',
          clicks: '$count',
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 20 },
    ]);

    // Get user flow (common navigation paths)
    const userFlows = await Analytics.aggregate([
      {
        $match: {
          eventType: 'page_view',
          timestamp: { $gte: startDate },
          sessionId: { $exists: true, $ne: null },
        },
      },
      { $sort: { sessionId: 1, timestamp: 1 } },
      {
        $group: {
          _id: '$sessionId',
          pages: { $push: '$pagePath' },
        },
      },
      {
        $project: {
          flow: {
            $reduce: {
              input: { $slice: ['$pages', 5] }, // First 5 pages
              initialValue: '',
              in: {
                $cond: {
                  if: { $eq: ['$$value', ''] },
                  then: '$$this',
                  else: { $concat: ['$$value', ' → ', '$$this'] },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$flow',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get device breakdown
    const deviceBreakdown = await Analytics.aggregate([
      {
        $match: {
          eventType: 'page_view',
          timestamp: { $gte: startDate },
          deviceType: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$deviceType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get subscription funnel
    const subscriptionFunnel = await Promise.all([
      Analytics.countDocuments({
        eventType: 'page_view',
        pagePath: { $regex: /pricing/i },
        timestamp: { $gte: startDate },
      }),
      Analytics.countDocuments({
        eventType: 'subscription_button_click',
        timestamp: { $gte: startDate },
      }),
      Analytics.countDocuments({
        eventType: 'subscription_modal_opened',
        timestamp: { $gte: startDate },
      }),
      Analytics.countDocuments({
        eventType: 'subscription_checkout_started',
        timestamp: { $gte: startDate },
      }),
      SubscriptionEvent.countDocuments({
        eventType: 'subscription_purchased',
        eventDate: { $gte: startDate },
      }),
    ]);

    res.json({
      pageViews,
      buttonClicks,
      userFlows: userFlows.map(f => ({ flow: f._id, count: f.count })),
      deviceBreakdown: deviceBreakdown.reduce((acc, d) => {
        acc[d._id] = d.count;
        return acc;
      }, {} as Record<string, number>),
      subscriptionFunnel: {
        pricingPageViews: subscriptionFunnel[0],
        subscribeButtonClicks: subscriptionFunnel[1],
        modalOpened: subscriptionFunnel[2],
        checkoutStarted: subscriptionFunnel[3],
        completed: subscriptionFunnel[4],
      },
      dateRange,
    });
  } catch (error) {
    apiLogger.error('Error fetching navigation heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
};

/**
 * Get recent subscription events
 */
export const getRecentSubscriptions = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const events = await SubscriptionEvent.find({
      eventType: { $in: ['subscription_purchased', 'subscription_canceled', 'subscription_renewed'] },
    })
      .sort({ eventDate: -1 })
      .limit(Number(limit))
      .populate('userId', 'name email')
      .lean();

    res.json({ events });
  } catch (error) {
    apiLogger.error('Error fetching subscription events:', error);
    res.status(500).json({ error: 'Failed to fetch subscription events' });
  }
};

/**
 * Helper function to track events from server-side
 */
export const trackServerEvent = async (
  eventType: AnalyticsEventType,
  category: AnalyticsCategory,
  action: string,
  options?: {
    userId?: string;
    label?: string;
    value?: number;
    pagePath?: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
  }
) => {
  try {
    const event = new Analytics({
      eventType,
      category,
      action,
      ...options,
      timestamp: new Date(),
    });
    await event.save();
    return event._id;
  } catch (error) {
    apiLogger.error('Error tracking server event:', error);
    return null;
  }
};
