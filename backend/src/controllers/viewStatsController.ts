import { Request, Response } from 'express';
import crypto from 'crypto';
import PageView, { EntityType } from '../models/PageView';
import Property from '../models/Property';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import { IUser } from '../models/User';
import { incrementViewCount } from '../utils/statsUpdater';
import { checkViewMilestone } from '../services/engagementService';

/**
 * Helper function to hash IP address for privacy
 */
const hashIP = (ip: string): string => {
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
};

/**
 * Helper function to detect device type from user agent
 */
const detectDeviceType = (userAgent: string): 'desktop' | 'mobile' | 'tablet' => {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

/**
 * Helper function to detect referrer type
 */
const detectReferrerType = (referrer: string): 'direct' | 'search' | 'social' | 'email' | 'other' => {
  if (!referrer) return 'direct';

  const lowerReferrer = referrer.toLowerCase();

  if (/google|bing|yahoo|duckduckgo|baidu|yandex/i.test(lowerReferrer)) {
    return 'search';
  }

  if (/facebook|twitter|instagram|linkedin|pinterest|tiktok|reddit/i.test(lowerReferrer)) {
    return 'social';
  }

  if (/mail|outlook|gmail|yahoo.*mail/i.test(lowerReferrer)) {
    return 'email';
  }

  return 'other';
};

/**
 * Check if a view is unique (not viewed in last 24 hours by same visitor)
 */
const isUniqueView = async (
  entityType: EntityType,
  entityId: string,
  viewerId?: string,
  ipHash?: string,
  sessionId?: string
): Promise<boolean> => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const query: any = {
    entityType,
    entityId,
    createdAt: { $gte: twentyFourHoursAgo },
  };

  if (viewerId) {
    query.viewerId = viewerId;
    const existingView = await PageView.findOne(query);
    if (existingView) return false;
  }

  if (ipHash) {
    delete query.viewerId;
    query.ipHash = ipHash;
    const existingView = await PageView.findOne(query);
    if (existingView) return false;
  }

  if (sessionId) {
    delete query.ipHash;
    query.sessionId = sessionId;
    const existingView = await PageView.findOne(query);
    if (existingView) return false;
  }

  return true;
};

/**
 * Find entity by type and ID - avoids TypeScript union type issues with Model.findById
 */
const findEntityById = async (entityType: EntityType, entityId: string): Promise<any> => {
  switch (entityType) {
    case 'property':
      return Property.findById(entityId);
    case 'agent':
      return Agent.findById(entityId);
    case 'agency':
      return Agency.findById(entityId);
    default:
      return null;
  }
};

/**
 * Check if user has premium analytics access
 */
const hasPremiumAnalytics = (user: IUser): boolean => {
  const tier = user.subscription?.tier || 'free';
  return ['pro', 'agency_owner', 'agency_agent'].includes(tier);
};

/**
 * Get subscription tier display info
 */
const getSubscriptionInfo = (user: IUser) => {
  const tier = user.subscription?.tier || 'free';
  return {
    tier,
    isPremium: hasPremiumAnalytics(user),
    canAccessDetailedStats: hasPremiumAnalytics(user),
    canAccessReports: hasPremiumAnalytics(user),
    canAccessInsights: hasPremiumAnalytics(user),
  };
};

// @desc    Record a page view
// @route   POST /api/view-stats/track
// @access  Public
export const trackView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, sessionId, referrer, duration } = req.body;

    if (!entityType || !entityId) {
      res.status(400).json({ message: 'entityType and entityId are required' });
      return;
    }

    if (!['property', 'agent', 'agency'].includes(entityType)) {
      res.status(400).json({ message: 'Invalid entityType' });
      return;
    }

    const viewerId = req.user ? String((req.user as IUser)._id) : undefined;
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '';
    const ipHash = hashIP(ip);
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = detectDeviceType(userAgent);
    const referrerType = detectReferrerType(referrer);

    const isUnique = await isUniqueView(entityType, entityId, viewerId, ipHash, sessionId);

    const pageView = await PageView.create({
      entityType,
      entityId,
      viewerId,
      sessionId,
      ipHash,
      userAgent,
      deviceType,
      referrer,
      referrerType,
      duration: duration || 0,
      isUnique,
    });

    const entity = await findEntityById(entityType, entityId);
    if (entity) {
      entity.views = (entity.views || 0) + 1;

      if (!entity.viewStats) {
        entity.viewStats = {
          totalViews: 0,
          uniqueViews: 0,
          viewsThisWeek: 0,
          viewsThisMonth: 0,
          viewsLastMonth: 0,
          inquiriesFromViews: 0,
          conversionRate: 0,
        };
      }

      entity.viewStats.totalViews = (entity.viewStats.totalViews || 0) + 1;
      if (isUnique) {
        entity.viewStats.uniqueViews = (entity.viewStats.uniqueViews || 0) + 1;
      }
      entity.viewStats.lastViewedAt = new Date();

      await entity.save();

      if (entityType === 'property' && entity.sellerId) {
        await incrementViewCount(String(entity.sellerId));

        // Check for view milestones and send engagement notifications
        // This runs async in the background to not block the response
        checkViewMilestone(
          entityId,
          entity.views,
          entity.isPromoted || false
        ).catch((err) => console.error('Milestone check error:', err));
      }
    }

    res.status(201).json({
      success: true,
      isUnique,
      viewId: pageView._id,
    });
  } catch (error: any) {
    console.error('Track view error:', error);
    res.status(500).json({ message: 'Error tracking view', error: error.message });
  }
};

// @desc    Update view duration (called when user leaves page)
// @route   PATCH /api/view-stats/:viewId/duration
// @access  Public
export const updateViewDuration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { viewId } = req.params;
    const { duration } = req.body;

    if (!duration || typeof duration !== 'number') {
      res.status(400).json({ message: 'Valid duration is required' });
      return;
    }

    await PageView.findByIdAndUpdate(viewId, { duration });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Update view duration error:', error);
    res.status(500).json({ message: 'Error updating duration', error: error.message });
  }
};

// @desc    Get view statistics for an entity (with subscription gating)
// @route   GET /api/view-stats/:entityType/:entityId
// @access  Private (owner only)
export const getEntityStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    const { period = '30d' } = req.query;

    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const subscriptionInfo = getSubscriptionInfo(currentUser);

    if (!['property', 'agent', 'agency'].includes(entityType)) {
      res.status(400).json({ message: 'Invalid entityType' });
      return;
    }

    const entity = await findEntityById(entityType as EntityType, entityId);
    if (!entity) {
      res.status(404).json({ message: 'Entity not found' });
      return;
    }

    const userId = String(currentUser._id);
    let isOwner = false;

    if (entityType === 'property') {
      isOwner = String(entity.sellerId) === userId;
    } else if (entityType === 'agent') {
      isOwner = String(entity.userId) === userId;
    } else if (entityType === 'agency') {
      isOwner = String(entity.ownerId) === userId ||
        (entity.admins && entity.admins.some((a: any) => String(a) === userId));
    }

    if (!isOwner) {
      res.status(403).json({ message: 'Not authorized to view these statistics' });
      return;
    }

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const basicStats = await PageView.aggregate([
      {
        $match: {
          entityType,
          entityId: entity._id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          uniqueViews: { $sum: { $cond: ['$isUnique', 1, 0] } },
        },
      },
    ]);

    // For FREE users, return only basic view count
    if (!subscriptionInfo.isPremium) {
      res.json({
        entityType,
        entityId,
        period,
        subscriptionInfo,
        stats: {
          totalViews: basicStats[0]?.totalViews || entity.views || 0,
          uniqueViews: basicStats[0]?.uniqueViews || 0,
        },
        isLimited: true,
        upgradeMessage: 'Upgrade to Pro to access detailed analytics, traffic sources, device breakdown, and daily trends.',
      });
      return;
    }

    // Full stats for PREMIUM users
    const viewStats = await PageView.aggregate([
      {
        $match: {
          entityType,
          entityId: entity._id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          uniqueViews: { $sum: { $cond: ['$isUnique', 1, 0] } },
          avgDuration: { $avg: '$duration' },
          desktopViews: { $sum: { $cond: [{ $eq: ['$deviceType', 'desktop'] }, 1, 0] } },
          mobileViews: { $sum: { $cond: [{ $eq: ['$deviceType', 'mobile'] }, 1, 0] } },
          tabletViews: { $sum: { $cond: [{ $eq: ['$deviceType', 'tablet'] }, 1, 0] } },
          directTraffic: { $sum: { $cond: [{ $eq: ['$referrerType', 'direct'] }, 1, 0] } },
          searchTraffic: { $sum: { $cond: [{ $eq: ['$referrerType', 'search'] }, 1, 0] } },
          socialTraffic: { $sum: { $cond: [{ $eq: ['$referrerType', 'social'] }, 1, 0] } },
          emailTraffic: { $sum: { $cond: [{ $eq: ['$referrerType', 'email'] }, 1, 0] } },
          otherTraffic: { $sum: { $cond: [{ $eq: ['$referrerType', 'other'] }, 1, 0] } },
        },
      },
    ]);

    const dailyViews = await PageView.aggregate([
      {
        $match: {
          entityType,
          entityId: entity._id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          views: { $sum: 1 },
          uniqueViews: { $sum: { $cond: ['$isUnique', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyDistribution = await PageView.aggregate([
      {
        $match: {
          entityType,
          entityId: entity._id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          views: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topReferrers = await PageView.aggregate([
      {
        $match: {
          entityType,
          entityId: entity._id,
          createdAt: { $gte: startDate, $lte: endDate },
          referrer: { $exists: true, $ne: '' },
        },
      },
      {
        $group: {
          _id: '$referrer',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const stats = viewStats[0] || {
      totalViews: 0,
      uniqueViews: 0,
      avgDuration: 0,
      desktopViews: 0,
      mobileViews: 0,
      tabletViews: 0,
      directTraffic: 0,
      searchTraffic: 0,
      socialTraffic: 0,
      emailTraffic: 0,
      otherTraffic: 0,
    };

    res.json({
      entityType,
      entityId,
      period,
      subscriptionInfo,
      stats: {
        ...stats,
        deviceBreakdown: {
          desktop: stats.desktopViews,
          mobile: stats.mobileViews,
          tablet: stats.tabletViews,
        },
        trafficSources: {
          direct: stats.directTraffic,
          search: stats.searchTraffic,
          social: stats.socialTraffic,
          email: stats.emailTraffic,
          other: stats.otherTraffic,
        },
      },
      dailyViews,
      hourlyDistribution,
      topReferrers,
      entityViewStats: entity.viewStats || {
        totalViews: entity.views || 0,
        uniqueViews: 0,
      },
      isLimited: false,
    });
  } catch (error: any) {
    console.error('Get entity stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};

/**
 * Generate smart insights for properties
 */
function generatePropertyInsights(propertiesStats: any[]): any[] {
  const insights: any[] = [];

  if (propertiesStats.length === 0) return insights;

  const avgViews = propertiesStats.reduce((sum, p) => sum + p.periodViews, 0) / propertiesStats.length;
  const promotedProperties = propertiesStats.filter((p) => p.isPromoted);
  const nonPromotedProperties = propertiesStats.filter((p) => !p.isPromoted);

  // Insight 1: Promotion effectiveness
  if (promotedProperties.length > 0 && nonPromotedProperties.length > 0) {
    const promotedAvg = promotedProperties.reduce((sum, p) => sum + p.periodViews, 0) / promotedProperties.length;
    const nonPromotedAvg = nonPromotedProperties.reduce((sum, p) => sum + p.periodViews, 0) / nonPromotedProperties.length;

    if (promotedAvg > nonPromotedAvg && nonPromotedAvg > 0) {
      const multiplier = (promotedAvg / nonPromotedAvg).toFixed(1);
      insights.push({
        type: 'promotion_success',
        icon: 'sparkles',
        title: 'Promotions are working!',
        message: `Your promoted listings get ${multiplier}x more views than non-promoted ones.`,
        priority: 'success',
      });
    }
  }

  // Insight 2: Underperforming listings that could benefit from promotion
  const underperformers = propertiesStats
    .filter((p) => !p.isPromoted && p.periodViews < avgViews * 0.5 && p.status === 'active')
    .slice(0, 3);

  if (underperformers.length > 0) {
    insights.push({
      type: 'promote_suggestion',
      icon: 'trending-up',
      title: 'Boost these listings',
      message: `${underperformers.length} listing(s) are getting fewer views than average. Consider promoting them to increase visibility.`,
      priority: 'warning',
      properties: underperformers.map((p) => ({
        id: p.propertyId,
        title: p.title,
        views: p.periodViews,
      })),
    });
  }

  // Insight 3: Top performer recognition
  const topPerformer = propertiesStats.reduce((max, p) =>
    p.periodViews > (max?.periodViews || 0) ? p : max, null);

  if (topPerformer && topPerformer.periodViews > avgViews * 2) {
    insights.push({
      type: 'top_performer',
      icon: 'trophy',
      title: 'Star listing!',
      message: `"${topPerformer.title}" is your top performer with ${topPerformer.periodViews} views - ${(topPerformer.periodViews / avgViews).toFixed(1)}x above average!`,
      priority: 'success',
      propertyId: topPerformer.propertyId,
    });
  }

  // Insight 4: No views warning
  const noViewsProperties = propertiesStats.filter((p) => p.periodViews === 0 && p.status === 'active');
  if (noViewsProperties.length > 0) {
    insights.push({
      type: 'no_views_warning',
      icon: 'exclamation',
      title: 'Listings need attention',
      message: `${noViewsProperties.length} active listing(s) received no views in this period. Consider updating photos or descriptions.`,
      priority: 'error',
      properties: noViewsProperties.slice(0, 5).map((p) => ({
        id: p.propertyId,
        title: p.title,
      })),
    });
  }

  // Insight 5: Price vs Views correlation hint
  const activeProps = propertiesStats.filter((p) => p.status === 'active' && p.price);
  if (activeProps.length >= 3) {
    const sortedByPrice = [...activeProps].sort((a, b) => a.price - b.price);
    const cheapHalf = sortedByPrice.slice(0, Math.floor(sortedByPrice.length / 2));
    const expensiveHalf = sortedByPrice.slice(Math.floor(sortedByPrice.length / 2));

    const cheapAvgViews = cheapHalf.reduce((sum, p) => sum + p.periodViews, 0) / cheapHalf.length;
    const expensiveAvgViews = expensiveHalf.reduce((sum, p) => sum + p.periodViews, 0) / expensiveHalf.length;

    if (cheapAvgViews > expensiveAvgViews * 1.5) {
      insights.push({
        type: 'price_insight',
        icon: 'currency',
        title: 'Price affects visibility',
        message: 'Lower-priced listings are getting more attention. Consider competitive pricing for better engagement.',
        priority: 'info',
      });
    }
  }

  return insights;
}

// @desc    Get aggregated stats for user's properties with insights
// @route   GET /api/view-stats/my-properties
// @access  Private
export const getMyPropertiesStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);
    const { period = '30d' } = req.query;
    const subscriptionInfo = getSubscriptionInfo(currentUser);

    const properties = await Property.find({ sellerId: userId }).select('_id title views viewStats status isPromoted promotionTier price createdAt');

    if (properties.length === 0) {
      res.json({
        totalProperties: 0,
        totalViews: 0,
        uniqueViews: 0,
        propertiesStats: [],
        insights: [],
        subscriptionInfo,
      });
      return;
    }

    let startDate: Date;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const propertyIds = properties.map((p) => p._id);

    const aggregatedStats = await PageView.aggregate([
      {
        $match: {
          entityType: 'property',
          entityId: { $in: propertyIds },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$entityId',
          views: { $sum: 1 },
          uniqueViews: { $sum: { $cond: ['$isUnique', 1, 0] } },
          avgDuration: { $avg: '$duration' },
        },
      },
    ]);

    const statsMap = new Map(aggregatedStats.map((s) => [String(s._id), s]));

    const propertiesStats = properties.map((p: any) => {
      const stats = statsMap.get(String(p._id)) || { views: 0, uniqueViews: 0, avgDuration: 0 };
      return {
        propertyId: p._id,
        title: p.title || 'Untitled Property',
        status: p.status,
        isPromoted: p.isPromoted,
        promotionTier: p.promotionTier,
        price: p.price,
        createdAt: p.createdAt,
        totalViews: p.views || 0,
        periodViews: stats.views,
        periodUniqueViews: stats.uniqueViews,
        avgDuration: Math.round(stats.avgDuration || 0),
      };
    });

    const totalViews = propertiesStats.reduce((sum, p) => sum + p.periodViews, 0);
    const totalUniqueViews = propertiesStats.reduce((sum, p) => sum + p.periodUniqueViews, 0);

    // For FREE users, return basic stats only
    if (!subscriptionInfo.isPremium) {
      res.json({
        period,
        totalProperties: properties.length,
        totalViews,
        uniqueViews: totalUniqueViews,
        propertiesStats: propertiesStats.map((p) => ({
          propertyId: p.propertyId,
          title: p.title,
          totalViews: p.totalViews,
          periodViews: p.periodViews,
        })),
        subscriptionInfo,
        isLimited: true,
        upgradeMessage: 'Upgrade to Pro to access smart insights, property comparisons, and promotion recommendations.',
      });
      return;
    }

    // Generate insights for PREMIUM users
    const insights = generatePropertyInsights(propertiesStats);
    const sortedByViews = [...propertiesStats].sort((a, b) => b.periodViews - a.periodViews);

    res.json({
      period,
      totalProperties: properties.length,
      totalViews,
      uniqueViews: totalUniqueViews,
      avgViewsPerProperty: properties.length > 0 ? Math.round(totalViews / properties.length) : 0,
      propertiesStats: sortedByViews,
      insights,
      topPerformers: sortedByViews.slice(0, 3),
      underperformers: sortedByViews.filter((p) => p.status === 'active').slice(-3).reverse(),
      subscriptionInfo,
      isLimited: false,
    });
  } catch (error: any) {
    console.error('Get my properties stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};

// @desc    Get agent's view stats
// @route   GET /api/view-stats/my-agent-profile
// @access  Private
export const getMyAgentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const agent = await Agent.findOne({ userId });
    if (!agent) {
      res.status(404).json({ message: 'Agent profile not found' });
      return;
    }

    req.params.entityType = 'agent';
    req.params.entityId = String(agent._id);
    return getEntityStats(req, res);
  } catch (error: any) {
    console.error('Get my agent stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};

// @desc    Get agency's view stats
// @route   GET /api/view-stats/my-agency
// @access  Private (agency owner/admin only)
export const getMyAgencyStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const agency = await Agency.findOne({
      $or: [{ ownerId: userId }, { admins: userId }],
    });

    if (!agency) {
      res.status(404).json({ message: 'Agency not found or not authorized' });
      return;
    }

    req.params.entityType = 'agency';
    req.params.entityId = String(agency._id);
    return getEntityStats(req, res);
  } catch (error: any) {
    console.error('Get my agency stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};

// @desc    Get comparison stats (for dashboard)
// @route   GET /api/view-stats/comparison
// @access  Private
export const getComparisonStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);
    const subscriptionInfo = getSubscriptionInfo(currentUser);

    const now = new Date();
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const properties = await Property.find({ sellerId: userId }).select('_id');
    const propertyIds = properties.map((p) => p._id);

    const thisWeekViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: thisWeekStart },
    });

    const lastWeekViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: lastWeekStart, $lt: thisWeekStart },
    });

    const thisMonthViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: thisMonthStart },
    });

    const lastMonthViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: lastMonthStart, $lt: thisMonthStart },
    });

    const weeklyChange = lastWeekViews > 0
      ? Math.round(((thisWeekViews - lastWeekViews) / lastWeekViews) * 100)
      : thisWeekViews > 0 ? 100 : 0;

    const monthlyChange = lastMonthViews > 0
      ? Math.round(((thisMonthViews - lastMonthViews) / lastMonthViews) * 100)
      : thisMonthViews > 0 ? 100 : 0;

    if (subscriptionInfo.isPremium) {
      const thisWeekUnique = await PageView.countDocuments({
        entityType: 'property',
        entityId: { $in: propertyIds },
        createdAt: { $gte: thisWeekStart },
        isUnique: true,
      });

      const thisMonthUnique = await PageView.countDocuments({
        entityType: 'property',
        entityId: { $in: propertyIds },
        createdAt: { $gte: thisMonthStart },
        isUnique: true,
      });

      res.json({
        thisWeek: { views: thisWeekViews, uniqueViews: thisWeekUnique, change: weeklyChange },
        lastWeek: { views: lastWeekViews },
        thisMonth: { views: thisMonthViews, uniqueViews: thisMonthUnique, change: monthlyChange },
        lastMonth: { views: lastMonthViews },
        subscriptionInfo,
        isLimited: false,
      });
    } else {
      res.json({
        thisWeek: { views: thisWeekViews, change: weeklyChange },
        lastWeek: { views: lastWeekViews },
        thisMonth: { views: thisMonthViews, change: monthlyChange },
        lastMonth: { views: lastMonthViews },
        subscriptionInfo,
        isLimited: true,
      });
    }
  } catch (error: any) {
    console.error('Get comparison stats error:', error);
    res.status(500).json({ message: 'Error fetching comparison', error: error.message });
  }
};

// @desc    Generate analytics report (PDF/CSV)
// @route   GET /api/view-stats/report
// @access  Private (Premium only)
export const generateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const subscriptionInfo = getSubscriptionInfo(currentUser);

    if (!subscriptionInfo.isPremium) {
      res.status(403).json({
        message: 'Report generation is a premium feature',
        upgradeRequired: true,
        subscriptionInfo,
      });
      return;
    }

    const userId = String(currentUser._id);
    const { period = '30d', format = 'json' } = req.query;

    let startDate: Date;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const properties = await Property.find({ sellerId: userId });
    const propertyIds = properties.map((p) => p._id);

    const viewStats = await PageView.aggregate([
      {
        $match: {
          entityType: 'property',
          entityId: { $in: propertyIds },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$entityId',
          totalViews: { $sum: 1 },
          uniqueViews: { $sum: { $cond: ['$isUnique', 1, 0] } },
          avgDuration: { $avg: '$duration' },
          desktopViews: { $sum: { $cond: [{ $eq: ['$deviceType', 'desktop'] }, 1, 0] } },
          mobileViews: { $sum: { $cond: [{ $eq: ['$deviceType', 'mobile'] }, 1, 0] } },
          tabletViews: { $sum: { $cond: [{ $eq: ['$deviceType', 'tablet'] }, 1, 0] } },
          directTraffic: { $sum: { $cond: [{ $eq: ['$referrerType', 'direct'] }, 1, 0] } },
          searchTraffic: { $sum: { $cond: [{ $eq: ['$referrerType', 'search'] }, 1, 0] } },
          socialTraffic: { $sum: { $cond: [{ $eq: ['$referrerType', 'social'] }, 1, 0] } },
        },
      },
    ]);

    const dailyStats = await PageView.aggregate([
      {
        $match: {
          entityType: 'property',
          entityId: { $in: propertyIds },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          views: { $sum: 1 },
          uniqueViews: { $sum: { $cond: ['$isUnique', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const statsMap = new Map(viewStats.map((s) => [String(s._id), s]));
    const propertyReports = properties.map((p: any) => {
      const stats = statsMap.get(String(p._id)) || {};
      return {
        id: p._id,
        title: p.title || 'Untitled',
        address: p.address,
        city: p.city,
        price: p.price,
        status: p.status,
        isPromoted: p.isPromoted,
        promotionTier: p.promotionTier,
        totalViews: stats.totalViews || 0,
        uniqueViews: stats.uniqueViews || 0,
        avgDuration: Math.round(stats.avgDuration || 0),
        deviceBreakdown: {
          desktop: stats.desktopViews || 0,
          mobile: stats.mobileViews || 0,
          tablet: stats.tabletViews || 0,
        },
        trafficSources: {
          direct: stats.directTraffic || 0,
          search: stats.searchTraffic || 0,
          social: stats.socialTraffic || 0,
        },
      };
    });

    const summary = {
      period: period,
      generatedAt: new Date().toISOString(),
      totalProperties: properties.length,
      activeProperties: properties.filter((p: any) => p.status === 'active').length,
      promotedProperties: properties.filter((p: any) => p.isPromoted).length,
      totalViews: propertyReports.reduce((sum, p) => sum + p.totalViews, 0),
      totalUniqueViews: propertyReports.reduce((sum, p) => sum + p.uniqueViews, 0),
      avgViewsPerProperty: propertyReports.length > 0
        ? Math.round(propertyReports.reduce((sum, p) => sum + p.totalViews, 0) / propertyReports.length)
        : 0,
    };

    if (format === 'csv') {
      // Format price with currency
      const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(price);
      };

      // Format date
      const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      // Build CSV with summary section
      const csvLines: string[] = [];

      // Report Header
      csvLines.push('BALKAN ESTATE - ANALYTICS REPORT');
      csvLines.push('');
      csvLines.push(`Report Period,${period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : period === '90d' ? 'Last 90 Days' : 'All Time'}`);
      csvLines.push(`Generated On,${formatDate(summary.generatedAt)}`);
      csvLines.push('');

      // Summary Section
      csvLines.push('SUMMARY');
      csvLines.push(`Total Properties,${summary.totalProperties}`);
      csvLines.push(`Active Properties,${summary.activeProperties}`);
      csvLines.push(`Promoted Properties,${summary.promotedProperties}`);
      csvLines.push(`Total Views,${summary.totalViews.toLocaleString()}`);
      csvLines.push(`Unique Views,${summary.totalUniqueViews.toLocaleString()}`);
      csvLines.push(`Average Views per Property,${summary.avgViewsPerProperty}`);
      csvLines.push('');

      // Properties Table
      csvLines.push('PROPERTY DETAILS');
      csvLines.push('Property Title,Address,City,Price,Status,Promoted,Total Views,Unique Views,Avg Duration,Desktop %,Mobile %,Tablet %,Direct %,Search %,Social %');

      // Property rows with formatted data
      propertyReports.forEach((p) => {
        const deviceTotal = p.deviceBreakdown.desktop + p.deviceBreakdown.mobile + p.deviceBreakdown.tablet || 1;
        const trafficTotal = p.trafficSources.direct + p.trafficSources.search + p.trafficSources.social || 1;

        const row = [
          `"${p.title.replace(/"/g, '""')}"`, // Escape quotes in title
          `"${(p.address || '').replace(/"/g, '""')}"`,
          `"${(p.city || '').replace(/"/g, '""')}"`,
          formatPrice(p.price),
          p.status === 'active' ? 'Active' : p.status === 'sold' ? 'Sold' : p.status,
          p.isPromoted ? 'Yes' : 'No',
          p.totalViews.toLocaleString(),
          p.uniqueViews.toLocaleString(),
          `${p.avgDuration}s`,
          `${Math.round((p.deviceBreakdown.desktop / deviceTotal) * 100)}%`,
          `${Math.round((p.deviceBreakdown.mobile / deviceTotal) * 100)}%`,
          `${Math.round((p.deviceBreakdown.tablet / deviceTotal) * 100)}%`,
          `${Math.round((p.trafficSources.direct / trafficTotal) * 100)}%`,
          `${Math.round((p.trafficSources.search / trafficTotal) * 100)}%`,
          `${Math.round((p.trafficSources.social / trafficTotal) * 100)}%`,
        ];
        csvLines.push(row.join(','));
      });

      // Totals row
      const totalDevice = propertyReports.reduce((sum, p) => sum + p.deviceBreakdown.desktop + p.deviceBreakdown.mobile + p.deviceBreakdown.tablet, 0) || 1;
      const totalTraffic = propertyReports.reduce((sum, p) => sum + p.trafficSources.direct + p.trafficSources.search + p.trafficSources.social, 0) || 1;
      const totalDesktop = propertyReports.reduce((sum, p) => sum + p.deviceBreakdown.desktop, 0);
      const totalMobile = propertyReports.reduce((sum, p) => sum + p.deviceBreakdown.mobile, 0);
      const totalTablet = propertyReports.reduce((sum, p) => sum + p.deviceBreakdown.tablet, 0);
      const totalDirect = propertyReports.reduce((sum, p) => sum + p.trafficSources.direct, 0);
      const totalSearch = propertyReports.reduce((sum, p) => sum + p.trafficSources.search, 0);
      const totalSocial = propertyReports.reduce((sum, p) => sum + p.trafficSources.social, 0);

      csvLines.push('');
      csvLines.push(`TOTALS,,,,,,${summary.totalViews.toLocaleString()},${summary.totalUniqueViews.toLocaleString()},,${Math.round((totalDesktop / totalDevice) * 100)}%,${Math.round((totalMobile / totalDevice) * 100)}%,${Math.round((totalTablet / totalDevice) * 100)}%,${Math.round((totalDirect / totalTraffic) * 100)}%,${Math.round((totalSearch / totalTraffic) * 100)}%,${Math.round((totalSocial / totalTraffic) * 100)}%`);

      // Daily breakdown section
      if (dailyStats.length > 0) {
        csvLines.push('');
        csvLines.push('DAILY VIEWS BREAKDOWN');
        csvLines.push('Date,Total Views,Unique Views');
        dailyStats.forEach((day) => {
          csvLines.push(`${day._id},${day.views},${day.uniqueViews}`);
        });
      }

      csvLines.push('');
      csvLines.push('--- End of Report ---');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${period}.csv`);
      res.send(csvLines.join('\n'));
      return;
    }

    res.json({
      report: {
        summary,
        properties: propertyReports.sort((a, b) => b.totalViews - a.totalViews),
        dailyBreakdown: dailyStats,
      },
      subscriptionInfo,
    });
  } catch (error: any) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};

// @desc    Get dashboard overview with all stats
// @route   GET /api/view-stats/dashboard
// @access  Private
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);
    const subscriptionInfo = getSubscriptionInfo(currentUser);

    const properties = await Property.find({ sellerId: userId }).select('_id title views status isPromoted promotionTier price');
    const propertyIds = properties.map((p) => p._id);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Today's views
    const todayViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: todayStart },
    });

    const monthlyViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Last month views (30-60 days ago) for comparison
    const lastMonthViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
    });

    // Last week views (7-14 days ago) for comparison
    const lastWeekViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
    });

    const monthlyUniqueViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: thirtyDaysAgo },
      isUnique: true,
    });

    const weeklyViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: sevenDaysAgo },
    });

    const totalViews = properties.reduce((sum, p: any) => sum + (p.views || 0), 0);

    const recentActivity = subscriptionInfo.isPremium
      ? await PageView.find({
          entityType: 'property',
          entityId: { $in: propertyIds },
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('entityId', 'title')
      : [];

    const propertyStats = await PageView.aggregate([
      {
        $match: {
          entityType: 'property',
          entityId: { $in: propertyIds },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$entityId',
          views: { $sum: 1 },
          uniqueViews: { $sum: { $cond: ['$isUnique', 1, 0] } },
        },
      },
      { $sort: { views: -1 } },
    ]);

    // Get device breakdown
    const deviceStats = await PageView.aggregate([
      {
        $match: {
          entityType: 'property',
          entityId: { $in: propertyIds },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$deviceType',
          count: { $sum: 1 },
        },
      },
    ]);

    const deviceBreakdown = {
      desktop: deviceStats.find((d) => d._id === 'desktop')?.count || 0,
      mobile: deviceStats.find((d) => d._id === 'mobile')?.count || 0,
      tablet: deviceStats.find((d) => d._id === 'tablet')?.count || 0,
    };

    // Get traffic sources
    const trafficStats = await PageView.aggregate([
      {
        $match: {
          entityType: 'property',
          entityId: { $in: propertyIds },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$referrerType',
          count: { $sum: 1 },
        },
      },
    ]);

    const trafficSources = {
      direct: trafficStats.find((t) => t._id === 'direct')?.count || 0,
      search: trafficStats.find((t) => t._id === 'search')?.count || 0,
      social: trafficStats.find((t) => t._id === 'social')?.count || 0,
      email: trafficStats.find((t) => t._id === 'email')?.count || 0,
      other: trafficStats.find((t) => t._id === 'other')?.count || 0,
    };

    // Get daily views for past 7 days
    const dailyViews = await PageView.aggregate([
      {
        $match: {
          entityType: 'property',
          entityId: { $in: propertyIds },
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with 0
    const weeklyViewsData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dailyViews.find((d) => d._id === dateStr);
      weeklyViewsData.push(dayData?.count || 0);
    }

    // Get hourly distribution for heatmap (last 7 days)
    const hourlyStats = await PageView.aggregate([
      {
        $match: {
          entityType: 'property',
          entityId: { $in: propertyIds },
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in all 24 hours with counts
    const hourlyDistribution: number[] = Array(24).fill(0);
    hourlyStats.forEach((h) => {
      hourlyDistribution[h._id] = h.count;
    });

    // Calculate change percentages
    const monthlyChange = lastMonthViews > 0
      ? Math.round(((monthlyViews - lastMonthViews) / lastMonthViews) * 100)
      : monthlyViews > 0 ? 100 : 0;

    const weeklyChange = lastWeekViews > 0
      ? Math.round(((weeklyViews - lastWeekViews) / lastWeekViews) * 100)
      : weeklyViews > 0 ? 100 : 0;

    const statsMap = new Map(propertyStats.map((s) => [String(s._id), s]));
    const propertiesWithStats = properties.map((p: any) => ({
      id: p._id,
      title: p.title || 'Untitled',
      status: p.status,
      isPromoted: p.isPromoted,
      promotionTier: p.promotionTier,
      price: p.price,
      monthlyViews: statsMap.get(String(p._id))?.views || 0,
      monthlyUniqueViews: statsMap.get(String(p._id))?.uniqueViews || 0,
      totalViews: p.views || 0,
    }));

    const insights = subscriptionInfo.isPremium
      ? generatePropertyInsights(propertiesWithStats.map((p) => ({
          ...p,
          periodViews: p.monthlyViews,
          periodUniqueViews: p.monthlyUniqueViews,
          propertyId: p.id,
        })))
      : [];

    res.json({
      overview: {
        totalProperties: properties.length,
        activeProperties: properties.filter((p: any) => p.status === 'active').length,
        promotedProperties: properties.filter((p: any) => p.isPromoted).length,
        totalAllTimeViews: totalViews,
        todayViews,
        monthlyViews,
        monthlyUniqueViews,
        weeklyViews,
        avgViewsPerProperty: properties.length > 0 ? Math.round(monthlyViews / properties.length) : 0,
        // Change percentages for trend indicators
        monthlyChange,
        weeklyChange,
      },
      properties: propertiesWithStats.sort((a, b) => b.monthlyViews - a.monthlyViews),
      topPerformers: propertiesWithStats.sort((a, b) => b.monthlyViews - a.monthlyViews).slice(0, 3),
      needsAttention: propertiesWithStats
        .filter((p) => p.status === 'active' && p.monthlyViews < 5)
        .slice(0, 3),
      insights,
      recentActivity: recentActivity.map((a: any) => ({
        propertyTitle: a.entityId?.title || 'Unknown',
        deviceType: a.deviceType,
        referrerType: a.referrerType,
        createdAt: a.createdAt,
      })),
      deviceBreakdown: subscriptionInfo.isPremium ? deviceBreakdown : null,
      trafficSources: subscriptionInfo.isPremium ? trafficSources : null,
      weeklyViewsData: subscriptionInfo.isPremium ? weeklyViewsData : null,
      hourlyDistribution: subscriptionInfo.isPremium ? hourlyDistribution : null,
      subscriptionInfo,
      isLimited: !subscriptionInfo.isPremium,
    });
  } catch (error: any) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
  }
};
