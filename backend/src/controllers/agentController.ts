import { Request, Response } from 'express';
import { escapeRegex } from '../utils/escapeRegex';
import Agent from '../models/Agent';
import User, { IUser } from '../models/User';
import Agency from '../models/Agency';
import Conversation from '../models/Conversation';
import Property from '../models/Property';
import CityMarketData from '../models/CityMarketData';
import { getSocketInstance } from '../utils/socketInstance';
import { apiLogger } from '../utils/logger';
import { getParam, getObjectIdParam, isValidObjectId } from '../utils/validateParams';
import { revokeAgencyCouponSubscription } from '../services/subscriptionPaymentService';
import { FREE_TIER_LIMITS } from '../config/subscriptionConstants';
import { recalculateAgencyAttributes } from '../services/agencyAttributeSyncService';



// @desc    Get all agents
// @route   GET /api/agents
// @access  Public
export const getAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = 1, limit = 50, licensed } = req.query;

    let filter: any = { isActive: true };

    // Filter by verified license status
    if (licensed === 'true') {
      filter.licenseVerified = true;
    } else if (licensed === 'false') {
      filter.licenseVerified = { $ne: true };
    }

    // Universal search - searches across multiple fields
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { agencyName: searchRegex },
        { bio: searchRegex },
        { officeAddress: searchRegex },
        { specializations: { $elemMatch: { $regex: searchRegex } } },
        { serviceAreas: { $elemMatch: { $regex: searchRegex } } },
        { languages: { $elemMatch: { $regex: searchRegex } } },
      ];
      apiLogger.info(`🔍 Universal search for agents: "${search}"`);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    let agents = await Agent.find(filter)
      .populate('userId', 'name email phone avatarUrl avatarOptions gender city country address')
      .populate('agencyId', 'name logo coverGradient coverImage slug type')
      .populate('testimonials.userId', 'name avatarUrl')
      .sort({ rating: -1, totalSales: -1 })
      .skip(skip)
      .limit(limitNum);

    // If search is provided, also filter by populated user fields (name, city, country)
    if (search && typeof search === 'string' && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      agents = agents.filter(agent => {
        const user = agent.userId as any;
        if (!user) return true; // Keep agents that matched on Agent model fields

        const userName = (user.name || '').toLowerCase();
        const userCity = (user.city || '').toLowerCase();
        const userCountry = (user.country || '').toLowerCase();
        const userAddress = (user.address || '').toLowerCase();
        const agencyName = (agent.agencyName || '').toLowerCase();
        const bio = (agent.bio || '').toLowerCase();
        const officeAddress = (agent.officeAddress || '').toLowerCase();
        const specializations = (agent.specializations || []).map((s: string) => s.toLowerCase());
        const serviceAreas = (agent.serviceAreas || []).map((s: string) => s.toLowerCase());
        const languages = (agent.languages || []).map((l: string) => l.toLowerCase());

        return (
          userName.includes(searchLower) ||
          userCity.includes(searchLower) ||
          userCountry.includes(searchLower) ||
          userAddress.includes(searchLower) ||
          agencyName.includes(searchLower) ||
          bio.includes(searchLower) ||
          officeAddress.includes(searchLower) ||
          specializations.some((s: string) => s.includes(searchLower)) ||
          serviceAreas.some((s: string) => s.includes(searchLower)) ||
          languages.some((l: string) => l.includes(searchLower))
        );
      });
    }

    const total = await Agent.countDocuments(filter);

    apiLogger.info(`✅ Found ${agents.length} agents${search ? ` matching "${search}"` : ''}`);

    res.json({
      agents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    apiLogger.error('Get agents error:', error);
    res.status(500).json({ message: 'Error fetching agents' });
  }
};

// @desc    Get single agent by ID
// @route   GET /api/agents/:id
// @access  Public
export const getAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    let agent = null;
    const id = getParam(req, 'id');

    // Only try findById if the id is a valid ObjectId format (avoids CastError)
    if (isValidObjectId(id)) {
      agent = await Agent.findById(id)
        .populate('userId', 'name email phone avatarUrl avatarOptions gender city country address')
        .populate('agencyId', 'name logo coverGradient coverImage slug type')
        .populate('testimonials.userId', 'name avatarUrl');
    }

    // Fallback: search by custom agentId field
    if (!agent) {
      agent = await Agent.findOne({ agentId: id })
        .populate('userId', 'name email phone avatarUrl avatarOptions gender city country address')
        .populate('agencyId', 'name logo coverGradient coverImage slug type')
        .populate('testimonials.userId', 'name avatarUrl');
    }

    // Fallback: search by userId (for agency agent listings that use User ObjectId)
    if (!agent && isValidObjectId(id)) {
      agent = await Agent.findOne({ userId: id })
        .populate('userId', 'name email phone avatarUrl avatarOptions gender city country address')
        .populate('agencyId', 'name logo coverGradient coverImage slug type')
        .populate('testimonials.userId', 'name avatarUrl');
    }

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    res.json({ agent });
  } catch (error: any) {
    apiLogger.error('Get agent error:', error);
    res.status(500).json({ message: 'Error fetching agent' });
  }
};

// @desc    Get agent by user ID
// @route   GET /api/agents/user/:userId
// @access  Public
export const getAgentByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;

    const agent = await Agent.findOne({ userId })
      .populate('userId', 'name email phone avatarUrl avatarOptions gender city country address')
      .populate('agencyId', 'name logo coverGradient coverImage slug type')
      .populate('testimonials.userId', 'name avatarUrl');

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    res.json({ agent });
  } catch (error: any) {
    apiLogger.error('Get agent by user ID error:', error);
    res.status(500).json({ message: 'Error fetching agent' });
  }
};

// @desc    Update agent profile
// @route   PUT /api/agents/profile
// @access  Private
export const updateAgentProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // Check if user is an agent
    if (currentUser.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can update agent profile' });
      return;
    }

    const agent = await Agent.findOne({ userId: String(currentUser._id) });

    if (!agent) {
      res.status(404).json({ message: 'Agent profile not found' });
      return;
    }

    // Update allowed fields
    const {
      bio,
      specializations,
      yearsOfExperience,
      languages,
      serviceAreas,
      lat,
      lng,
      websiteUrl,
      facebookUrl,
      instagramUrl,
      linkedinUrl,
      officeAddress,
      officePhone,
    } = req.body;

    // Validation
    if (bio !== undefined && typeof bio === 'string' && bio.length > 5000) {
      res.status(400).json({ message: 'Bio must be under 5000 characters' });
      return;
    }

    if (yearsOfExperience !== undefined) {
      const years = Number(yearsOfExperience);
      if (isNaN(years) || years < 0 || years > 100) {
        res.status(400).json({ message: 'Years of experience must be between 0 and 100' });
        return;
      }
    }

    // Validate URL fields
    const urlFields: Record<string, string | undefined> = { websiteUrl, facebookUrl, instagramUrl, linkedinUrl };
    for (const [fieldName, value] of Object.entries(urlFields)) {
      if (value && typeof value === 'string' && value.trim()) {
        try {
          new URL(value);
        } catch {
          res.status(400).json({ message: `Invalid URL for ${fieldName}` });
          return;
        }
      }
    }

    // Validate coordinates
    if (lat !== undefined && lat !== null) {
      const latNum = Number(lat);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        res.status(400).json({ message: 'Latitude must be between -90 and 90' });
        return;
      }
    }
    if (lng !== undefined && lng !== null) {
      const lngNum = Number(lng);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        res.status(400).json({ message: 'Longitude must be between -180 and 180' });
        return;
      }
    }

    // Validate array fields
    const arrayFields: Record<string, string[] | undefined> = { specializations, languages, serviceAreas };
    for (const [fieldName, arr] of Object.entries(arrayFields)) {
      if (arr !== undefined) {
        if (!Array.isArray(arr)) {
          res.status(400).json({ message: `${fieldName} must be an array` });
          return;
        }
        if (arr.length > 50) {
          res.status(400).json({ message: `${fieldName} cannot have more than 50 items` });
          return;
        }
      }
    }

    // Apply validated fields
    if (bio !== undefined) agent.bio = bio;
    if (specializations !== undefined) agent.specializations = specializations;
    if (yearsOfExperience !== undefined) agent.yearsOfExperience = Number(yearsOfExperience);
    if (languages !== undefined) agent.languages = languages;
    if (serviceAreas !== undefined) agent.serviceAreas = serviceAreas;
    if (lat !== undefined) agent.lat = Number(lat);
    if (lng !== undefined) agent.lng = Number(lng);
    if (websiteUrl !== undefined) agent.websiteUrl = websiteUrl;
    if (facebookUrl !== undefined) agent.facebookUrl = facebookUrl;
    if (instagramUrl !== undefined) agent.instagramUrl = instagramUrl;
    if (linkedinUrl !== undefined) agent.linkedinUrl = linkedinUrl;
    if (officeAddress !== undefined) agent.officeAddress = officeAddress;
    if (officePhone !== undefined) agent.officePhone = officePhone;

    await agent.save();

    // Populate userId and agencyId so the response includes full user/agency data
    await agent.populate('userId', 'name email phone avatarUrl avatarOptions gender city country address');
    await agent.populate('agencyId', 'name logo coverGradient coverImage slug type');

    res.json({
      message: 'Agent profile updated successfully',
      agent,
    });
  } catch (error: any) {
    apiLogger.error('Update agent profile error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join('. ') });
    } else {
      res.status(500).json({ message: 'Error updating agent profile' });
    }
  }
};

// @desc    Add review/rating to agent
// @route   POST /api/agents/:id/reviews
// @access  Private (authenticated users only)
export const addReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const { quote, rating, propertyId } = req.body;

    if (!quote || !rating) {
      res.status(400).json({ message: 'Review text and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agent = await Agent.findById(id);

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Prevent agents from reviewing themselves
    if (agent.userId.toString() === String(currentUser._id)) {
      res.status(400).json({ message: 'You cannot review yourself' });
      return;
    }

    // Check if user already reviewed this agent
    const existingReview = agent.testimonials.find(
      (t: any) => t.userId && t.userId.toString() === String(currentUser._id)
    );

    if (existingReview) {
      res.status(400).json({ message: 'You have already reviewed this agent' });
      return;
    }

    // Check if user has had a conversation with this agent
    const hasWorkedTogether = await Conversation.findOne({
      $or: [
        { buyerId: currentUser._id, sellerId: agent.userId },
        { buyerId: agent.userId, sellerId: currentUser._id }
      ]
    });

    if (!hasWorkedTogether) {
      res.status(403).json({
        message: 'You can only review agents you have worked with. Start a conversation about a property first.'
      });
      return;
    }

    // Add review with user information
    agent.testimonials.push({
      clientName: currentUser.name,
      userId: currentUser._id as any,
      quote,
      rating,
      propertyId: propertyId || undefined,
      createdAt: new Date(),
    });

    await agent.save();

    // Populate testimonials with user data before sending response
    await agent.populate('testimonials.userId', 'name avatarUrl');

    res.json({
      message: 'Review added successfully',
      agent,
    });
  } catch (error: any) {
    apiLogger.error('Add review error:', error);
    res.status(500).json({ message: 'Error adding review' });
  }
};

// @desc    Add testimonial to agent (DEPRECATED - Use addReview instead)
// @route   POST /api/agents/:id/testimonials
// @access  Private
export const addTestimonial = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { clientName, quote, rating, propertyId } = req.body;

    if (!clientName || !quote || !rating) {
      res.status(400).json({ message: 'Client name, quote, and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agent = await Agent.findById(id);

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    agent.testimonials.push({
      clientName,
      quote,
      rating,
      propertyId: propertyId || undefined,
      createdAt: new Date(),
    });

    await agent.save();

    res.json({
      message: 'Testimonial added successfully',
      agent,
    });
  } catch (error: any) {
    apiLogger.error('Add testimonial error:', error);
    res.status(500).json({ message: 'Error adding testimonial' });
  }
};

// @desc    Update agent statistics (called internally)
// @route   Internal use only
export const updateAgentStats = async (
  userId: string,
  updates: {
    activeListings?: number;
    totalSales?: number;
    totalSalesValue?: number;
  }
): Promise<void> => {
  try {
    const agent = await Agent.findOne({ userId });

    if (!agent) {
      apiLogger.warn(`Agent not found for user ${userId}`);
      return;
    }

    if (updates.activeListings !== undefined) {
      agent.activeListings = updates.activeListings;
    }

    if (updates.totalSales !== undefined) {
      agent.totalSales += updates.totalSales;
    }

    if (updates.totalSalesValue !== undefined) {
      agent.totalSalesValue += updates.totalSalesValue;
    }

    await agent.save();
  } catch (error: any) {
    apiLogger.error('Update agent stats error:', error);
  }
};

// @desc    Leave agency
// @route   POST /api/agents/leave-agency
// @access  Private (agent only)
export const leaveAgency = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // Check if user is an agent
    if (currentUser.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can leave agencies' });
      return;
    }

    // Get user from database to ensure we have the latest data
    const user = await User.findById(String(currentUser._id));
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if agent is part of an agency
    if (!user.agencyId) {
      res.status(400).json({ message: 'You are not part of any agency' });
      return;
    }

    const agencyId = user.agencyId;
    const agencyName = user.agencyName;

    // Clear ALL agent's agency info and downgrade subscription in User model
    // This must happen directly (not rely on transaction) to guarantee cleanup
    user.agencyName = undefined;
    user.agencyId = undefined;
    user.isSubscribed = false;
    user.subscriptionPlan = undefined;

    // Clear nested agency object
    if (user.agency) {
      user.agency.agencyId = undefined;
      user.agency.role = 'none';
      user.agency.joinedAt = undefined;
      user.agency.couponCode = undefined;
    }

    // Downgrade subscription to free tier
    if (user.subscription) {
      user.subscription.tier = 'free' as any;
      user.subscription.status = 'expired' as any;
      user.subscription.listingsLimit = FREE_TIER_LIMITS.LISTINGS;
      user.subscription.savedSearchesLimit = FREE_TIER_LIMITS.SAVED_SEARCHES;
      user.subscription.expiresAt = undefined;
      if (user.subscription.promotionCoupons) {
        user.subscription.promotionCoupons.monthly = FREE_TIER_LIMITS.PROMOTION_COUPONS;
        user.subscription.promotionCoupons.available = FREE_TIER_LIMITS.PROMOTION_COUPONS;
        user.subscription.promotionCoupons.used = 0;
        user.subscription.promotionCoupons.rollover = 0;
      }
    }
    user.subscriptionStatus = 'expired';

    await user.save();
    apiLogger.info(`✅ Cleared all agency + subscription fields for leaving agent ${currentUser._id}`);

    // Update Agent model
    const agentProfile = await Agent.findOne({ userId: String(currentUser._id) });
    if (agentProfile) {
      agentProfile.agencyName = 'Independent Agent';
      agentProfile.agencyId = undefined;
      await agentProfile.save();
    }

    // Revoke Subscription document and free coupon (best-effort — user is already cleaned up above)
    let subscriptionRevoked = true;
    try {
      await revokeAgencyCouponSubscription(currentUser._id, agencyId);
      apiLogger.info(`✅ Subscription doc + coupon revoked for agent ${currentUser._id}`);
    } catch (revokeError: any) {
      apiLogger.error(`Failed to revoke subscription doc for agent ${currentUser._id}:`, revokeError);
      // Fallback: directly free the coupon even if Subscription doc revocation failed
      try {
        const fallbackAgency = await Agency.findById(agencyId);
        if (fallbackAgency?.agentCoupons) {
          const coupon = fallbackAgency.agentCoupons.find(
            (c: any) => c.usedBy && String(c.usedBy) === String(currentUser._id) && c.status === 'used'
          );
          if (coupon) {
            coupon.status = 'available';
            coupon.usedBy = undefined;
            coupon.usedAt = undefined;
            await fallbackAgency.save();
            apiLogger.info(`✅ Fallback: freed coupon ${coupon.code} for leaving agent ${currentUser._id}`);
          }
        }
      } catch (fallbackError: any) {
        apiLogger.error(`Fallback coupon freeing also failed for agent ${currentUser._id}:`, fallbackError);
      }
    }

    // Remove agent from agency's agents array and mark as inactive in agentDetails
    const agency = await Agency.findById(agencyId);
    if (agency) {
      agency.agents = agency.agents.filter(
        (id) => id.toString() !== String(currentUser._id)
      );
      agency.totalAgents = agency.agents.length;

      // Mark agent as inactive in agentDetails (preserve join history)
      if (agency.agentDetails) {
        const agentDetail = agency.agentDetails.find(
          (ad: any) => ad.userId.toString() === String(currentUser._id)
        );
        if (agentDetail) {
          agentDetail.isActive = false;
          agentDetail.leftAt = new Date();
        }
      }

      await agency.save();

      // Recalculate agency attributes (languages, serviceAreas, specializations, certifications)
      await recalculateAgencyAttributes(agency._id);

      // Emit socket event to notify agency members
      const io = getSocketInstance();
      if (io) {
        // Notify the agent who left (include subscription downgrade for real-time UI update)
        io.emit(`user-update-${String(currentUser._id)}`, {
          type: 'agency-left',
          message: `You have left ${agencyName}`,
          user: {
            id: String(user._id),
            agencyId: null,
            agencyName: 'Independent Agent',
          },
          subscriptionRevoked,
          ...(subscriptionRevoked ? {
            subscription: {
              tier: 'free',
              status: 'expired',
              listingsLimit: FREE_TIER_LIMITS.LISTINGS,
              savedSearchesLimit: FREE_TIER_LIMITS.SAVED_SEARCHES,
              promotionCoupons: {
                monthly: FREE_TIER_LIMITS.PROMOTION_COUPONS,
                available: FREE_TIER_LIMITS.PROMOTION_COUPONS,
                used: 0,
                rollover: 0,
              },
            },
          } : {}),
        });
        apiLogger.info(`✅ Socket event emitted to agent ${currentUser._id} for leaving agency`);

        // Notify all viewers of the agency page that a member has left
        io.emit(`agency-update-${String(agencyId)}`, {
          type: 'member-removed',
          agencyId: String(agencyId),
          agentId: String(currentUser._id),
          agentName: user.name,
        });
        apiLogger.info(`✅ Socket event emitted to agency ${agencyId} for member removal`);
      }
    }

    res.json({
      message: 'Successfully left the agency',
      subscriptionRevoked,
      user: {
        id: String(user._id),
        agencyId: null,
        agencyName: 'Independent Agent',
      },
      ...(subscriptionRevoked ? {
        subscription: {
          tier: 'free',
          status: 'expired',
          listingsLimit: FREE_TIER_LIMITS.LISTINGS,
          savedSearchesLimit: FREE_TIER_LIMITS.SAVED_SEARCHES,
          promotionCoupons: {
            monthly: FREE_TIER_LIMITS.PROMOTION_COUPONS,
            available: FREE_TIER_LIMITS.PROMOTION_COUPONS,
            used: 0,
            rollover: 0,
          },
        },
      } : {}),
    });
  } catch (error: any) {
    apiLogger.error('Leave agency error:', error);
    res.status(500).json({ message: 'Error leaving agency' });
  }
};

// @desc    Get market insights for agent's service area
// @route   GET /api/agents/:id/market-insights
// @access  Public
export const getAgentMarketInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agent = await Agent.findById(id)
      .populate('userId', 'city country');

    if (!agent) {
      res.status(404).json({ message: 'Agent not found' });
      return;
    }

    // Get the agent's primary service area (first in the list) or user's city
    const userInfo = agent.userId as any;
    let primaryCity = agent.serviceAreas?.[0] || userInfo?.city;
    let primaryCountry = userInfo?.country;

    // If no service area, try to get from the user's location
    if (!primaryCity && userInfo) {
      primaryCity = userInfo.city;
      primaryCountry = userInfo.country;
    }

    if (!primaryCity) {
      res.json({
        success: true,
        hasData: false,
        message: 'No service area defined for this agent',
        insights: null,
      });
      return;
    }

    // Get market data for the service area
    const marketData = await CityMarketData.findOne({
      city: { $regex: new RegExp(`^${escapeRegex(primaryCity)}$`, 'i') },
    }).lean();

    // Calculate agent-specific metrics from their properties
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get agent's properties in this area
    const agentProperties = await Property.find({
      userId: agent.userId,
      status: { $in: ['active', 'sold'] },
    });

    // Calculate agent's average days on market for sold properties
    const soldProperties = agentProperties.filter(p => p.status === 'sold' && p.createdAt && p.updatedAt);
    const agentAvgDaysOnMarket = soldProperties.length > 0
      ? Math.round(
          soldProperties.reduce((sum, p) => {
            const daysOnMarket = Math.floor((p.updatedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            return sum + daysOnMarket;
          }, 0) / soldProperties.length
        )
      : null;

    // Get total listings in the area for comparison
    const areaListingsCount = await Property.countDocuments({
      city: { $regex: new RegExp(`^${escapeRegex(primaryCity)}$`, 'i') },
      status: 'active',
    });

    // Calculate agent's market share in this area
    const agentActiveListings = agentProperties.filter(p => p.status === 'active').length;
    const marketShare = areaListingsCount > 0
      ? Math.round((agentActiveListings / areaListingsCount) * 100 * 10) / 10
      : 0;

    // Determine market activity level
    let marketActivity: 'High' | 'Medium' | 'Low' = 'Medium';
    if (marketData) {
      if (marketData.demandScore >= 80 || marketData.marketTrend === 'rising') {
        marketActivity = 'High';
      } else if (marketData.demandScore <= 50 || marketData.marketTrend === 'declining') {
        marketActivity = 'Low';
      }
    }

    const insights = {
      serviceArea: {
        city: primaryCity,
        country: primaryCountry || marketData?.country,
      },
      marketData: marketData ? {
        avgDaysOnMarket: marketData.averageDaysOnMarket,
        priceGrowthYoY: marketData.priceGrowthYoY,
        marketActivity,
        demandScore: marketData.demandScore,
        avgPricePerSqm: marketData.avgPricePerSqm,
        marketTrend: marketData.marketTrend,
        topNeighborhoods: marketData.topNeighborhoods,
        investmentScore: marketData.investmentScore,
        rentalYield: marketData.rentalYield,
        lastUpdated: marketData.lastUpdated,
      } : null,
      agentMetrics: {
        avgDaysOnMarket: agentAvgDaysOnMarket,
        activeListings: agentActiveListings,
        totalSold: soldProperties.length,
        marketShare,
        areaListingsCount,
      },
    };

    res.json({
      success: true,
      hasData: !!marketData,
      insights,
    });
  } catch (error: any) {
    apiLogger.error('Get agent market insights error:', error);
    res.status(500).json({ message: 'Error fetching market insights' });
  }
};
