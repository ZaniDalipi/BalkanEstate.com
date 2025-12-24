import { Request, Response } from 'express';
import crypto from 'crypto';
import PageView, { EntityType } from '../models/PageView';
import Property from '../models/Property';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import { IUser } from '../models/User';
import { incrementViewCount } from '../utils/statsUpdater';

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

  // Search engines
  if (/google|bing|yahoo|duckduckgo|baidu|yandex/i.test(lowerReferrer)) {
    return 'search';
  }

  // Social media
  if (/facebook|twitter|instagram|linkedin|pinterest|tiktok|reddit/i.test(lowerReferrer)) {
    return 'social';
  }

  // Email providers
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

  // Check by viewer ID first (logged in users)
  if (viewerId) {
    query.viewerId = viewerId;
    const existingView = await PageView.findOne(query);
    if (existingView) return false;
  }

  // Check by IP hash
  if (ipHash) {
    delete query.viewerId;
    query.ipHash = ipHash;
    const existingView = await PageView.findOne(query);
    if (existingView) return false;
  }

  // Check by session ID
  if (sessionId) {
    delete query.ipHash;
    query.sessionId = sessionId;
    const existingView = await PageView.findOne(query);
    if (existingView) return false;
  }

  return true;
};

/**
 * Get the model for an entity type
 */
const getEntityModel = (entityType: EntityType) => {
  switch (entityType) {
    case 'property':
      return Property;
    case 'agent':
      return Agent;
    case 'agency':
      return Agency;
    default:
      return null;
  }
};

// @desc    Record a page view
// @route   POST /api/view-stats/track
// @access  Public
export const trackView = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entityType,
      entityId,
      sessionId,
      referrer,
      duration,
    } = req.body;

    // Validate required fields
    if (!entityType || !entityId) {
      res.status(400).json({ message: 'entityType and entityId are required' });
      return;
    }

    // Validate entity type
    if (!['property', 'agent', 'agency'].includes(entityType)) {
      res.status(400).json({ message: 'Invalid entityType' });
      return;
    }

    // Get viewer info
    const viewerId = req.user ? String((req.user as IUser)._id) : undefined;
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '';
    const ipHash = hashIP(ip);
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = detectDeviceType(userAgent);
    const referrerType = detectReferrerType(referrer);

    // Check if this is a unique view
    const isUnique = await isUniqueView(entityType, entityId, viewerId, ipHash, sessionId);

    // Create page view record
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

    // Update entity view count
    const Model = getEntityModel(entityType);
    if (Model) {
      const entity = await Model.findById(entityId);
      if (entity) {
        // Increment view count
        entity.views = (entity.views || 0) + 1;

        // Update view stats
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

        // For properties, also update seller stats
        if (entityType === 'property' && entity.sellerId) {
          await incrementViewCount(String(entity.sellerId));
        }
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

// @desc    Get view statistics for an entity
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

    // Validate entity type
    if (!['property', 'agent', 'agency'].includes(entityType)) {
      res.status(400).json({ message: 'Invalid entityType' });
      return;
    }

    // Get the entity and verify ownership
    const Model = getEntityModel(entityType as EntityType);
    if (!Model) {
      res.status(400).json({ message: 'Invalid entity type' });
      return;
    }

    const entity = await Model.findById(entityId);
    if (!entity) {
      res.status(404).json({ message: 'Entity not found' });
      return;
    }

    // Check ownership based on entity type
    const userId = String((req.user as IUser)._id);
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

    // Calculate date range based on period
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

    // Aggregate view statistics
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

    // Get daily views for chart
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

    // Get top referrers
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
      topReferrers,
      entityViewStats: entity.viewStats || {
        totalViews: entity.views || 0,
        uniqueViews: 0,
      },
    });
  } catch (error: any) {
    console.error('Get entity stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};

// @desc    Get aggregated stats for user's properties
// @route   GET /api/view-stats/my-properties
// @access  Private
export const getMyPropertiesStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const { period = '30d' } = req.query;

    // Get user's properties
    const properties = await Property.find({ sellerId: userId }).select('_id title views viewStats');

    if (properties.length === 0) {
      res.json({
        totalProperties: 0,
        totalViews: 0,
        uniqueViews: 0,
        propertiesStats: [],
      });
      return;
    }

    // Calculate date range
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

    // Get aggregated stats for all properties
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
        },
      },
    ]);

    // Map stats to properties
    const statsMap = new Map(aggregatedStats.map((s) => [String(s._id), s]));

    const propertiesStats = properties.map((p) => {
      const stats = statsMap.get(String(p._id)) || { views: 0, uniqueViews: 0 };
      return {
        propertyId: p._id,
        title: p.title,
        totalViews: p.views || 0,
        periodViews: stats.views,
        periodUniqueViews: stats.uniqueViews,
      };
    });

    // Calculate totals
    const totalViews = propertiesStats.reduce((sum, p) => sum + p.periodViews, 0);
    const totalUniqueViews = propertiesStats.reduce((sum, p) => sum + p.periodUniqueViews, 0);

    res.json({
      period,
      totalProperties: properties.length,
      totalViews,
      uniqueViews: totalUniqueViews,
      propertiesStats: propertiesStats.sort((a, b) => b.periodViews - a.periodViews),
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

    // Get agent profile
    const agent = await Agent.findOne({ userId });
    if (!agent) {
      res.status(404).json({ message: 'Agent profile not found' });
      return;
    }

    // Forward to getEntityStats
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

    // Get agency where user is owner or admin
    const agency = await Agency.findOne({
      $or: [{ ownerId: userId }, { admins: userId }],
    });

    if (!agency) {
      res.status(404).json({ message: 'Agency not found or not authorized' });
      return;
    }

    // Forward to getEntityStats
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

    const userId = String((req.user as IUser)._id);

    const now = new Date();
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get user's properties
    const properties = await Property.find({ sellerId: userId }).select('_id');
    const propertyIds = properties.map((p) => p._id);

    // Get this week's views
    const thisWeekViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: thisWeekStart },
    });

    // Get last week's views
    const lastWeekViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: lastWeekStart, $lt: thisWeekStart },
    });

    // Get this month's views
    const thisMonthViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: thisMonthStart },
    });

    // Get last month's views
    const lastMonthViews = await PageView.countDocuments({
      entityType: 'property',
      entityId: { $in: propertyIds },
      createdAt: { $gte: lastMonthStart, $lt: thisMonthStart },
    });

    // Calculate percentage changes
    const weeklyChange = lastWeekViews > 0
      ? Math.round(((thisWeekViews - lastWeekViews) / lastWeekViews) * 100)
      : thisWeekViews > 0 ? 100 : 0;

    const monthlyChange = lastMonthViews > 0
      ? Math.round(((thisMonthViews - lastMonthViews) / lastMonthViews) * 100)
      : thisMonthViews > 0 ? 100 : 0;

    res.json({
      thisWeek: {
        views: thisWeekViews,
        change: weeklyChange,
      },
      lastWeek: {
        views: lastWeekViews,
      },
      thisMonth: {
        views: thisMonthViews,
        change: monthlyChange,
      },
      lastMonth: {
        views: lastMonthViews,
      },
    });
  } catch (error: any) {
    console.error('Get comparison stats error:', error);
    res.status(500).json({ message: 'Error fetching comparison', error: error.message });
  }
};
