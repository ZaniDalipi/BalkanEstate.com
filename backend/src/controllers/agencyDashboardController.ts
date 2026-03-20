import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Agency, { IAgency } from '../models/Agency';
import Property from '../models/Property';
import User, { IUser } from '../models/User';
import Inquiry from '../models/Inquiry';
import Notification from '../models/Notification';
import PromotionCoupon from '../models/PromotionCoupon';
import { getObjectIdParam } from '../utils/validateParams';
import { agencyLogger } from '../utils/logger';

/**
 * Parse pagination query params with defaults and clamping.
 * Default: page=1, limit=20, max limit=100.
 */
const parsePagination = (query: any): { page: number; limit: number; skip: number } => {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Format a duration in milliseconds into a human-readable response time string.
 * Returns '-' if no data is available.
 */
const formatResponseTime = (ms: number | undefined): string => {
  if (!ms || ms <= 0) return '-';
  const minutes = ms / (1000 * 60);
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)} hr`;
  const days = hours / 24;
  return `${Math.round(days)} day${Math.round(days) !== 1 ? 's' : ''}`;
};

// ---------------------------------------------------------------------------
// 1. GET /:agencyId/overview
// ---------------------------------------------------------------------------

// @desc    Get agency dashboard overview with aggregated stats
// @route   GET /api/agency-dashboard/:agencyId/overview
// @access  Private (Agency owner/admin)
export const getOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const agentUserIds = agency.agents.map((id) => new mongoose.Types.ObjectId(String(id)));

    // Start of current month for "this month" queries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Date range for trend data (last 14 days)
    const trendStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Run aggregations in parallel
    const [
      activeListingsCount,
      totalPropertyViews,
      inquiriesThisMonth,
      totalInquiries,
      recentInquiriesRaw,
      topPropertiesRaw,
      inquiryTrend,
    ] = await Promise.all([
      // Active listings from agency agents (only those posted as agent role)
      Property.countDocuments({
        sellerId: { $in: agentUserIds },
        status: 'active',
        createdAsRole: 'agent',
      }),

      // Total views across all agency properties (only agent-posted)
      Property.aggregate([
        { $match: { sellerId: { $in: agentUserIds }, createdAsRole: 'agent' } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } },
      ]),

      // Inquiries this month on agency properties
      Inquiry.countDocuments({
        recipientId: { $in: agentUserIds },
        createdAt: { $gte: startOfMonth },
      }),

      // Total inquiries on agency properties (all time)
      Inquiry.countDocuments({
        recipientId: { $in: agentUserIds },
      }),

      // Recent inquiries (last 5)
      Inquiry.find({ recipientId: { $in: agentUserIds } })
        .select('propertyTitle buyerName message status recipientName recipientId createdAt readAt repliedAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Top 5 properties by views (only agent-posted)
      Property.find({ sellerId: { $in: agentUserIds }, status: 'active', createdAsRole: 'agent' })
        .select('title imageUrl price status views inquiries createdByName listingType createdAt')
        .sort({ views: -1 })
        .limit(5)
        .lean(),

      // Inquiry trend by day (last 14 days)
      Inquiry.aggregate([
        {
          $match: {
            recipientId: { $in: agentUserIds },
            createdAt: { $gte: trendStart },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const views = totalPropertyViews[0]?.totalViews || 0;
    const conversionRate = views > 0
      ? parseFloat(((totalInquiries / views) * 100).toFixed(2))
      : 0;

    // Build views trend from property creation dates (approximate)
    const viewsTrend = inquiryTrend.map((point: { _id: string; count: number }) => ({
      date: point._id,
      value: Math.round(point.count * (views / Math.max(totalInquiries, 1))),
    }));

    // Map recent inquiries to dashboard format
    const recentInquiries = recentInquiriesRaw.map((i: any) => ({
      id: String(i._id),
      propertyTitle: i.propertyTitle || '',
      buyerName: i.buyerName || '',
      message: i.message || '',
      date: i.createdAt,
      status: i.repliedAt ? 'responded' : i.readAt ? 'in-progress' : 'new',
      assignedAgentName: i.recipientName || '',
      agentId: String(i.recipientId || ''),
    }));

    // Map top properties to dashboard format
    const topProperties = topPropertiesRaw.map((p: any) => ({
      id: String(p._id),
      title: p.title || '',
      image: p.imageUrl || '',
      price: p.price || 0,
      status: p.status || 'draft',
      assignedAgent: p.createdByName || '',
      views: p.views || 0,
      inquiries: p.inquiries || 0,
      listedAt: p.createdAt,
      propertyType: p.listingType || 'other',
    }));

    // Build inquiry trend as TimeSeriesPoint[]
    const inquiriesTrend = inquiryTrend.map((point: { _id: string; count: number }) => ({
      date: point._id,
      value: point.count,
    }));

    res.status(200).json({
      activeListings: activeListingsCount,
      totalAgents: agency.agents.length,
      inquiriesThisMonth,
      totalPropertyViews: views,
      totalViews: views,
      conversionRate,
      subscriptionStatus: agency.subscription.status,
      subscription: {
        status: agency.subscription.status,
        expiresAt: agency.subscription.expiresAt,
        autoRenew: agency.subscription.autoRenew,
      },
      recentInquiries,
      topProperties,
      viewsTrend,
      inquiriesTrend,
      promotionCoupons: {
        available: agency.promotionCoupons.available,
        used: agency.promotionCoupons.used,
        monthly: agency.promotionCoupons.monthly,
      },
      stats: agency.stats,
    });
  } catch (error: any) {
    agencyLogger.error('Get dashboard overview error:', error);
    res.status(500).json({ message: 'Error fetching dashboard overview' });
  }
};

// ---------------------------------------------------------------------------
// 2. GET /:agencyId/agents
// ---------------------------------------------------------------------------

// @desc    Get list of agency agents with details
// @route   GET /api/agency-dashboard/:agencyId/agents
// @access  Private (Agency owner/admin)
export const getAgents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const { page, limit, skip } = parsePagination(req.query);

    // Populate agents with useful fields
    const populatedAgency = await Agency.findById(agency._id)
      .populate(
        'agents',
        'name email phone avatarUrl role stats listingsCount agentId licenseNumber'
      )
      .lean();

    if (!populatedAgency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    const allAgents = (populatedAgency.agents as any[]) || [];
    const total = allAgents.length;

    // Calculate average response time per agent from replied inquiries
    const allAgentObjectIds = allAgents.map((a) => new mongoose.Types.ObjectId(String(a._id)));
    const responseTimeAgg = await Inquiry.aggregate([
      {
        $match: {
          recipientId: { $in: allAgentObjectIds },
          repliedAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$recipientId',
          avgMs: { $avg: { $subtract: ['$repliedAt', '$createdAt'] } },
        },
      },
    ]);
    const responseTimeMap = new Map<string, number>(
      responseTimeAgg.map((r: { _id: mongoose.Types.ObjectId; avgMs: number }) => [
        String(r._id),
        r.avgMs,
      ])
    );

    // Apply pagination to the populated array
    const paginatedAgents = allAgents.slice(skip, skip + limit).map((agent) => {
      const agentDetail = populatedAgency.agentDetails?.find(
        (ad) => String(ad.userId) === String(agent._id)
      );

      return {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        avatarUrl: agent.avatarUrl,
        role: agent.role,
        agentId: agent.agentId,
        licenseNumber: agent.licenseNumber,
        stats: agent.stats || {},
        listingsCount: agent.listingsCount || 0,
        joinedAt: agentDetail?.joinedAt,
        isActive: agentDetail?.isActive ?? true,
        couponCode: agentDetail?.couponCode,
        avgResponseTime: formatResponseTime(responseTimeMap.get(String(agent._id))),
      };
    });

    res.status(200).json({
      agents: paginatedAgents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    agencyLogger.error('Get agents error:', error);
    res.status(500).json({ message: 'Error fetching agents' });
  }
};

// ---------------------------------------------------------------------------
// 3. GET /:agencyId/agents/:agentId/performance
// ---------------------------------------------------------------------------

// @desc    Get individual agent performance metrics
// @route   GET /api/agency-dashboard/:agencyId/agents/:agentId/performance
// @access  Private (Agency owner/admin)
export const getAgentPerformance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;

    const agentId = getObjectIdParam(req, res, 'agentId');
    if (!agentId) return;

    // Verify the agent belongs to this agency
    const isAgencyAgent = agency.agents.some(
      (id) => String(id) === agentId
    );
    if (!isAgencyAgent) {
      res.status(404).json({ message: 'Agent not found in this agency' });
      return;
    }

    const agentObjectId = new mongoose.Types.ObjectId(agentId);

    // Fetch agent user details
    const agent = await User.findById(agentId)
      .select('name email avatarUrl stats listingsCount')
      .lean();

    if (!agent) {
      res.status(404).json({ message: 'Agent user not found' });
      return;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Run performance queries in parallel
    const [
      activeListings,
      soldListings,
      rentedListings,
      propertyViewsAgg,
      inquiriesThisMonth,
      inquiriesLastMonth,
      totalInquiries,
    ] = await Promise.all([
      Property.countDocuments({ sellerId: agentObjectId, status: 'active' }),
      Property.countDocuments({ sellerId: agentObjectId, status: 'sold' }),
      Property.countDocuments({ sellerId: agentObjectId, status: 'rented' }),
      Property.aggregate([
        { $match: { sellerId: agentObjectId } },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$views' },
            totalSaves: { $sum: '$saves' },
            totalInquiries: { $sum: '$inquiries' },
          },
        },
      ]),
      Inquiry.countDocuments({
        recipientId: agentObjectId,
        createdAt: { $gte: startOfMonth },
      }),
      Inquiry.countDocuments({
        recipientId: agentObjectId,
        createdAt: { $gte: startOfLastMonth, $lt: startOfMonth },
      }),
      Inquiry.countDocuments({ recipientId: agentObjectId }),
    ]);

    const viewsData = propertyViewsAgg[0] || { totalViews: 0, totalSaves: 0, totalInquiries: 0 };

    res.status(200).json({
      agent: {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        avatarUrl: agent.avatarUrl,
      },
      performance: {
        activeListings,
        soldListings,
        rentedListings,
        totalViews: viewsData.totalViews,
        totalSaves: viewsData.totalSaves,
        totalPropertyInquiries: viewsData.totalInquiries,
        inquiriesThisMonth,
        inquiriesLastMonth,
        totalInquiries,
        conversionRate:
          viewsData.totalViews > 0
            ? parseFloat(((totalInquiries / viewsData.totalViews) * 100).toFixed(2))
            : 0,
      },
      stats: agent.stats || {},
    });
  } catch (error: any) {
    agencyLogger.error('Get agent performance error:', error);
    res.status(500).json({ message: 'Error fetching agent performance' });
  }
};

// ---------------------------------------------------------------------------
// 4. GET /:agencyId/properties
// ---------------------------------------------------------------------------

// @desc    Get agency properties with filtering and pagination
// @route   GET /api/agency-dashboard/:agencyId/properties
// @access  Private (Agency owner/admin)
export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const { page, limit, skip } = parsePagination(req.query);
    const { status, listingType, agentId, sortBy = 'createdAt', order = 'desc' } = req.query;

    const agentUserIds = agency.agents.map((id) => new mongoose.Types.ObjectId(String(id)));

    const filter: any = {
      sellerId: { $in: agentUserIds },
      createdAsRole: 'agent', // Only show listings posted as agent in the agency dashboard
    };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    if (listingType && typeof listingType === 'string') {
      filter.listingType = listingType;
    }

    if (agentId && typeof agentId === 'string') {
      // Verify the filtered agent belongs to this agency
      const isAgencyAgent = agency.agents.some(
        (id) => String(id) === agentId
      );
      if (isAgencyAgent) {
        filter.sellerId = new mongoose.Types.ObjectId(agentId);
      }
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .select(
          'title status listingType price city country beds baths sqft imageUrl views saves inquiries isPromoted promotionTier sellerId createdByName createdAt updatedAt'
        )
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.countDocuments(filter),
    ]);

    res.status(200).json({
      properties,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    agencyLogger.error('Get properties error:', error);
    res.status(500).json({ message: 'Error fetching properties' });
  }
};

// ---------------------------------------------------------------------------
// 5. POST /:agencyId/properties/bulk-action
// ---------------------------------------------------------------------------

// @desc    Perform bulk actions on agency properties (activate, deactivate, etc.)
// @route   POST /api/agency-dashboard/:agencyId/properties/bulk-action
// @access  Private (Agency owner/admin)
export const bulkPropertyAction = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;

    // Whitelist allowed body fields
    const { propertyIds, action } = req.body;

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      res.status(400).json({ message: 'propertyIds must be a non-empty array' });
      return;
    }

    const allowedActions = ['activate', 'deactivate', 'draft', 'delete'];
    if (!action || !allowedActions.includes(action)) {
      res.status(400).json({
        message: `Invalid action. Allowed actions: ${allowedActions.join(', ')}`,
      });
      return;
    }

    // Cap at 50 properties per bulk action
    if (propertyIds.length > 50) {
      res.status(400).json({ message: 'Maximum 50 properties per bulk action' });
      return;
    }

    const agentUserIds = agency.agents.map((id) => String(id));

    // Validate all property IDs are valid ObjectIds
    const validPropertyIds = propertyIds.filter(
      (id: string) =>
        mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id)
    );

    if (validPropertyIds.length === 0) {
      res.status(400).json({ message: 'No valid property IDs provided' });
      return;
    }

    // Ensure all targeted properties belong to agency agents
    const targetFilter = {
      _id: { $in: validPropertyIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
      sellerId: { $in: agentUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
    };

    let affected = 0;

    switch (action) {
      case 'activate': {
        const result = await Property.updateMany(targetFilter, {
          $set: { status: 'active' },
        });
        affected = result.modifiedCount;
        break;
      }
      case 'deactivate': {
        const result = await Property.updateMany(targetFilter, {
          $set: { status: 'draft' },
        });
        affected = result.modifiedCount;
        break;
      }
      case 'draft': {
        const result = await Property.updateMany(targetFilter, {
          $set: { status: 'draft' },
        });
        affected = result.modifiedCount;
        break;
      }
      case 'delete': {
        const result = await Property.deleteMany(targetFilter);
        affected = result.deletedCount;
        break;
      }
      default:
        res.status(400).json({ message: 'Invalid action' });
        return;
    }

    agencyLogger.info(
      `Bulk action '${action}' performed on ${affected} properties for agency ${agency._id}`
    );

    res.status(200).json({
      message: `Bulk action '${action}' completed successfully`,
      affected,
    });
  } catch (error: any) {
    agencyLogger.error('Bulk property action error:', error);
    res.status(500).json({ message: 'Error performing bulk property action' });
  }
};

// ---------------------------------------------------------------------------
// 6. GET /:agencyId/inquiries
// ---------------------------------------------------------------------------

// @desc    Get inquiries for agency properties with filtering and pagination
// @route   GET /api/agency-dashboard/:agencyId/inquiries
// @access  Private (Agency owner/admin)
export const getInquiries = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const { page, limit, skip } = parsePagination(req.query);
    const { status, type, agentId } = req.query;

    const agentUserIds = agency.agents.map((id) => new mongoose.Types.ObjectId(String(id)));

    const filter: any = {
      recipientId: { $in: agentUserIds },
    };

    if (status && typeof status === 'string') {
      filter.status = status;
    }

    if (type && typeof type === 'string') {
      filter.type = type;
    }

    if (agentId && typeof agentId === 'string') {
      const isAgencyAgent = agency.agents.some(
        (id) => String(id) === agentId
      );
      if (isAgencyAgent) {
        filter.recipientId = new mongoose.Types.ObjectId(agentId);
      }
    }

    const [inquiries, total] = await Promise.all([
      Inquiry.find(filter)
        .select(
          'type status buyerName buyerEmail message subject propertyId propertyTitle recipientId recipientName createdAt readAt repliedAt'
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Inquiry.countDocuments(filter),
    ]);

    res.status(200).json({
      inquiries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    agencyLogger.error('Get inquiries error:', error);
    res.status(500).json({ message: 'Error fetching inquiries' });
  }
};

// ---------------------------------------------------------------------------
// 7. PUT /:agencyId/inquiries/:inquiryId/assign
// ---------------------------------------------------------------------------

// @desc    Assign/reassign an inquiry to a specific agent in the agency
// @route   PUT /api/agency-dashboard/:agencyId/inquiries/:inquiryId/assign
// @access  Private (Agency owner/admin)
export const assignInquiry = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;

    const inquiryId = getObjectIdParam(req, res, 'inquiryId');
    if (!inquiryId) return;

    // Whitelist allowed body fields
    const { assignToAgentId } = req.body;

    if (!assignToAgentId || typeof assignToAgentId !== 'string') {
      res.status(400).json({ message: 'assignToAgentId is required' });
      return;
    }

    if (
      !mongoose.Types.ObjectId.isValid(assignToAgentId) ||
      !/^[a-fA-F0-9]{24}$/.test(assignToAgentId)
    ) {
      res.status(400).json({ message: 'Invalid assignToAgentId format' });
      return;
    }

    // Verify target agent belongs to this agency
    const isAgencyAgent = agency.agents.some(
      (id) => String(id) === assignToAgentId
    );
    if (!isAgencyAgent) {
      res.status(400).json({ message: 'Target agent does not belong to this agency' });
      return;
    }

    // Verify inquiry exists and belongs to an agency agent
    const agentUserIds = agency.agents.map((id) => String(id));
    const inquiry = await Inquiry.findOne({
      _id: inquiryId,
      recipientId: { $in: agentUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    if (!inquiry) {
      res.status(404).json({ message: 'Inquiry not found or does not belong to this agency' });
      return;
    }

    // Get target agent name for the recipientName field
    const targetAgent = await User.findById(assignToAgentId)
      .select('name email')
      .lean();

    if (!targetAgent) {
      res.status(404).json({ message: 'Target agent user not found' });
      return;
    }

    // Update the inquiry assignment
    inquiry.recipientId = new mongoose.Types.ObjectId(assignToAgentId);
    inquiry.recipientName = targetAgent.name;
    inquiry.recipientEmail = targetAgent.email;
    await inquiry.save();

    agencyLogger.info(
      `Inquiry ${inquiryId} reassigned to agent ${assignToAgentId} in agency ${agency._id}`
    );

    res.status(200).json({
      message: 'Inquiry assigned successfully',
      inquiry: {
        id: inquiry._id,
        recipientId: inquiry.recipientId,
        recipientName: inquiry.recipientName,
        status: inquiry.status,
      },
    });
  } catch (error: any) {
    agencyLogger.error('Assign inquiry error:', error);
    res.status(500).json({ message: 'Error assigning inquiry' });
  }
};

// ---------------------------------------------------------------------------
// 8. GET /:agencyId/analytics
// ---------------------------------------------------------------------------

// @desc    Get agency analytics (views, inquiries, conversions over time)
// @route   GET /api/agency-dashboard/:agencyId/analytics
// @access  Private (Agency owner/admin)
export const getAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const { period = '30d' } = req.query;

    const agentUserIds = agency.agents.map((id) => new mongoose.Types.ObjectId(String(id)));

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Run analytics queries in parallel
    const [
      propertyStats,
      inquiryTrend,
      topProperties,
      statusBreakdown,
      listingTypeBreakdown,
      agentPropertyStats,
      viewsByDay,
    ] = await Promise.all([
      // Aggregate property metrics
      Property.aggregate([
        { $match: { sellerId: { $in: agentUserIds } } },
        {
          $group: {
            _id: null,
            totalProperties: { $sum: 1 },
            totalViews: { $sum: '$views' },
            totalSaves: { $sum: '$saves' },
            totalInquiries: { $sum: '$inquiries' },
            avgPrice: { $avg: '$price' },
          },
        },
      ]),

      // Inquiry trend by day within the period
      Inquiry.aggregate([
        {
          $match: {
            recipientId: { $in: agentUserIds },
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top 5 most viewed properties
      Property.find({ sellerId: { $in: agentUserIds }, status: 'active' })
        .select('title price city country views saves inquiries imageUrl createdByName')
        .sort({ views: -1 })
        .limit(5)
        .lean(),

      // Properties by status breakdown
      Property.aggregate([
        { $match: { sellerId: { $in: agentUserIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Properties by listing type breakdown
      Property.aggregate([
        { $match: { sellerId: { $in: agentUserIds } } },
        { $group: { _id: '$listingType', count: { $sum: 1 } } },
      ]),

      // Per-agent stats for comparison chart
      Property.aggregate([
        { $match: { sellerId: { $in: agentUserIds } } },
        {
          $group: {
            _id: '$sellerId',
            listings: { $sum: 1 },
            views: { $sum: '$views' },
            inquiries: { $sum: '$inquiries' },
          },
        },
      ]),

      // Views trend by property creation date (approximate daily activity)
      Property.aggregate([
        {
          $match: {
            sellerId: { $in: agentUserIds },
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalViews: { $sum: '$views' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Build agent comparison data
    const agentComparisonRaw = agentPropertyStats as Array<{
      _id: mongoose.Types.ObjectId;
      listings: number;
      views: number;
      inquiries: number;
    }>;

    // Pre-calculate avg response times for all agents in this agency
    const analyticsResponseTimeAgg = await Inquiry.aggregate([
      {
        $match: {
          recipientId: { $in: agentUserIds },
          repliedAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$recipientId',
          avgMs: { $avg: { $subtract: ['$repliedAt', '$createdAt'] } },
        },
      },
    ]);
    const analyticsResponseTimeMap = new Map<string, number>(
      analyticsResponseTimeAgg.map((r: { _id: mongoose.Types.ObjectId; avgMs: number }) => [
        String(r._id),
        r.avgMs,
      ])
    );

    const agentComparison = await Promise.all(
      agentComparisonRaw.map(async (stat) => {
        const agent = await User.findById(stat._id).select('name').lean();
        const agentInquiries = await Inquiry.countDocuments({
          recipientId: stat._id,
          createdAt: { $gte: startDate },
        });
        return {
          agentId: String(stat._id),
          agentName: agent?.name || 'Unknown',
          listings: stat.listings,
          inquiries: agentInquiries,
          views: stat.views,
          responseTime: formatResponseTime(analyticsResponseTimeMap.get(String(stat._id))),
        };
      })
    );

    // Build viewsOverTime from property daily data
    const viewsOverTime = (viewsByDay as Array<{ _id: string; totalViews: number }>).map(
      (point) => ({
        date: point._id,
        value: point.totalViews,
      })
    );

    const stats = propertyStats[0] || {
      totalProperties: 0,
      totalViews: 0,
      totalSaves: 0,
      totalInquiries: 0,
      avgPrice: 0,
    };

    res.status(200).json({
      period,
      stats: {
        totalProperties: stats.totalProperties,
        totalViews: stats.totalViews,
        totalSaves: stats.totalSaves,
        totalInquiries: stats.totalInquiries,
        avgPrice: parseFloat((stats.avgPrice || 0).toFixed(2)),
        conversionRate:
          stats.totalViews > 0
            ? parseFloat(((stats.totalInquiries / stats.totalViews) * 100).toFixed(2))
            : 0,
      },
      inquiryTrend,
      viewsOverTime,
      agentComparison,
      topProperties,
      statusBreakdown: statusBreakdown.reduce(
        (acc: Record<string, number>, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      ),
      listingTypeBreakdown: listingTypeBreakdown.reduce(
        (acc: Record<string, number>, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      ),
    });
  } catch (error: any) {
    agencyLogger.error('Get analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
};

// ---------------------------------------------------------------------------
// 9. GET /:agencyId/analytics/export
// ---------------------------------------------------------------------------

// @desc    Export agency analytics data as JSON (for CSV generation on client)
// @route   GET /api/agency-dashboard/:agencyId/analytics/export
// @access  Private (Agency owner/admin)
export const exportAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const { period = '30d' } = req.query;

    const agentUserIds = agency.agents.map((id) => new mongoose.Types.ObjectId(String(id)));

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch all properties for the export
    const [properties, inquiries] = await Promise.all([
      Property.find({
        sellerId: { $in: agentUserIds },
      })
        .select(
          'title status listingType price city country beds baths sqft views saves inquiries createdByName sellerId createdAt updatedAt'
        )
        .sort({ createdAt: -1 })
        .lean(),

      Inquiry.find({
        recipientId: { $in: agentUserIds },
        createdAt: { $gte: startDate },
      })
        .select(
          'type status buyerName buyerEmail propertyTitle recipientName createdAt readAt repliedAt'
        )
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Per-agent summary
    const agentSummary = await Promise.all(
      agency.agents.map(async (agentUserId) => {
        const agentObjId = new mongoose.Types.ObjectId(String(agentUserId));
        const agent = await User.findById(agentObjId).select('name email').lean();

        const agentProperties = properties.filter(
          (p) => String(p.sellerId) === String(agentUserId)
        );
        const agentInquiries = inquiries.filter(
          (i) => String(i.recipientId) === String(agentUserId)
        );

        return {
          agentId: String(agentUserId),
          name: agent?.name || 'Unknown',
          email: agent?.email || '',
          totalProperties: agentProperties.length,
          activeListings: agentProperties.filter((p) => p.status === 'active').length,
          totalViews: agentProperties.reduce((sum, p) => sum + (p.views || 0), 0),
          totalInquiries: agentInquiries.length,
        };
      })
    );

    res.status(200).json({
      exportDate: now.toISOString(),
      period,
      agencyName: agency.name,
      properties,
      inquiries,
      agentSummary,
    });
  } catch (error: any) {
    agencyLogger.error('Export analytics error:', error);
    res.status(500).json({ message: 'Error exporting analytics' });
  }
};

// ---------------------------------------------------------------------------
// 10. GET /:agencyId/financial
// ---------------------------------------------------------------------------

// @desc    Get agency financial overview (revenue, subscription costs, etc.)
// @route   GET /api/agency-dashboard/:agencyId/financial
// @access  Private (Agency owner/admin)
export const getFinancial = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const agentUserIds = agency.agents.map((id) => new mongoose.Types.ObjectId(String(id)));

    // Revenue from sold and rented properties
    const [soldRevenue, rentedRevenue, promotedCount] = await Promise.all([
      Property.aggregate([
        {
          $match: {
            sellerId: { $in: agentUserIds },
            status: 'sold',
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price' },
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
          },
        },
      ]),

      Property.aggregate([
        {
          $match: {
            sellerId: { $in: agentUserIds },
            status: 'rented',
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price' },
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
          },
        },
      ]),

      Property.countDocuments({
        sellerId: { $in: agentUserIds },
        isPromoted: true,
      }),
    ]);

    const sold = soldRevenue[0] || { totalRevenue: 0, count: 0, avgPrice: 0 };
    const rented = rentedRevenue[0] || { totalRevenue: 0, count: 0, avgPrice: 0 };

    res.status(200).json({
      subscription: {
        status: agency.subscription.status,
        amount: agency.subscription.amount,
        currency: agency.subscription.currency,
        startDate: agency.subscription.startDate,
        expiresAt: agency.subscription.expiresAt,
        autoRenew: agency.subscription.autoRenew,
      },
      sales: {
        totalRevenue: sold.totalRevenue,
        count: sold.count,
        avgPrice: parseFloat((sold.avgPrice || 0).toFixed(2)),
      },
      rentals: {
        totalRevenue: rented.totalRevenue,
        count: rented.count,
        avgPrice: parseFloat((rented.avgPrice || 0).toFixed(2)),
      },
      promotedListings: promotedCount,
      promotionCoupons: await (async () => {
        // Fetch real promotion coupon codes from PromotionCoupon model
        const ownerIdStr = String(agency.ownerId);
        const allAgencyUserIds = [ownerIdStr, ...agency.agents.map((id) => String(id))];
        const promoCoupons = await PromotionCoupon.find({
          generatedForUserId: { $in: allAgencyUserIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean();

        const coupons = await Promise.all(
          promoCoupons.map(async (pc) => {
            let usedByInfo = null;
            if (pc.usageHistory && pc.usageHistory.length > 0) {
              const lastUsage = pc.usageHistory[pc.usageHistory.length - 1];
              try {
                const user = await User.findById(lastUsage.userId, 'name email').lean();
                if (user) {
                  usedByInfo = { id: String((user as any)._id), name: (user as any).name, email: (user as any).email };
                }
              } catch {
                // user may have been deleted
              }
            }
            const isUsed = pc.currentTotalUses > 0;
            const isExpired = pc.status === 'expired' || pc.status === 'disabled' || new Date(pc.validUntil) < new Date();
            return {
              code: pc.code,
              status: isUsed ? 'used' as const : isExpired ? 'expired' as const : 'available' as const,
              generatedAt: pc.createdAt,
              expiresAt: pc.validUntil,
              usedBy: usedByInfo,
              usedAt: pc.usageHistory && pc.usageHistory.length > 0
                ? pc.usageHistory[pc.usageHistory.length - 1].usedAt
                : null,
            };
          })
        );

        return {
          available: agency.promotionCoupons.available,
          used: agency.promotionCoupons.used,
          monthly: agency.promotionCoupons.monthly,
          coupons,
        };
      })(),
      agentCoupons: {
        total: agency.agentCoupons.length,
        available: agency.agentCoupons.filter((c) => c.status === 'available').length,
        used: agency.agentCoupons.filter((c) => c.status === 'used').length,
        expired: agency.agentCoupons.filter((c) => c.status === 'expired').length,
        coupons: await Promise.all(
          agency.agentCoupons.map(async (c) => {
            let usedByInfo = null;
            if (c.usedBy) {
              try {
                const user = await mongoose.model('User').findById(c.usedBy, 'name email').lean();
                if (user) {
                  usedByInfo = { id: String((user as any)._id), name: (user as any).name, email: (user as any).email };
                }
              } catch {
                // user may have been deleted
              }
            }
            return {
              code: c.code,
              status: c.status,
              generatedAt: c.generatedAt,
              expiresAt: c.expiresAt,
              usedBy: usedByInfo,
              usedAt: c.usedAt || null,
            };
          })
        ),
      },
    });
  } catch (error: any) {
    agencyLogger.error('Get financial error:', error);
    res.status(500).json({ message: 'Error fetching financial data' });
  }
};

// ---------------------------------------------------------------------------
// 11. GET /:agencyId/team-feed
// ---------------------------------------------------------------------------

// @desc    Get team activity feed (notifications for agency members)
// @route   GET /api/agency-dashboard/:agencyId/team-feed
// @access  Private (Agency owner/admin)
export const getTeamFeed = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const { page, limit, skip } = parsePagination(req.query);

    const agentUserIds = agency.agents.map((id) => new mongoose.Types.ObjectId(String(id)));

    // Fetch agency-related notifications for all team members
    const agencyNotificationTypes = [
      'agent_joined_agency',
      'agent_left_agency',
      'agency_join_welcome',
      'agency_coupon_redeemed',
      'new_inquiry',
      'listing_milestone',
      'listing_trending',
      'promotion_success',
    ];

    const filter = {
      userId: { $in: agentUserIds },
      type: { $in: agencyNotificationTypes },
    };

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .select('userId type title message icon priority data isRead createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    res.status(200).json({
      feed: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    agencyLogger.error('Get team feed error:', error);
    res.status(500).json({ message: 'Error fetching team feed' });
  }
};

// ---------------------------------------------------------------------------
// 12. GET /:agencyId/team-notes
// ---------------------------------------------------------------------------

// @desc    Get team notes (stored as system notifications with team_note data)
// @route   GET /api/agency-dashboard/:agencyId/team-notes
// @access  Private (Agency owner/admin)
export const getTeamNotes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;
    const { page, limit, skip } = parsePagination(req.query);

    // Team notes are stored as Notification documents with type 'system'
    // and data.agencyId matching the agency, data.isTeamNote = true
    const filter = {
      type: 'system' as const,
      'data.agencyId': String(agency._id),
      'data.isTeamNote': true,
    };

    const [notes, total] = await Promise.all([
      Notification.find(filter)
        .select('userId title message data createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email avatarUrl')
        .lean(),
      Notification.countDocuments(filter),
    ]);

    res.status(200).json({
      notes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    agencyLogger.error('Get team notes error:', error);
    res.status(500).json({ message: 'Error fetching team notes' });
  }
};

// ---------------------------------------------------------------------------
// 13. POST /:agencyId/team-notes
// ---------------------------------------------------------------------------

// @desc    Create a team note visible to all agency members
// @route   POST /api/agency-dashboard/:agencyId/team-notes
// @access  Private (Agency owner/admin)
export const createTeamNote = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const agency = req.agency as IAgency;

    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // Whitelist allowed body fields
    const { title, message } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ message: 'Message is required' });
      return;
    }

    // Validate lengths
    if (title.trim().length > 200) {
      res.status(400).json({ message: 'Title must be 200 characters or less' });
      return;
    }

    if (message.trim().length > 2000) {
      res.status(400).json({ message: 'Message must be 2000 characters or less' });
      return;
    }

    // Create the team note as a Notification document
    // The note is created under the author's userId, with agency context in data
    const note = await Notification.create({
      userId: currentUser._id,
      type: 'system',
      title: title.trim(),
      message: message.trim(),
      priority: 'normal',
      data: {
        agencyId: String(agency._id),
        agencyName: agency.name,
        isTeamNote: true,
        authorId: String(currentUser._id),
        authorName: currentUser.name,
      },
      isRead: false,
    });

    agencyLogger.info(
      `Team note created by user ${currentUser._id} for agency ${agency._id}`
    );

    res.status(201).json({
      message: 'Team note created successfully',
      note: {
        id: note._id,
        userId: note.userId,
        title: note.title,
        message: note.message,
        data: note.data,
        createdAt: note.createdAt,
      },
    });
  } catch (error: any) {
    agencyLogger.error('Create team note error:', error);
    res.status(500).json({ message: 'Error creating team note' });
  }
};
