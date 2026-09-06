import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/escapeRegex';
import Agency from '../models/Agency';
import User, { IUser } from '../models/User';
import Agent from '../models/Agent';
import Property from '../models/Property';
import Subscription from '../models/Subscription';
import Product from '../models/Product';
import { geocodeAgency } from '../services/geocodingService';
import { uploadImage, deleteImage } from '../services/cloudinaryService';
import { generateSecureAgentId } from '../utils/secureRandom';
import { getParam, getObjectIdParam, isValidObjectId } from '../utils/validateParams';

import PromotionCoupon from '../models/PromotionCoupon';
import { ENTERPRISE_TIER_LIMITS, FREE_TIER_LIMITS } from '../config/subscriptionConstants';
import { revokeAgencyCouponSubscription, generateProSubscriptionCoupons } from '../services/subscriptionPaymentService';
import { getSocketInstance } from '../utils/socketInstance';
import { agencyLogger } from '../utils/logger';
import { createNotificationWithPush } from '../services/engagementService';
import { syncAgentAttributesToAgency, recalculateAgencyAttributes } from '../services/agencyAttributeSyncService';
import { calcAgencyScoreBreakdown } from '../utils/scoringUtils';

// Helper function to generate unique Agent ID using secure random
function generateAgentId(): string {
  return generateSecureAgentId().replace('AG-', 'AGT-');
}

// @desc    Create agency profile (Enterprise tier only)
// @route   POST /api/agencies
// @access  Private
export const createAgency = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if agency already exists for this user
    const existingAgency = await Agency.findOne({ ownerId: user._id });
    if (existingAgency) {
      res.status(400).json({ message: 'Agency profile already exists for this user' });
      return;
    }

    // Geocode the agency address automatically
    // Only geocode if we have at least city and country (for precision)
    const coordinates = await geocodeAgency({
      address: req.body.address,
      city: req.body.city,
      country: req.body.country,
    });

    // Whitelist allowed fields to prevent mass assignment attacks
    // (e.g., attacker setting isFeatured, verified, admins, etc.)
    const agencyData = {
      name: req.body.name,
      description: req.body.description,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      city: req.body.city,
      country: req.body.country,
      zipCode: req.body.zipCode,
      website: req.body.website,
      registrationNumber: req.body.registrationNumber,
      specialties: req.body.specialties,
      certifications: req.body.certifications,
      languages: req.body.languages,
      licenseNumber: req.body.licenseNumber,
      yearsInBusiness: req.body.yearsInBusiness ? Number(req.body.yearsInBusiness) : undefined,
      businessHours: req.body.businessHours,
      facebookUrl: req.body.facebookUrl,
      instagramUrl: req.body.instagramUrl,
      linkedinUrl: req.body.linkedinUrl,
      twitterUrl: req.body.twitterUrl,
      ownerId: user._id,
      agents: [user._id],
      admins: [user._id],
      isFeatured: false,
      totalAgents: 1,
      // Add geocoded coordinates (will be undefined if geocoding failed)
      ...(coordinates.lat && coordinates.lng && {
        lat: coordinates.lat,
        lng: coordinates.lng,
      }),
    };

    agencyLogger.info(`📍 Creating agency with coordinates:`, coordinates.lat ? `${coordinates.lat}, ${coordinates.lng}` : 'No coordinates');

    // Use constructor + save() pattern to allow pre-save hook to generate slug and invitationCode
    const agency = new Agency(agencyData);
    await agency.save();

    // Add owner to agents array
    user.agencyId = agency._id as unknown as mongoose.Types.ObjectId;
    agency.totalAgents = 1;
    await agency.save();

    // Update user with agency reference
    user.agencyId = agency._id as unknown as mongoose.Types.ObjectId;
    user.isEnterpriseTier = true;
    user.isSubscribed = true;
    user.agencyName = agency.name;
    user.subscriptionPlan = 'agency_yearly';
    user.subscriptionStatus = 'active';

    // Set subscription expiry to 1 year from now
    const subscriptionExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    user.subscriptionExpiresAt = subscriptionExpiresAt;

    // Get enterprise product limits from DB (configurable in admin)
    const agencyProduct = await Product.findOne({ productId: 'agency_yearly' }).lean();
    const enterpriseListingsLimit = agencyProduct?.listingsLimit ?? ENTERPRISE_TIER_LIMITS.LISTINGS;
    const enterprisePromoCoupons = agencyProduct?.promotionCoupons ?? ENTERPRISE_TIER_LIMITS.PROMOTION_COUPONS;

    // Set the owner's subscription to agency_owner tier with enterprise limits
    if (!user.subscription) {
      user.subscription = {
        tier: 'free',
        status: 'active',
        listingsLimit: 3,
        activeListingsCount: 0,
        privateSellerCount: 0,
        agentCount: 0,
        totalPaid: 0,
      } as any;
    }
    user.subscription.tier = 'agency_owner';
    user.subscription.status = 'active';
    user.subscription.listingsLimit = enterpriseListingsLimit;
    user.subscription.expiresAt = subscriptionExpiresAt;
    user.subscription.promotionCoupons = {
      monthly: enterprisePromoCoupons,
      available: enterprisePromoCoupons,
      used: 0,
      rollover: 0,
      lastRefresh: new Date(),
    };
    user.subscription.savedSearchesLimit = -1; // Unlimited

    // Set agency.role to 'owner' for proper detection in getMe
    user.agency = {
      agencyId: agency._id as any,
      role: 'owner',
    };

    // If user is not already an agent, change their role to agent
    if (user.role !== 'agent') {
      user.role = 'agent';
    }

    await user.save();

    // Create Subscription document for the owner (source of truth for frontend)
    try {
      const existingSubscription = await Subscription.findOne({ userId: user._id });
      if (existingSubscription) {
        existingSubscription.productId = 'agency_yearly';
        existingSubscription.store = 'agency_creation';
        existingSubscription.purchaseToken = `agency_owner_${user._id}`;
        existingSubscription.transactionId = `agency_owner_${user._id}`;
        existingSubscription.status = 'active';
        existingSubscription.startDate = new Date();
        existingSubscription.renewalDate = subscriptionExpiresAt;
        existingSubscription.expirationDate = subscriptionExpiresAt;
        existingSubscription.autoRenewing = true;
        existingSubscription.price = 0;
        existingSubscription.currency = 'EUR';
        existingSubscription.isAcknowledged = true;
        existingSubscription.expiryReminderSent = false;
        await existingSubscription.save();
      } else {
        await Subscription.create({
          userId: user._id,
          productId: 'agency_yearly',
          store: 'agency_creation',
          purchaseToken: `agency_owner_${user._id}`,
          transactionId: `agency_owner_${user._id}`,
          status: 'active',
          startDate: new Date(),
          renewalDate: subscriptionExpiresAt,
          expirationDate: subscriptionExpiresAt,
          autoRenewing: true,
          price: 0,
          currency: 'EUR',
          isAcknowledged: true,
        });
      }
      agencyLogger.info(`✅ Created Enterprise Subscription document for agency owner ${user._id}`);
    } catch (subError: any) {
      if (subError.code === 11000) {
        agencyLogger.warn(`Duplicate subscription key for agency owner ${user._id}, skipping`);
      } else {
        agencyLogger.error(`Error creating owner subscription: ${subError.message}`);
      }
    }

    // Create or update Agent profile for the agency owner
    const licenseNumber = req.body.licenseNumber || `LIC-${Date.now()}`;
    let agentProfile = await Agent.findOne({ userId: user._id });

    // Use provided languages or default to English
    const agentLanguages = req.body.languages && req.body.languages.length > 0 ? req.body.languages : ['English'];

    if (agentProfile) {
      // Update existing agent profile with new agency
      agentProfile.agencyId = agency._id as mongoose.Types.ObjectId;
      agentProfile.agencyName = agency.name;
      agentProfile.licenseNumber = licenseNumber;
      agentProfile.languages = agentLanguages;
      await agentProfile.save();
      // Updated existing agent profile
    } else {
      // Create new agent profile
      const agentId = generateAgentId();
      agentProfile = await Agent.create({
        userId: user._id,
        agencyId: agency._id,
        agencyName: agency.name,
        agentId,
        licenseNumber,
        licenseVerified: false,
        languages: agentLanguages,
      });
      // Created new agent profile
    }

    // Update user with agent ID
    user.agentId = agentProfile.agentId;
    await user.save();

    // Agency created successfully

    // Automatically start 7-day free trial for featured listing
    let trialStarted = false;
    let trialSubscription = null;

    try {
      const { startAutoFreeTrial } = await import('../utils/featuredSubscriptionUtils');
      const trialResult = await startAutoFreeTrial(
        String(agency._id),
        String(user._id)
      );

      if (trialResult.success) {
        trialStarted = true;
        trialSubscription = trialResult.subscription;
        agencyLogger.info(`🎁 Automatically started 7-day free featured trial for agency ${agency.name}`);
      } else {
        agencyLogger.info(`⚠️ Could not start free trial: ${trialResult.error}`);
      }
    } catch (trialError) {
      agencyLogger.error('Error starting auto free trial:', trialError);
      // Don't fail agency creation if trial fails
    }

    // Generate 5 agent registration coupons for Enterprise subscribers
    let agentCouponsGenerated = false;
    let agentCouponsEmailSent = false;
    let generatedCoupons: Array<{ code: string; expiresAt: Date }> = [];

    // Check if user has Enterprise subscription
    const isEnterprise = user.subscriptionPlan?.includes('enterprise') ||
                         user.subscriptionPlan === 'agency_yearly' ||
                         user.isEnterpriseTier;

    if (isEnterprise) {
      try {
        // Generate agent coupons directly
        const couponExpiresAt = new Date();
        couponExpiresAt.setFullYear(couponExpiresAt.getFullYear() + 1); // Valid for 1 year

        for (let i = 0; i < 5; i++) {
          const code = agency.generateCouponCode();
          agency.agentCoupons.push({
            code,
            generatedAt: new Date(),
            expiresAt: couponExpiresAt,
            status: 'available',
          } as any);
          generatedCoupons.push({ code, expiresAt: couponExpiresAt });
        }

        // Update agency subscription status
        const subscriptionExpiresAt = user.subscriptionExpiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        agency.subscription = {
          status: 'active' as const,
          startDate: new Date(),
          expiresAt: subscriptionExpiresAt,
          amount: 1000,
          currency: 'EUR',
          autoRenew: true,
        };

        // Initialize promotion coupons immediately so agency doesn't wait for monthly cron
        const [agencyProduct, agentProduct] = await Promise.all([
          Product.findOne({ productId: 'agency_yearly' }).lean(),
          Product.findOne({ productId: 'agency_agent_yearly' }).lean(),
        ]);
        const monthlyPromotionAmount = agencyProduct?.promotionCoupons || ENTERPRISE_TIER_LIMITS.PROMOTION_COUPONS;
        agency.promotionCoupons = {
          monthly: monthlyPromotionAmount,
          available: monthlyPromotionAmount,
          used: 0,
          lastRefresh: new Date(),
        };

        await agency.save();
        agentCouponsGenerated = true;
        agencyLogger.info(`🎟️ Generated 5 agent registration coupons and ${monthlyPromotionAmount} promotion coupons for new agency ${agency.name}`);

        // Send emails with coupon codes and welcome message
        try {
          const { sendAgentRegistrationCouponsEmail, sendEnterpriseWelcomeEmail } = await import('../services/emailService');

          // Use the already-fetched Enterprise product for coupon breakdown values
          const enterpriseProduct = agencyProduct;
          const promotionCoupons = {
            total: enterpriseProduct?.promotionCoupons || ENTERPRISE_TIER_LIMITS.PROMOTION_COUPONS,
            premium: enterpriseProduct?.premiumCoupons || ENTERPRISE_TIER_LIMITS.PREMIUM_COUPONS,
            highlighted: enterpriseProduct?.highlightedCoupons || ENTERPRISE_TIER_LIMITS.HIGHLIGHTED_COUPONS,
            featured: enterpriseProduct?.featuredCoupons || ENTERPRISE_TIER_LIMITS.FEATURED_COUPONS,
          };

          // Send agent registration coupons email with dynamic limit from DB
          await sendAgentRegistrationCouponsEmail({
            email: user.email,
            ownerName: user.name || 'Agency Owner',
            agencyName: agency.name,
            coupons: generatedCoupons,
            agentListingsLimit: agentProduct?.listingsLimit ?? 30,
          });

          // Send welcome/thank you email with promotion coupon breakdown
          await sendEnterpriseWelcomeEmail({
            email: user.email,
            ownerName: user.name || 'Agency Owner',
            agencyName: agency.name,
            promotionCoupons,
            agentCoupons: enterpriseProduct?.agentCoupons || 5,
            teamMembersLimit: enterpriseProduct?.teamMembersLimit || ENTERPRISE_TIER_LIMITS.TEAM_MEMBERS,
            listingsLimit: enterpriseProduct?.listingsLimit || ENTERPRISE_TIER_LIMITS.LISTINGS,
          });

          // Promotion coupon codes are generated and emailed by subscriptionPaymentService
          // when the Enterprise payment is processed (monthly coupons email).

          agentCouponsEmailSent = true;
          agencyLogger.info(`📧 Enterprise welcome emails sent to ${user.email}`);
        } catch (emailError) {
          agencyLogger.error('⚠️ Failed to send Enterprise emails:', emailError);
        }
      } catch (couponError) {
        agencyLogger.error('⚠️ Error generating agent coupons:', couponError);
        // Don't fail agency creation if coupon generation fails
      }
    }

    res.status(201).json({
      agency,
      agent: agentProfile,
      freeTrial: trialStarted
        ? {
            active: true,
            subscription: trialSubscription,
            message: '🎉 Your agency has been featured for 7 days free!',
          }
        : undefined,
      agentCoupons: agentCouponsGenerated
        ? {
            generated: true,
            count: generatedCoupons.length,
            codes: generatedCoupons.map(c => ({ code: c.code, expiresAt: c.expiresAt })),
            emailSent: agentCouponsEmailSent,
            message: '🎟️ 5 agent registration codes generated! Check your email or the codes below.',
          }
        : undefined,
    });
  } catch (error: any) {
    agencyLogger.error('Create agency error:', error);

    // Handle MongoDB duplicate key errors with specific messages
    if (error.code === 11000) {
      const keyPattern = error.keyPattern || {};
      const field = Object.keys(keyPattern)[0] || '';

      if (field === 'slug') {
        res.status(400).json({
          message: 'An agency with this name already exists in this country. Please choose a different agency name.',
          code: 'DUPLICATE_AGENCY_NAME',
        });
      } else if (field === 'ownerId') {
        res.status(400).json({
          message: 'You already have an agency profile associated with your account.',
          code: 'AGENCY_ALREADY_EXISTS',
        });
      } else if (field === 'invitationCode') {
        res.status(400).json({
          message: 'Could not generate a unique invitation code. Please try again.',
          code: 'DUPLICATE_INVITATION_CODE',
        });
      } else {
        res.status(400).json({
          message: 'An agency with this information already exists. Please check your details and try again.',
          code: 'DUPLICATE_KEY',
        });
      }
      return;
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(', ');
      res.status(400).json({
        message: `Validation failed: ${messages}`,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    res.status(500).json({ message: 'Error creating agency. Please try again.' });
  }
};

// @desc    Get all agencies (public, with featured rotation)
// @route   GET /api/agencies
// @access  Public
export const getAgencies = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { city, country, featured, page = 1, limit = 12, name, search } = req.query;

    const filter: any = {};

    // Universal search - searches across multiple fields
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { name: searchRegex },
        { city: searchRegex },
        { country: searchRegex },
        { address: searchRegex },
        { description: searchRegex },
        { specialties: { $elemMatch: { $regex: searchRegex } } },
        { type: searchRegex },
      ];
      agencyLogger.info(`🔍 Universal search for agencies: "${search}"`);
    } else {
      // Legacy individual field filters (for backward compatibility)
      if (city) {
        filter.city = new RegExp(escapeRegex(city as string), 'i');
        agencyLogger.info(`🔍 Filtering agencies by city: ${city}`);
      }

      if (country) {
        filter.country = new RegExp(escapeRegex(country as string), 'i');
        agencyLogger.info(`🔍 Filtering agencies by country: ${country}`);
      }

      if (name) {
        filter.name = new RegExp(escapeRegex(name as string), 'i');
        agencyLogger.info(`🔍 Filtering agencies by name: ${name}`);
      }
    }

    if (featured === 'true') {
      filter.isFeatured = true;
      agencyLogger.info(`⭐ Filtering for featured agencies only`);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Validate pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({ message: 'Invalid page number' });
      return;
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({ message: 'Invalid limit (must be 1-100)' });
      return;
    }

    const skip = (pageNum - 1) * limitNum;

    agencyLogger.info(`📄 Fetching agencies: page ${pageNum}, limit ${limitNum}, skip ${skip}`);

    // Get agencies sorted by rotation order for featured ones
    const agencies = await Agency.find(filter)
      .populate('ownerId', 'name email phone avatarUrl avatarOptions gender')
      .populate('agents', 'name email phone avatarUrl avatarOptions gender role agencyName licenseNumber agentId city country stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating')
      .populate('admins', 'name email phone avatarUrl avatarOptions gender')
      .sort({ score: -1, isFeatured: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance when we don't need document methods

    // Import Property model at the top if not already imported
    const Property = (await import('../models/Property')).default;

    // Calculate totalProperties for ALL agencies in a single aggregation query
    const allAgentIds = agencies.flatMap((agency: any) =>
      agency.agents?.map((agent: any) => agent._id) || []
    );

    const propertyCounts = await Property.aggregate([
      { $match: { sellerId: { $in: allAgentIds }, status: { $in: ['active', 'pending'] } } },
      { $group: { _id: '$sellerId', count: { $sum: 1 } } },
    ]);

    // Build a map of agentId -> count for fast lookup
    const countByAgent = new Map(
      propertyCounts.map(pc => [String(pc._id), pc.count])
    );

    const agenciesWithCounts = agencies.map((agency: any) => {
      const agentIds = agency.agents?.map((agent: any) => agent._id) || [];
      const totalProperties = agentIds.reduce(
        (sum: number, id: any) => sum + (countByAgent.get(String(id)) || 0), 0
      );
      return { ...agency, totalProperties, totalAgents: agency.agents?.length || 0 };
    });

    const total = await Agency.countDocuments(filter);

    agencyLogger.info(`✅ Found ${agencies.length} agencies out of ${total} total`);

    res.json({
      agencies: agenciesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    agencyLogger.error('❌ Get agencies error:', error);
    agencyLogger.error('Stack trace:', error.stack);
    res.status(500).json({
      message: 'Error fetching agencies',
      filters: req.query
    });
  }
};

// @desc    Get single agency by ID or slug
// @route   GET /api/agencies/:country/:name OR GET /api/agencies/:idOrSlug
// @access  Public
export const getAgency = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const country = getParam(req, 'country');
    const name = getParam(req, 'name');
    const idOrSlug = getParam(req, 'idOrSlug');

    // Construct slug from country/name or use idOrSlug
    let identifier = idOrSlug as string | undefined;
    if (country && name) {
      identifier = `${country}/${name}`;
      agencyLogger.info(`🔍 Looking up agency by country/name: ${identifier}`);
    } else if (idOrSlug) {
      agencyLogger.info(`🔍 Looking up agency by idOrSlug: ${idOrSlug}`);
    }

    if (!identifier) {
      agencyLogger.error('❌ getAgency: No identifier provided');
      res.status(400).json({ message: 'Agency ID or slug is required' });
      return;
    }

    // Try to find by ID first, then by slug
    let agency;
    let lookupMethod = '';

    if (isValidObjectId(identifier)) {
      lookupMethod = 'ID';
      agencyLogger.info(`🔑 Attempting lookup by ObjectId: ${identifier}`);
      agency = await Agency.findById(identifier)
        .populate('ownerId', 'name email phone avatarUrl avatarOptions gender')
        .populate('agents', 'name email phone avatarUrl avatarOptions gender role agencyName licenseNumber agentId city country stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating')
        .populate('admins', 'name email phone avatarUrl avatarOptions gender');
    }

    if (!agency) {
      lookupMethod = 'slug';
      const slugLower = identifier.toLowerCase();
      agencyLogger.info(`🏷️  Attempting lookup by slug: ${slugLower}`);
      agency = await Agency.findOne({ slug: slugLower })
        .populate('ownerId', 'name email phone avatarUrl avatarOptions gender')
        .populate('agents', 'name email phone avatarUrl avatarOptions gender role agencyName licenseNumber agentId city country stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating')
        .populate('admins', 'name email phone avatarUrl avatarOptions gender');
    }

    // If not found and slug contains forward slash, try converting to comma format for backward compatibility
    if (!agency && identifier.includes('/')) {
      lookupMethod = 'slug (legacy format)';
      const legacySlug = identifier.toLowerCase().replace('/', ',');
      agencyLogger.info(`🏷️  Attempting lookup by legacy slug format: ${legacySlug}`);
      agency = await Agency.findOne({ slug: legacySlug })
        .populate('ownerId', 'name email phone avatarUrl avatarOptions gender')
        .populate('agents', 'name email phone avatarUrl avatarOptions gender role agencyName licenseNumber agentId city country stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating')
        .populate('admins', 'name email phone avatarUrl avatarOptions gender');
    }

    if (!agency) {
      agencyLogger.error(`❌ Agency not found for identifier: ${identifier}`);
      res.status(404).json({
        message: 'Agency not found',
      });
      return;
    }

    agencyLogger.info(`✅ Agency found via ${lookupMethod}: ${agency.name} (ID: ${agency._id})`);

    // Validate that populated fields were successful
    if (!agency.ownerId) {
      agencyLogger.warn(`⚠️  Agency owner not found or failed to populate for agency: ${agency._id}`);
    }

    // Auto-add owner/admin as member if they're viewing the agency and not already a member
    if (req.user) {
      const currentUser = req.user as IUser;
      const userId = String(currentUser._id);
      const ownerId = String(agency.ownerId._id || agency.ownerId);
      const agencyAdmins = agency.admins?.map((id: any) => String(id)) || [];
      const agencyAgents = agency.agents.map((agent: any) => String(agent._id || agent));

      // Check if user is owner or admin but not in the agents array
      const isOwnerOrAdmin = userId === ownerId || agencyAdmins.includes(userId);
      if (isOwnerOrAdmin && !agencyAgents.includes(userId)) {
        agencyLogger.info(`👤 Auto-adding owner/admin ${userId} to agency members`);

        // Add user to agents array
        agency.agents.push(new mongoose.Types.ObjectId(userId));
        agency.totalAgents = (agency.totalAgents || 0) + 1;
        await agency.save();

        // Update user's agency info if not already set
        const user = await User.findById(userId);
        if (user) {
          if (!user.agencyId) {
            user.agencyId = new mongoose.Types.ObjectId(String(agency._id));
            user.agencyName = agency.name;
            if (user.role !== 'agent') {
              user.role = 'agent';
            }
          }

          // Create or update Agent profile when user joins agency
          let agentProfile = await Agent.findOne({ userId: user._id });
          const licenseNumber = agentProfile?.licenseNumber || `LIC-${Date.now()}`;

          if (agentProfile) {
            // Update existing agent profile with new agency
            agentProfile.agencyId = agency._id as mongoose.Types.ObjectId;
            agentProfile.agencyName = agency.name;
            await agentProfile.save();
            // Updated existing agent profile
          } else {
            // Create new agent profile
            const agentId = generateAgentId();
            agentProfile = await Agent.create({
              userId: user._id,
              agencyId: agency._id,
              agencyName: agency.name,
              agentId,
              licenseNumber,
              licenseVerified: false,
            });
            // Created new agent profile
          }

          // Update user with agent ID
          user.agentId = agentProfile.agentId;
          await user.save();
          agencyLogger.info(`✅ User ${userId} profile updated with agency info`);
        }

        // Re-populate agents to include the newly added admin
        await agency.populate('agents', 'name email phone avatarUrl avatarOptions gender role agencyName licenseNumber agentId city country stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating');
      }
    }

    // Get agency's properties with error handling
    let properties: any[] = [];
    try {
      const sellerIds = [agency.ownerId, ...agency.agents].filter(Boolean);
      agencyLogger.info(`🏠 Fetching properties for ${sellerIds.length} sellers (owner + ${agency.agents.length} agents)`);

      const rawProperties = await Property.find({
        sellerId: { $in: sellerIds },
        status: { $in: ['active', 'sold'] }, // Include both active and sold properties
        createdAsRole: 'agent', // Only show listings posted as agent on the agency page
      })
        .populate('sellerId', 'name email phone avatarUrl avatarOptions gender role agencyName')
        .sort({ createdAt: -1 })
        .lean();

      // Transform sellerId to seller for frontend compatibility
      // PropertyCard expects: { type, name, avatarUrl, phone, agencyName, agencyLogo, agencyId }
      properties = rawProperties.map((prop: any) => {
        const sellerData = prop.sellerId;
        return {
          ...prop,
          id: prop._id.toString(),
          seller: sellerData ? {
            type: sellerData.role === 'agent' ? 'agent' : 'private',
            name: sellerData.name || 'Unknown',
            avatarUrl: sellerData.avatarUrl,
            phone: sellerData.phone || '',
            agencyName: sellerData.agencyName || agency.name,
            agencyLogo: agency.logo,
            agencyId: String(agency._id),
          } : {
            type: 'agent',
            name: 'Unknown Agent',
            phone: '',
            agencyName: agency.name,
            agencyLogo: agency.logo,
            agencyId: String(agency._id),
          },
        };
      });

      agencyLogger.info(`✅ Found ${properties.length} properties for agency`);
    } catch (propertyError: any) {
      agencyLogger.error(`⚠️  Error fetching properties for agency ${agency._id}:`, propertyError.message);
      // Continue anyway, return agency without properties
      properties = [];
    }

    // Calculate sales statistics
    const soldProperties = properties.filter(p => p.status === 'sold');
    const twelveMonthsAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const soldPropertiesLast12Months = soldProperties.filter(p => {
      return p.soldAt && p.soldAt >= twelveMonthsAgo;
    });

    const soldPrices = soldProperties.map(p => p.price).filter(Boolean);
    const salesStats = {
      salesLast12Months: soldPropertiesLast12Months.length,
      totalSales: soldProperties.length,
      minPrice: soldPrices.length > 0 ? Math.min(...soldPrices) : 0,
      maxPrice: soldPrices.length > 0 ? Math.max(...soldPrices) : 0,
      averagePrice: soldPrices.length > 0
        ? soldPrices.reduce((sum, price) => sum + price, 0) / soldPrices.length
        : 0,
    };

    // Include sales stats and calculated totals in agency object
    const activeProperties = properties.filter(p => p.status === 'active' || p.status === 'pending');

    // SECURITY: Only include invitationCode for owner, admins, or existing members
    const requestUserId = req.user ? String((req.user as IUser)._id) : null;
    const ownerId = String(agency.ownerId._id || agency.ownerId);
    const adminIds = agency.admins?.map((id: any) => String(id._id || id)) || [];
    const agentIds = agency.agents.map((agent: any) => String(agent._id || agent));
    const isMemberOrAdmin = requestUserId && (
      requestUserId === ownerId ||
      adminIds.includes(requestUserId) ||
      agentIds.includes(requestUserId)
    );

    const { invitationCode, __v, agentCoupons: rawAgentCoupons, ...publicAgencyFields } = agency.toObject();

    // Transform agentCoupons from raw array to structured object for frontend
    let agentCouponsData: Record<string, unknown> | undefined;
    if (isMemberOrAdmin && rawAgentCoupons && Array.isArray(rawAgentCoupons)) {
      const populatedCoupons = await Promise.all(
        rawAgentCoupons.map(async (c: any) => {
          let usedByInfo = null;
          if (c.usedBy) {
            try {
              const user = await User.findById(c.usedBy, 'name email').lean();
              if (user) {
                usedByInfo = { _id: String((user as any)._id), name: (user as any).name, email: (user as any).email };
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
      );

      agentCouponsData = {
        coupons: populatedCoupons,
        available: populatedCoupons.filter((c) => c.status === 'available').length,
        used: populatedCoupons.filter((c) => c.status === 'used').length,
        expired: populatedCoupons.filter((c) => c.status === 'expired').length,
        canGenerateMore: populatedCoupons.filter((c) => c.status === 'available').length < 5,
      };
    }

    const agencyWithStats = {
      ...publicAgencyFields,
      ...(isMemberOrAdmin ? { invitationCode } : {}),
      ...(agentCouponsData ? { agentCoupons: agentCouponsData } : {}),
      salesStats,
      totalProperties: activeProperties.length,
      totalAgents: agency.agents?.length || 0,
    };

    res.json({ agency: agencyWithStats, properties });
  } catch (error: any) {
    agencyLogger.error('❌ Get agency error:', error);
    agencyLogger.error('Stack trace:', error.stack);
    res.status(500).json({
      message: 'Error fetching agency',
      identifier: getParam(req, 'idOrSlug')
    });
  }
};

// @desc    Update agency profile
// @route   PUT /api/agencies/:id
// @access  Private
export const updateAgency = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if user is owner or admin
    const userId = String((req.user as IUser)._id);
    const isOwner = agency.ownerId.toString() === userId;
    const isAdmin = agency.admins && agency.admins.some(adminId => adminId.toString() === userId);

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Not authorized to update this agency. Only the owner or agency admins can edit.' });
      return;
    }

    // Whitelist of updatable fields - prevents overwriting protected fields
    const {
      name, description, website, phone, email, address,
      city, country, zipCode, lat, lng,
      facebookUrl, instagramUrl, linkedinUrl, twitterUrl,
      yearsInBusiness, specialties, registrationNumber,
      certifications, languages, businessHours,
      coverGradient, coverImage,
      logoPosition, coverPosition,
    } = req.body;

    // Validation
    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (!trimmed) {
        res.status(400).json({ message: 'Agency name is required' });
        return;
      }
      if (trimmed.length > 200) {
        res.status(400).json({ message: 'Agency name must be under 200 characters' });
        return;
      }
    }

    if (description !== undefined && typeof description === 'string' && description.length > 5000) {
      res.status(400).json({ message: 'Description must be under 5000 characters' });
      return;
    }

    // Validate URL fields
    const urlFields: Record<string, string | undefined> = { website, facebookUrl, instagramUrl, linkedinUrl, twitterUrl };
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
    if (lat !== undefined && lat !== null && lat !== 0) {
      const latNum = Number(lat);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        res.status(400).json({ message: 'Latitude must be between -90 and 90' });
        return;
      }
    }
    if (lng !== undefined && lng !== null && lng !== 0) {
      const lngNum = Number(lng);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        res.status(400).json({ message: 'Longitude must be between -180 and 180' });
        return;
      }
    }

    // Apply only whitelisted fields
    if (name !== undefined) agency.name = name.trim();
    if (description !== undefined) agency.description = description;
    if (website !== undefined) agency.website = website;
    if (email !== undefined) agency.email = email;
    if (city !== undefined) agency.city = city;
    if (country !== undefined) agency.country = country;
    if (zipCode !== undefined) agency.zipCode = zipCode;
    if (lat !== undefined) agency.lat = Number(lat);
    if (lng !== undefined) agency.lng = Number(lng);
    if (facebookUrl !== undefined) agency.facebookUrl = facebookUrl;
    if (instagramUrl !== undefined) agency.instagramUrl = instagramUrl;
    if (linkedinUrl !== undefined) agency.linkedinUrl = linkedinUrl;
    if (twitterUrl !== undefined) agency.twitterUrl = twitterUrl;
    if (yearsInBusiness !== undefined) agency.yearsInBusiness = Number(yearsInBusiness);
    if (specialties !== undefined) agency.specialties = specialties;
    if (registrationNumber !== undefined) (agency as any).registrationNumber = typeof registrationNumber === 'string' ? registrationNumber.trim() : registrationNumber;
    if (certifications !== undefined) agency.certifications = certifications;
    if (languages !== undefined) agency.languages = languages;
    if (businessHours !== undefined) agency.businessHours = businessHours;
    if (coverGradient !== undefined) (agency as any).coverGradient = coverGradient;
    if (coverImage !== undefined) (agency as any).coverImage = coverImage;
    if (logoPosition !== undefined && typeof logoPosition === 'object') {
      const rawLx = Number(logoPosition.x);
      const rawLy = Number(logoPosition.y);
      const lx = Math.max(0, Math.min(100, isNaN(rawLx) ? 50 : rawLx));
      const ly = Math.max(0, Math.min(100, isNaN(rawLy) ? 50 : rawLy));
      (agency as any).logoPosition = { x: lx, y: ly };
    }
    if (coverPosition !== undefined && typeof coverPosition === 'object') {
      const rawCx = Number(coverPosition.x);
      const rawCy = Number(coverPosition.y);
      const cx = Math.max(0, Math.min(100, isNaN(rawCx) ? 50 : rawCx));
      const cy = Math.max(0, Math.min(100, isNaN(rawCy) ? 50 : rawCy));
      (agency as any).coverPosition = { x: cx, y: cy };
    }

    // Handle invitation code regeneration
    if (req.body.generateInvitationCode) {
      const { generateSecureRandomString } = await import('../utils/secureRandom');
      const randomCode = generateSecureRandomString(6);
      const nameCode = agency.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
      agency.invitationCode = `AGY-${nameCode}-${randomCode}`;
    }

    // Handle encrypted fields - force mark as modified so the encryption
    // pre-save hook re-encrypts them (after post-findOne decryption,
    // isModified() may return false for unchanged values)
    if (phone !== undefined) {
      agency.phone = phone;
      agency.markModified('phone');
    }
    if (address !== undefined) {
      agency.address = address;
      agency.markModified('address');
    }

    await agency.save();

    await agency.populate('ownerId', 'name email phone avatarUrl avatarOptions gender');
    await agency.populate('agents', 'name email phone avatarUrl avatarOptions gender role agencyName');

    res.json({ agency });
  } catch (error: any) {
    agencyLogger.error('Update agency error:', error);

    // Handle specific Mongoose errors with descriptive messages
    if (error.code === 11000) {
      res.status(409).json({ message: 'An agency with this name or slug already exists' });
    } else if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join('. ') });
    } else {
      res.status(500).json({ message: 'Error updating agency' });
    }
  }
};

// @desc    Add agent to agency
// @route   POST /api/agencies/:id/agents
// @access  Private
export const addAgentToAgency = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const { agentUserId } = req.body;
    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check ownership
    if (agency.ownerId.toString() !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to modify this agency' });
      return;
    }

    // Check if agent user exists and has agent role
    const agentUser = await User.findById(agentUserId);
    if (!agentUser) {
      res.status(404).json({ message: 'Agent user not found' });
      return;
    }

    if (agentUser.role !== 'agent') {
      res.status(400).json({ message: 'User must have agent role' });
      return;
    }

    // Check if agent is already in the agency
    if (agency.agents.some(id => id.toString() === agentUserId)) {
      res.status(400).json({ message: 'Agent is already part of this agency' });
      return;
    }

    // Add agent to agency
    agency.agents.push(agentUserId);
    agency.totalAgents = agency.agents.length;
    await agency.save();

    // Update agent's agency info
    agentUser.agencyName = agency.name;
    agentUser.agencyId = agency._id as mongoose.Types.ObjectId;
    await agentUser.save();

    // Sync agent's attributes (languages, service areas, specializations, certifications) to agency
    await syncAgentAttributesToAgency(agency, agentUserId);

    await agency.populate('agents', 'name email phone avatarUrl avatarOptions gender role agencyName');

    res.json({ agency });
  } catch (error: any) {
    agencyLogger.error('Add agent error:', error);
    res.status(500).json({ message: 'Error adding agent to agency' });
  }
};

// @desc    Remove agent from agency
// @route   DELETE /api/agencies/:id/agents/:agentId
// @access  Private
export const removeAgentFromAgency = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const agentId = getObjectIdParam(req, res, 'agentId');
    if (!agentId) return;

    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check ownership
    if (agency.ownerId.toString() !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to modify this agency' });
      return;
    }

    // Remove agent from agency
    agency.agents = agency.agents.filter(
      id => id.toString() !== agentId
    );
    agency.totalAgents = agency.agents.length;
    await agency.save();

    // Clear ALL agent's agency info and downgrade subscription in User model
    // This must happen directly (not rely on transaction) to guarantee cleanup
    const agentUser = await User.findById(agentId);
    if (agentUser) {
      // Clear top-level agency fields
      agentUser.agencyName = undefined;
      agentUser.agencyId = undefined;
      agentUser.isSubscribed = false;
      agentUser.subscriptionPlan = undefined;

      // Clear nested agency object
      if (agentUser.agency) {
        agentUser.agency.agencyId = undefined;
        agentUser.agency.role = 'none';
        agentUser.agency.joinedAt = undefined;
        agentUser.agency.couponCode = undefined;
      }

      // Downgrade subscription to free tier
      if (agentUser.subscription) {
        agentUser.subscription.tier = 'free' as any;
        agentUser.subscription.status = 'expired' as any;
        agentUser.subscription.listingsLimit = FREE_TIER_LIMITS.LISTINGS;
        agentUser.subscription.savedSearchesLimit = FREE_TIER_LIMITS.SAVED_SEARCHES;
        agentUser.subscription.expiresAt = undefined;
        if (agentUser.subscription.promotionCoupons) {
          agentUser.subscription.promotionCoupons.monthly = FREE_TIER_LIMITS.PROMOTION_COUPONS;
          agentUser.subscription.promotionCoupons.available = FREE_TIER_LIMITS.PROMOTION_COUPONS;
          agentUser.subscription.promotionCoupons.used = 0;
          agentUser.subscription.promotionCoupons.rollover = 0;
        }
      }
      agentUser.subscriptionStatus = 'expired';

      await agentUser.save();
      agencyLogger.info(`✅ Cleared all agency + subscription fields for removed agent ${agentId}`);
    }

    // Clear agent's agency info in Agent model
    const agentRecord = await Agent.findOne({ userId: agentId });
    if (agentRecord) {
      agentRecord.agencyName = 'Independent Agent';
      agentRecord.agencyId = undefined;
      await agentRecord.save();
    }

    // Revoke Subscription document and free coupon (best-effort — user is already cleaned up above)
    let subscriptionRevoked = false;
    try {
      const revokeResult = await revokeAgencyCouponSubscription(agentId, id);
      subscriptionRevoked = revokeResult.revoked;
      if (subscriptionRevoked) {
        agencyLogger.info(`✅ Subscription doc + coupon revoked for removed agent ${agentId}`);
      }
    } catch (revokeError: any) {
      agencyLogger.error(`Failed to revoke subscription doc for removed agent ${agentId}:`, revokeError);
      // Fallback: directly free the coupon even if Subscription doc revocation failed
      try {
        const freshAgency = await Agency.findById(id);
        if (freshAgency?.agentCoupons) {
          const coupon = freshAgency.agentCoupons.find(
            (c: any) => c.usedBy && String(c.usedBy) === String(agentId) && c.status === 'used'
          );
          if (coupon) {
            coupon.status = 'available';
            coupon.usedBy = undefined;
            coupon.usedAt = undefined;
            await freshAgency.save();
            agencyLogger.info(`✅ Fallback: freed coupon ${coupon.code} for removed agent ${agentId}`);
          }
        }
      } catch (fallbackError: any) {
        agencyLogger.error(`Fallback coupon freeing also failed for agent ${agentId}:`, fallbackError);
      }
    }
    // User cleanup already done above, so mark as revoked for socket event
    subscriptionRevoked = true;

    // Recalculate agency attributes after agent removal
    await recalculateAgencyAttributes(id);

    // Emit real-time update to the removed agent's frontend
    const io = getSocketInstance();
    if (io) {
      io.emit(`user-update-${String(agentId)}`, {
        type: 'agency-left',
        message: `You have been removed from ${agency.name}.`,
        user: {
          id: String(agentId),
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
    }

    // Notify the agency dashboard in real-time (coupon freed, agent list changed)
    if (io) {
      io.emit(`agency-update-${String(agency._id)}`, {
        type: 'member-removed',
        agencyId: String(agency._id),
        agentId: String(agentId),
        agentName: agentUser?.name || 'Agent',
        subscriptionRevoked,
        totalAgents: agency.agents.length,
      });
    }

    // Notify the removed agent
    if (agentUser) {
      createNotificationWithPush({
        userId: agentUser._id,
        type: 'agent_left_agency',
        title: 'Removed from Agency',
        message: `You have been removed from ${agency.name}.${subscriptionRevoked ? ' Your agency-provided Pro plan has been canceled.' : ''}`,
        icon: 'user-minus',
        priority: 'high',
        data: {
          agencyId: String(agency._id),
          agencyName: agency.name,
          subscriptionRevoked,
        },
      }).catch(err => agencyLogger.error('Failed to create removal notification:', err));
    }

    res.json({ message: 'Agent removed from agency successfully', subscriptionRevoked });
  } catch (error: any) {
    agencyLogger.error('Remove agent error:', error);
    res.status(500).json({ message: 'Error removing agent from agency' });
  }
};

// @desc    Get featured agencies for rotation (homepage)
// @route   GET /api/agencies/featured/rotation
// @access  Public
export const getFeaturedAgencies = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { limit = 5 } = req.query;

    // Get current month to determine rotation
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();

    // Get all featured agencies with agents populated
    const agencies = await Agency.find({ isFeatured: true })
      .populate('ownerId', 'name email phone avatarUrl avatarOptions gender')
      .populate('agents', '_id')
      .sort({ adRotationOrder: 1, createdAt: -1 })
      .lean();

    // Import Property model dynamically to avoid circular dependencies
    const Property = (await import('../models/Property')).default;

    // Calculate totalProperties for each agency
    const agenciesWithCounts = await Promise.all(
      agencies.map(async (agency: any) => {
        const agentIds = agency.agents?.map((agent: any) => agent._id) || [];
        const propertyCount = await Property.countDocuments({
          sellerId: { $in: agentIds },
          status: { $in: ['active', 'pending'] }
        });
        return {
          ...agency,
          totalProperties: propertyCount,
          totalAgents: agency.agents?.length || 0,
        };
      })
    );

    // Rotate based on month
    const rotatedAgencies = [];
    const totalAgencies = agenciesWithCounts.length;

    if (totalAgencies > 0) {
      const startIndex = currentMonth % totalAgencies;
      const limitNum = Number(limit);

      for (let i = 0; i < Math.min(limitNum, totalAgencies); i++) {
        const index = (startIndex + i) % totalAgencies;
        rotatedAgencies.push(agenciesWithCounts[index]);
      }
    }

    res.json({ agencies: rotatedAgencies });
  } catch (error: any) {
    agencyLogger.error('Get featured agencies error:', error);
    res.status(500).json({ message: 'Error fetching featured agencies' });
  }
};

// @desc    Upload agency logo
// @route   POST /api/agencies/:id/upload-logo
// @access  Private
export const uploadAgencyLogo = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      agencyLogger.error('Cloudinary not configured');
      res.status(500).json({ message: 'Image upload service not configured' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    // Check ownership or admin status
    const isOwner = agency.ownerId.toString() === userId;
    const isAdmin = agency.admins && agency.admins.some(adminId => adminId.toString() === userId);

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Not authorized to update this agency' });
      return;
    }

    agencyLogger.info('Uploading logo for agency:', agency._id);

    // Delete old logo if exists
    if (agency.logoPublicId) {
      try {
        await deleteImage(agency.logoPublicId);
      } catch (deleteError) {
        agencyLogger.info('Could not delete old logo:', deleteError);
      }
    }

    // Upload logo using centralized cloudinaryService
    // Path: balkan-estate/agencies/{agencyId}/logo/
    const uploadResult = await uploadImage(req.file.buffer, {
      userId,
      agencyId: String(agency._id),
      type: 'agency-logo',
      maxWidth: 400,
      maxHeight: 400,
    });

    // Update agency with new logo URL and publicId
    agency.logo = uploadResult.url;
    agency.logoPublicId = uploadResult.publicId;
    await agency.save();

    agencyLogger.info('✅ Logo uploaded successfully:', uploadResult.url);

    res.json({ logo: uploadResult.url, agency });
  } catch (error: any) {
    agencyLogger.error('Upload agency logo error:', error);
    res.status(500).json({ message: 'Error uploading logo' });
  }
};

// @desc    Upload agency cover image
// @route   POST /api/agencies/:id/upload-cover
// @access  Private
export const uploadAgencyCover = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      agencyLogger.error('Cloudinary not configured');
      res.status(500).json({ message: 'Image upload service not configured' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    // Check ownership or admin status
    const isOwner = agency.ownerId.toString() === userId;
    const isAdmin = agency.admins && agency.admins.some(adminId => adminId.toString() === userId);

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Not authorized to update this agency' });
      return;
    }

    agencyLogger.info('Uploading cover for agency:', agency._id);

    // Delete old cover if exists
    if (agency.coverImagePublicId) {
      try {
        await deleteImage(agency.coverImagePublicId);
      } catch (deleteError) {
        agencyLogger.info('Could not delete old cover:', deleteError);
      }
    }

    // Upload cover using centralized cloudinaryService
    // Path: balkan-estate/agencies/{agencyId}/cover/
    const uploadResult = await uploadImage(req.file.buffer, {
      userId,
      agencyId: String(agency._id),
      type: 'agency-cover',
      maxWidth: 1920,
      maxHeight: 600,
    });

    // Update agency with new cover URL and publicId
    agency.coverImage = uploadResult.url;
    agency.coverImagePublicId = uploadResult.publicId;
    await agency.save();

    agencyLogger.info('✅ Cover uploaded successfully:', uploadResult.url);

    res.json({ coverImage: uploadResult.url, agency });
  } catch (error: any) {
    agencyLogger.error('Upload agency cover error:', error);
    res.status(500).json({ message: 'Error uploading cover image' });
  }
};

// @desc    Join agency by invitation code
// @route   POST /api/agencies/join-by-code
// @access  Private
export const joinAgencyByInvitationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { invitationCode, agencyId } = req.body;

    if (!invitationCode) {
      res.status(400).json({ message: 'Invitation code is required' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user is an agent
    if (user.role !== 'agent') {
      res.status(403).json({ message: 'Only agents can join agencies' });
      return;
    }

    // Check if user has an active Pro subscription
    const userTier = user.subscription?.tier;
    const userSubStatus = user.subscription?.status;
    const hasProSubscription =
      (userTier === 'pro' || userTier === 'agency_owner') &&
      (userSubStatus === 'active' || userSubStatus === 'trial');

    if (!hasProSubscription) {
      res.status(403).json({
        message: 'Pro subscription required to join an agency. Please upgrade your plan.',
      });
      return;
    }

    // Find agency by invitation code
    const agency = await Agency.findOne({ invitationCode: invitationCode.toUpperCase() });

    if (!agency) {
      res.status(404).json({ message: 'Invalid invitation code' });
      return;
    }

    // If agencyId is provided, validate that the invitation code matches the selected agency
    if (agencyId && String(agency._id) !== String(agencyId)) {
      res.status(400).json({
        message: `This invitation code does not belong to the selected agency. Please verify the code and try again.`
      });
      return;
    }

    // Check if agent is already in the agency
    if (agency.agents.some(id => id.toString() === String(user._id))) {
      res.status(400).json({ message: 'You are already a member of this agency' });
      return;
    }

    // If agent is already in another agency, remove them from the old one first
    if (user.agencyId && String(user.agencyId) !== String(agency._id)) {
      try {
        const oldAgency = await Agency.findById(user.agencyId);
        if (oldAgency) {
          // Remove agent from old agency's agents array
          oldAgency.agents = oldAgency.agents.filter(
            agentId => agentId.toString() !== String(user._id)
          );
          oldAgency.totalAgents = oldAgency.agents.length;
          await oldAgency.save();
          agencyLogger.info(`✅ Removed agent from old agency: ${oldAgency.name}`);
        }
      } catch (error) {
        agencyLogger.error('Error removing agent from old agency:', error);
        // Continue anyway - we still want to add them to the new agency
      }
    }

    // Get agent product limits from DB, fallback to defaults
    const agentProduct = await Product.findOne({ productId: 'agency_agent_yearly' }).lean();
    const agentListingsLimit = agentProduct?.listingsLimit ?? 30;

    // Determine subscription expiration from the agency's subscription
    const agencyExpiresAt = agency.subscription?.expiresAt ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Add agent to new agency
    const userObjectId = user._id as unknown as mongoose.Types.ObjectId;
    agency.agents.push(userObjectId);
    agency.totalAgents = agency.agents.length;

    // Add to agentDetails for tracking
    if (!agency.agentDetails) {
      agency.agentDetails = [];
    }
    const existingAgentDetail = agency.agentDetails.find(
      ad => String(ad.userId) === String(user._id)
    );
    if (!existingAgentDetail) {
      agency.agentDetails.push({
        userId: user._id,
        joinedAt: new Date(),
        isActive: true,
      } as any);
    } else {
      existingAgentDetail.isActive = true;
      existingAgentDetail.leftAt = undefined;
    }

    // Update agency stats
    agency.stats.totalAgents = agency.agents.length;
    await agency.save();

    // Upgrade agent's subscription to agency_agent tier
    if (!user.subscription) {
      user.subscription = {
        tier: 'free',
        status: 'active',
        listingsLimit: 0,
        activeListingsCount: 0,
        privateSellerCount: 0,
        agentCount: 0,
        promotionCoupons: {
          monthly: 0,
          available: 0,
          used: 0,
          rollover: 0,
          lastRefresh: new Date(),
        },
        savedSearchesLimit: 1,
        totalPaid: 0,
      };
    }

    user.subscription.tier = 'agency_agent';
    user.subscription.status = 'active';
    user.subscription.listingsLimit = agentListingsLimit;
    user.subscription.expiresAt = agencyExpiresAt;
    // Initialize monthly listing tracking (30 per month, resets from subscription start)
    user.subscription.monthlyListingsCreated = 0;
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 30);
    nextReset.setHours(0, 0, 0, 0);
    user.subscription.listingsMonthResetDate = nextReset;
    if (user.subscription.promotionCoupons) {
      user.subscription.promotionCoupons.monthly = 0; // Agency agents share the agency pool
    }

    // Associate user with agency
    if (!user.agency) {
      user.agency = {
        role: 'none',
      };
    }
    user.agency.agencyId = agency._id as any;
    user.agency.role = 'agent';
    user.agency.joinedAt = new Date();

    // Set top-level agency fields
    user.agencyName = agency.name;
    user.agencyId = agency._id as mongoose.Types.ObjectId;
    user.isSubscribed = true;
    user.subscriptionPlan = 'agency_agent_yearly';

    await user.save();

    // Create or update Subscription document for proper tracking
    const existingSubscription = await Subscription.findOne({ userId: user._id });
    const inviteToken = `invite_${agency._id}_${user._id}`;

    if (existingSubscription) {
      existingSubscription.productId = 'agency_agent_yearly';
      existingSubscription.store = 'agency_coupon';
      existingSubscription.purchaseToken = inviteToken;
      existingSubscription.status = 'active';
      existingSubscription.startDate = new Date();
      existingSubscription.renewalDate = agencyExpiresAt;
      existingSubscription.expirationDate = agencyExpiresAt;
      existingSubscription.autoRenewing = true;
      existingSubscription.price = 0;
      existingSubscription.currency = 'EUR';
      existingSubscription.isAcknowledged = true;
      existingSubscription.expiryReminderSent = false;
      await existingSubscription.save();
      agencyLogger.info(`✅ Updated Subscription document for user ${user._id} (invitation code join)`);
    } else {
      await Subscription.create({
        userId: user._id,
        productId: 'agency_agent_yearly',
        store: 'agency_coupon',
        purchaseToken: inviteToken,
        status: 'active',
        startDate: new Date(),
        renewalDate: agencyExpiresAt,
        expirationDate: agencyExpiresAt,
        autoRenewing: true,
        price: 0,
        currency: 'EUR',
        isAcknowledged: true,
      });
      agencyLogger.info(`✅ Created Subscription document for user ${user._id} (invitation code join)`);
    }

    // Also update the Agent document with both agency name and ID
    const Agent = mongoose.model('Agent');
    const updatedAgent = await Agent.findOneAndUpdate(
      { userId: user._id },
      {
        agencyName: agency.name,
        agencyId: agency._id,
      },
      { new: true }
    );

    agencyLogger.info(`✅ User ${user._id} joined agency ${agency.name} via invitation code with agency_agent subscription`);

    // Sync agent's attributes (languages, service areas, specializations, certifications) to agency
    const syncResult = await syncAgentAttributesToAgency(agency, user._id);
    if (syncResult.synced) {
      agencyLogger.info(`✅ Agent attributes synced to agency on invitation code join`);
    }

    // Send in-app notifications (non-blocking)
    try {
      // Notify agency owner: new agent joined
      await createNotificationWithPush({
        userId: agency.ownerId,
        type: 'agent_joined_agency',
        title: 'New Agent Joined',
        message: `${user.name || 'An agent'} has joined ${agency.name} using an invitation code.`,
        icon: 'user-plus',
        priority: 'normal',
        data: {
          agencyId: String(agency._id),
          agencySlug: agency.slug,
          agencyName: agency.name,
          agentName: user.name || 'Agent',
          agentEmail: user.email,
          totalAgents: agency.agents.length,
          actionUrl: `/agencies/${agency.slug || agency._id}`,
          actionLabel: 'View Agency',
        },
      });

      // Notify the joining agent: welcome to agency
      await createNotificationWithPush({
        userId: user._id,
        type: 'agency_join_welcome',
        title: `Welcome to ${agency.name}!`,
        message: `You have successfully joined ${agency.name}. You now have access to ${user.subscription.listingsLimit} listings.`,
        icon: 'building',
        priority: 'normal',
        data: {
          agencyId: String(agency._id),
          agencySlug: agency.slug,
          agencyName: agency.name,
          subscriptionTier: user.subscription.tier,
          listingsLimit: user.subscription.listingsLimit,
          actionUrl: `/agencies/${agency.slug || agency._id}`,
          actionLabel: 'View Agency',
        },
      });

      agencyLogger.info(`📨 In-app notifications sent for invitation code join`);
    } catch (notifError) {
      agencyLogger.error('Error sending in-app notifications:', notifError);
    }

    // Send email notifications (non-blocking)
    try {
      const { sendAgentJoinedAgencyEmail, sendAgencyNewMemberEmail } = await import('../services/emailService');
      await sendAgentJoinedAgencyEmail({
        agentEmail: user.email,
        agentName: user.name || 'Agent',
        agencyName: agency.name,
        agencyId: String(agency._id),
        subscriptionTier: user.subscription?.tier || 'pro',
        listingsLimit: user.subscription?.listingsLimit || 50,
        expiresAt: user.subscription?.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const owner = await User.findById(agency.ownerId);
      if (owner) {
        await sendAgencyNewMemberEmail({
          ownerEmail: owner.email,
          ownerName: owner.name || 'Agency Owner',
          newAgentName: user.name || 'Agent',
          newAgentEmail: user.email,
          agencyName: agency.name,
          agencyId: String(agency._id),
          couponCode: '',
          totalAgents: agency.agents.length,
        });
      }
    } catch (emailError) {
      agencyLogger.error('Error sending join emails:', emailError);
    }

    // Return complete user and agency data
    res.json({
      message: `Successfully joined ${agency.name}!`,
      agency: {
        id: agency._id,
        name: agency.name,
        slug: agency.slug,
        city: agency.city,
        country: agency.country,
        totalAgents: agency.totalAgents,
        totalProperties: agency.totalProperties,
      },
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        city: user.city,
        country: user.country,
        agencyName: user.agencyName,
        agencyId: user.agencyId,
        licenseNumber: user.licenseNumber,
        agentId: user.agentId,
        isSubscribed: user.isSubscribed,
        subscriptionPlan: user.subscriptionPlan,
        listingsCount: user.listingsCount,
      },
      subscription: {
        tier: user.subscription.tier,
        status: user.subscription.status,
        listingsLimit: user.subscription.listingsLimit,
        expiresAt: user.subscription.expiresAt,
      },
      agent: updatedAgent,
    });
  } catch (error: any) {
    agencyLogger.error('Join agency by invitation code error:', error);
    res.status(500).json({ message: 'Error joining agency' });
  }
};

// @desc    Verify invitation code for an agency
// @route   POST /api/agencies/:id/verify-code
// @access  Private
export const verifyInvitationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ valid: false, message: 'Invitation code is required' });
      return;
    }

    // Find the agency by ID
    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ valid: false, message: 'Agency not found' });
      return;
    }

    // Compare the invitation codes (case-insensitive)
    const isValid = agency.invitationCode &&
                    agency.invitationCode.toUpperCase() === code.toUpperCase();

    if (isValid) {
      agencyLogger.info(`✅ Valid invitation code for agency: ${agency.name}`);
      res.json({ valid: true, message: 'Invitation code is valid' });
    } else {
      agencyLogger.info(`❌ Invalid invitation code for agency: ${agency.name}`);
      res.json({ valid: false, message: 'Invalid invitation code' });
    }
  } catch (error: any) {
    agencyLogger.error('Verify invitation code error:', error);
    res.status(500).json({ valid: false, message: 'Error verifying invitation code' });
  }
};

// @desc    Find agency by invitation code
// @route   POST /api/agencies/find-by-code
// @access  Private
export const findAgencyByInvitationCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ message: 'Invitation code is required' });
      return;
    }

    agencyLogger.info(`🔍 Looking up agency with invitation code: ${code.toUpperCase()}`);

    // Find agency by invitation code
    const agency = await Agency.findOne({ invitationCode: code.toUpperCase() })
      .populate('ownerId', 'name email');

    if (!agency) {
      agencyLogger.info(`❌ No agency found with invitation code: ${code.toUpperCase()}`);
      res.status(404).json({ message: 'Invalid invitation code. Please check and try again.' });
      return;
    }

    agencyLogger.info(`✅ Found agency: ${agency.name} (${agency._id})`);

    res.json({
      success: true,
      agency: {
        _id: agency._id,
        name: agency.name,
        description: agency.description,
        city: agency.city,
        country: agency.country,
        slug: agency.slug,
        logo: agency.logo,
        coverImage: agency.coverImage,
        totalAgents: agency.totalAgents || 0,
      }
    });
  } catch (error: any) {
    agencyLogger.error('Find agency by invitation code error:', error);
    res.status(500).json({ message: 'Error looking up agency' });
  }
};

// @desc    Add admin to agency
// @route   POST /api/agencies/:id/admins
// @access  Private (Owner only)
export const addAgencyAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const { userId } = req.body;
    const currentUser = req.user as IUser;

    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    // Find the agency
    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if current user is the owner
    if (String(agency.ownerId) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Only the agency owner can add admins' });
      return;
    }

    // Check if user is already an admin
    if (agency.admins && agency.admins.some(adminId => String(adminId) === String(userId))) {
      res.status(400).json({ message: 'User is already an admin' });
      return;
    }

    // Check if user is an agent in this agency
    if (!agency.agents.some(agentId => String(agentId) === String(userId))) {
      res.status(400).json({ message: 'User must be an agent in this agency to become an admin' });
      return;
    }

    // Add user to admins array
    if (!agency.admins) {
      agency.admins = [];
    }
    agency.admins.push(userId as unknown as mongoose.Types.ObjectId);
    await agency.save();

    agencyLogger.info(`✅ Added admin to agency: ${agency.name}`);
    res.json({ message: 'Admin added successfully', agency });
  } catch (error: any) {
    agencyLogger.error('Add agency admin error:', error);
    res.status(500).json({ message: 'Error adding admin' });
  }
};

// @desc    Remove admin from agency
// @route   DELETE /api/agencies/:id/admins/:userId
// @access  Private (Owner only)
export const removeAgencyAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;
    const currentUser = req.user as IUser;

    // Find the agency
    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if current user is the owner
    if (String(agency.ownerId) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Only the agency owner can remove admins' });
      return;
    }

    // Check if user is an admin
    if (!agency.admins || !agency.admins.some(adminId => String(adminId) === String(userId))) {
      res.status(400).json({ message: 'User is not an admin' });
      return;
    }

    // Remove user from admins array
    agency.admins = agency.admins.filter(adminId => String(adminId) !== String(userId));
    await agency.save();

    agencyLogger.info(`✅ Removed admin from agency: ${agency.name}`);
    res.json({ message: 'Admin removed successfully', agency });
  } catch (error: any) {
    agencyLogger.error('Remove agency admin error:', error);
    res.status(500).json({ message: 'Error removing admin' });
  }
};

// @desc    Leave agency (agent can leave their own agency)
// @route   POST /api/agencies/leave
// @access  Private
export const leaveAgency = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user has an agency
    if (!user.agencyId) {
      res.status(400).json({ message: 'You are not part of any agency' });
      return;
    }

    // Find the agency
    const agency = await Agency.findById(user.agencyId);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Prevent owner from leaving their own agency
    if (String(agency.ownerId) === String(user._id)) {
      res.status(403).json({
        message: 'Agency owners cannot leave their own agency. Please transfer ownership or delete the agency first.'
      });
      return;
    }

    const agencyName = agency.name;

    // Remove agent from agency's agents array
    agency.agents = agency.agents.filter(
      id => id.toString() !== String(user._id)
    );
    agency.totalAgents = agency.agents.length;

    // Also remove from admins array if they are an admin
    if (agency.admins && agency.admins.some(id => String(id) === String(user._id))) {
      agency.admins = agency.admins.filter(
        id => String(id) !== String(user._id)
      );
      agencyLogger.info(`✅ Removed user from admins of agency: ${agencyName}`);
    }

    await agency.save();

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
    agencyLogger.info(`✅ Cleared all agency + subscription fields for leaving agent ${user._id}`);

    // Clear agent's agency info in Agent model
    const agentRecord = await Agent.findOne({ userId: user._id });
    if (agentRecord) {
      agentRecord.agencyName = 'Independent Agent';
      agentRecord.agencyId = undefined;
      await agentRecord.save();
      agencyLogger.info(`✅ Updated agent profile to Independent Agent`);
    }

    // Revoke Subscription document and free coupon (best-effort — user is already cleaned up above)
    let subscriptionRevoked = true;
    try {
      await revokeAgencyCouponSubscription(user._id, agency._id);
      agencyLogger.info(`✅ Subscription doc + coupon revoked for agent ${user._id} leaving ${agencyName}`);
    } catch (revokeError: any) {
      agencyLogger.error(`Failed to revoke subscription doc for agent ${user._id}:`, revokeError);
      // Fallback: directly free the coupon even if Subscription doc revocation failed
      try {
        const freshAgency = await Agency.findById(agency._id);
        if (freshAgency?.agentCoupons) {
          const coupon = freshAgency.agentCoupons.find(
            (c: any) => c.usedBy && String(c.usedBy) === String(user._id) && c.status === 'used'
          );
          if (coupon) {
            coupon.status = 'available';
            coupon.usedBy = undefined;
            coupon.usedAt = undefined;
            await freshAgency.save();
            agencyLogger.info(`✅ Fallback: freed coupon ${coupon.code} for leaving agent ${user._id}`);
          }
        }
      } catch (fallbackError: any) {
        agencyLogger.error(`Fallback coupon freeing also failed for agent ${user._id}:`, fallbackError);
      }
    }

    agencyLogger.info(`✅ User ${user._id} left agency: ${agencyName}`);

    // Recalculate agency attributes after agent departure
    await recalculateAgencyAttributes(agency._id);

    // Notify agency dashboard in real-time (agent list + coupon status changed)
    const io = getSocketInstance();
    if (io) {
      io.emit(`agency-update-${String(agency._id)}`, {
        type: 'member-removed',
        agencyId: String(agency._id),
        agentId: String(user._id),
        agentName: user.name || 'Agent',
        subscriptionRevoked,
        totalAgents: agency.agents.length,
      });
    }

    // Notify agency owner that an agent left
    createNotificationWithPush({
      userId: agency.ownerId,
      type: 'agent_left_agency',
      title: 'Agent Left Agency',
      message: `${user.name || 'An agent'} has left ${agencyName}.${subscriptionRevoked ? ' Their agency-provided Pro plan has been revoked.' : ''}`,
      icon: 'user-minus',
      priority: 'normal',
      data: {
        agencyId: String(agency._id),
        agencySlug: agency.slug,
        agencyName: agencyName,
        agentName: user.name || 'Agent',
        agentEmail: user.email,
        totalAgents: agency.agents.length,
        subscriptionRevoked,
        actionUrl: `/agency/${agency.slug || agency._id}`,
        actionLabel: 'View Agency',
      },
    }).catch(err => agencyLogger.error('Failed to create leave notification:', err));

    res.json({
      message: `Successfully left ${agencyName}`,
      subscriptionRevoked,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
        agencyName: user.agencyName,
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
    agencyLogger.error('Leave agency error:', error);
    res.status(500).json({ message: 'Error leaving agency' });
  }
};

// @desc    Generate agent coupon codes (5 yearly Pro subscriptions)
// @route   POST /api/agencies/:id/coupons/generate
// @access  Private (Agency owner only)
export const generateAgentCoupons = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if user is the agency owner
    if (String(agency.ownerId) !== String(currentUser._id)) {
      res.status(403).json({
        message: 'Only agency owner can generate coupon codes',
        code: 'OWNER_ONLY'
      });
      return;
    }

    // Check if agency subscription is active
    if (!agency.isSubscriptionActive()) {
      res.status(403).json({
        message: 'Agency subscription must be active to generate coupons',
        code: 'SUBSCRIPTION_INACTIVE',
        subscriptionStatus: agency.subscription.status,
        expiresAt: agency.subscription.expiresAt,
      });
      return;
    }

    // Fetch the enterprise product to get the max coupons limit dynamically
    const enterpriseProduct = await Product.findOne({ productId: 'agency_yearly' }).lean();
    const maxAgentCoupons: number = enterpriseProduct?.agentCoupons ?? ENTERPRISE_TIER_LIMITS.TEAM_MEMBERS;

    const availableCoupons = (agency.agentCoupons ?? []).filter(c => c.status === 'available').length;

    if (availableCoupons >= maxAgentCoupons) {
      res.status(400).json({
        message: `Maximum of ${maxAgentCoupons} agent coupons can be active at once. Revoke or wait for coupons to be used.`,
        code: 'MAX_COUPONS_REACHED',
        currentCoupons: availableCoupons,
        maxAllowed: maxAgentCoupons,
      });
      return;
    }

    const couponsToGenerate = maxAgentCoupons - availableCoupons;

    // Expiry aligned with agency subscription if available, otherwise 1 year
    const agencyExpiry = agency.subscription?.expiresAt;
    const couponExpiry = agencyExpiry && new Date(agencyExpiry) > new Date()
      ? new Date(agencyExpiry)
      : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

    const newCoupons = [];
    for (let i = 0; i < couponsToGenerate; i++) {
      const code = agency.generateCouponCode();
      if (!code || !/^[A-Z0-9]{2,6}-[A-Z0-9]{8}$/.test(code)) {
        agencyLogger.error(`Invalid coupon code generated for agency ${agency.name}: "${code}"`);
        continue;
      }

      agency.agentCoupons.push({
        code,
        generatedAt: new Date(),
        expiresAt: couponExpiry,
        status: 'available',
      } as any);

      newCoupons.push({ code, expiresAt: couponExpiry });
    }

    if (newCoupons.length === 0) {
      res.status(500).json({
        message: 'Failed to generate valid coupon codes',
        code: 'GENERATION_FAILED',
      });
      return;
    }

    await agency.save();

    agencyLogger.info(`✅ Generated ${couponsToGenerate} agent coupons for agency ${agency.name}`);

    res.status(200).json({
      message: `Successfully generated ${couponsToGenerate} agent coupon codes`,
      coupons: newCoupons,
      totalAvailable: agency.agentCoupons.filter(c => c.status === 'available').length,
    });
  } catch (error: any) {
    agencyLogger.error('Generate agent coupons error:', error);
    res.status(500).json({
      message: 'Error generating coupons',
    });
  }
};

// @desc    Redeem agent coupon code (get yearly Pro subscription)
// @route   POST /api/agencies/coupons/redeem
// @access  Private
export const redeemAgentCoupon = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // Normalize and type-validate the coupon code
    const rawCode = req.body.couponCode;
    if (!rawCode || typeof rawCode !== 'string') {
      res.status(400).json({
        message: 'Coupon code is required',
        code: 'MISSING_COUPON_CODE',
      });
      return;
    }
    const couponCode = rawCode.trim().toUpperCase();
    if (!couponCode) {
      res.status(400).json({
        message: 'Coupon code cannot be empty',
        code: 'MISSING_COUPON_CODE',
      });
      return;
    }

    // Validate format before hitting the DB: agency-prefix + 8 alphanumeric chars
    const COUPON_FORMAT = /^[A-Z0-9]{2,6}-[A-Z0-9]{8}$/;
    if (!COUPON_FORMAT.test(couponCode)) {
      res.status(400).json({
        message: 'Invalid coupon code format',
        code: 'INVALID_COUPON_FORMAT',
      });
      return;
    }

    // Find agency with this coupon code
    const agency = await Agency.findOne({
      'agentCoupons.code': couponCode,
    });

    if (!agency) {
      res.status(404).json({
        message: 'Invalid coupon code',
        code: 'INVALID_COUPON',
      });
      return;
    }

    // Find the specific coupon (null-safe array access)
    const coupon = agency.agentCoupons?.find(c => c.code === couponCode);
    if (!coupon) {
      res.status(404).json({
        message: 'Coupon not found',
        code: 'COUPON_NOT_FOUND',
      });
      return;
    }

    // Check coupon status
    if (coupon.status === 'used') {
      res.status(400).json({
        message: 'This coupon has already been used',
        code: 'COUPON_ALREADY_USED',
        usedAt: coupon.usedAt,
      });
      return;
    }

    // Validate expiration date is parseable before comparing
    const expiryDate = new Date(coupon.expiresAt);
    if (isNaN(expiryDate.getTime())) {
      agencyLogger.error(`Coupon ${couponCode} has invalid expiresAt value: ${coupon.expiresAt}`);
      res.status(500).json({
        message: 'Coupon has an invalid expiration date',
        code: 'INVALID_COUPON_DATA',
      });
      return;
    }
    if (coupon.status === 'expired' || expiryDate < new Date()) {
      coupon.status = 'expired';
      await agency.save();
      res.status(400).json({
        message: 'This coupon has expired',
        code: 'COUPON_EXPIRED',
        expiresAt: coupon.expiresAt,
      });
      return;
    }

    // Check if agency subscription is still active
    if (!agency.isSubscriptionActive()) {
      res.status(403).json({
        message: 'Agency subscription is no longer active. Coupons cannot be redeemed.',
        code: 'AGENCY_SUBSCRIPTION_INACTIVE'
      });
      return;
    }

    const [user, agentProduct] = await Promise.all([
      User.findById(currentUser._id),
      Product.findOne({ productId: 'agency_agent_yearly' }).lean(),
    ]);
    if (!user) {
      res.status(404).json({ message: 'User not found', code: 'USER_NOT_FOUND' });
      return;
    }

    // Dynamic limits from DB product, fallback to constants
    const agentListingsLimit = agentProduct?.listingsLimit ?? 30;

    // Initialize subscription if doesn't exist
    if (!user.subscription) {
      user.subscription = {
        tier: 'free',
        status: 'active',
        listingsLimit: agentListingsLimit,
        activeListingsCount: 0,
        privateSellerCount: 0,
        agentCount: 0,
        promotionCoupons: {
          monthly: 0,
          available: 0,
          used: 0,
          rollover: 0,
          lastRefresh: new Date(),
        },
        savedSearchesLimit: 1,
        totalPaid: 0,
      };
    }

    // Create or update Subscription document FIRST — if this fails (e.g. duplicate
    // key) we haven't mutated user/agency yet, so state stays consistent.
    const subscriptionExpiresAt = new Date(coupon.expiresAt);
    const uniqueToken = `${couponCode}_${user._id}`;

    try {
      const existingSubscription = await Subscription.findOne({ userId: user._id });

      if (existingSubscription) {
        existingSubscription.productId = 'agency_agent_yearly';
        existingSubscription.store = 'agency_coupon';
        existingSubscription.purchaseToken = uniqueToken;
        existingSubscription.transactionId = uniqueToken;
        existingSubscription.status = 'active';
        existingSubscription.startDate = new Date();
        existingSubscription.renewalDate = subscriptionExpiresAt;
        existingSubscription.expirationDate = subscriptionExpiresAt;
        existingSubscription.autoRenewing = true;
        existingSubscription.price = 0;
        existingSubscription.currency = 'EUR';
        existingSubscription.isAcknowledged = true;
        existingSubscription.expiryReminderSent = false;
        await existingSubscription.save();
        agencyLogger.info(`✅ Updated Subscription document for user ${user._id}`);
      } else {
        await Subscription.create({
          userId: user._id,
          productId: 'agency_agent_yearly',
          store: 'agency_coupon',
          purchaseToken: uniqueToken,
          transactionId: uniqueToken,
          status: 'active',
          startDate: new Date(),
          renewalDate: subscriptionExpiresAt,
          expirationDate: subscriptionExpiresAt,
          autoRenewing: true,
          price: 0,
          currency: 'EUR',
          isAcknowledged: true,
        });
        agencyLogger.info(`✅ Created Subscription document for user ${user._id}`);
      }
    } catch (subError: any) {
      // Duplicate key (code 11000) means the subscription already exists for this
      // user+coupon combo — log and continue rather than failing the redemption.
      if (subError.code === 11000) {
        agencyLogger.warn(
          `Duplicate subscription key for user ${user._id} / coupon ${couponCode}, ` +
          `falling back to findOneAndUpdate`
        );
        await Subscription.findOneAndUpdate(
          { userId: user._id },
          {
            $set: {
              productId: 'agency_agent_yearly',
              store: 'agency_coupon',
              purchaseToken: uniqueToken,
              transactionId: uniqueToken,
              status: 'active',
              startDate: new Date(),
              renewalDate: subscriptionExpiresAt,
              expirationDate: subscriptionExpiresAt,
              autoRenewing: true,
              price: 0,
              currency: 'EUR',
              isAcknowledged: true,
              expiryReminderSent: false,
            },
          },
          { upsert: true }
        );
      } else {
        throw subError;
      }
    }

    // Upgrade user to agency_agent tier — all limits come from DB product
    user.subscription.tier = 'agency_agent';
    user.subscription.status = 'active';
    user.subscription.listingsLimit = agentListingsLimit;
    // Initialize monthly listing tracking (30 per month, resets from subscription start)
    user.subscription.monthlyListingsCreated = 0;
    const couponNextReset = new Date();
    couponNextReset.setDate(couponNextReset.getDate() + 30);
    couponNextReset.setHours(0, 0, 0, 0);
    user.subscription.listingsMonthResetDate = couponNextReset;
    if (user.subscription.promotionCoupons) {
      user.subscription.promotionCoupons.monthly = 0; // Agency agents share the agency pool
    }
    user.subscription.expiresAt = expiryDate; // already validated above

    // Associate user with agency
    if (!user.agency) {
      user.agency = {
        role: 'none',
      };
    }
    user.agency.agencyId = agency._id as any;
    user.agency.role = 'agent';
    user.agency.joinedAt = new Date();
    user.agency.couponCode = couponCode;

    // Set top-level agency fields for UI compatibility
    user.agencyId = agency._id as any;
    user.agencyName = agency.name;
    user.isSubscribed = true;
    user.subscriptionPlan = 'agency_agent_yearly';

    await user.save();

    // Mark coupon as used
    coupon.status = 'used';
    coupon.usedBy = user._id as any;
    coupon.usedAt = new Date();

    // Add user to agency's agents array if not already there
    if (!agency.agents.some(id => String(id) === String(user._id))) {
      agency.agents.push(user._id as any);
    }

    // Add to agentDetails for tracking
    if (!agency.agentDetails) {
      agency.agentDetails = [];
    }
    const existingAgentDetail = agency.agentDetails.find(
      ad => String(ad.userId) === String(user._id)
    );
    if (!existingAgentDetail) {
      agency.agentDetails.push({
        userId: user._id,
        joinedAt: new Date(),
        isActive: true,
        couponCode,
      } as any);
    } else {
      existingAgentDetail.isActive = true;
      existingAgentDetail.couponCode = couponCode;
      existingAgentDetail.leftAt = undefined;
    }

    // Update stats
    agency.stats.totalAgents = agency.agents.length;
    agency.totalAgents = agency.agents.length;

    await agency.save();

    // Also update the Agent record if it exists
    const Agent = (await import('../models/Agent')).default;
    const agentRecord = await Agent.findOne({ userId: user._id });
    if (agentRecord) {
      agentRecord.agencyId = agency._id as any;
      agentRecord.agencyName = agency.name;
      await agentRecord.save();
      agencyLogger.info(`✅ Updated Agent record for user ${user._id} with agency: ${agency.name}`);
    }

    agencyLogger.info(`✅ User ${user._id} redeemed agent coupon for agency ${agency.name}`);

    // Notify all viewers of the agency page so the new agent appears in real-time
    try {
      const io = getSocketInstance();
      if (!io) throw new Error('Socket not available');
      io.emit(`agency-update-${String(agency._id)}`, {
        type: 'member-added',
        agencyId: String(agency._id),
        agentId: String(user._id),
        agentName: user.name,
      });
    } catch {
      // Socket not available — non-critical
    }

    // Send email notifications (non-blocking)
    try {
      // Notify agency owner: agent redeemed coupon
      await createNotificationWithPush({
        userId: agency.ownerId,
        type: 'agency_coupon_redeemed',
        title: 'Agent Coupon Redeemed',
        message: `${user.name || 'An agent'} has joined ${agency.name} using coupon ${couponCode}.`,
        icon: 'ticket',
        priority: 'normal',
        data: {
          agencyId: String(agency._id),
          agencySlug: agency.slug,
          agencyName: agency.name,
          agentName: user.name || 'Agent',
          agentEmail: user.email,
          couponCode,
          totalAgents: agency.agents.length,
          actionUrl: `/agencies/${agency.slug || agency._id}`,
          actionLabel: 'View Agency',
        },
      });

      // Notify the joining agent: welcome to agency
      await createNotificationWithPush({
        userId: user._id,
        type: 'agency_join_welcome',
        title: `Welcome to ${agency.name}!`,
        message: `You have successfully joined ${agency.name} with a Pro subscription. You now have access to ${user.subscription.listingsLimit} listings.`,
        icon: 'building',
        priority: 'normal',
        data: {
          agencyId: String(agency._id),
          agencySlug: agency.slug,
          agencyName: agency.name,
          subscriptionTier: user.subscription.tier,
          listingsLimit: user.subscription.listingsLimit,
          actionUrl: `/agencies/${agency.slug || agency._id}`,
          actionLabel: 'View Agency',
        },
      });

      agencyLogger.info(`📨 In-app notifications sent for coupon redemption`);
    } catch (notifError) {
      // Don't fail the redemption if notifications fail
      agencyLogger.error('Error sending in-app notifications:', notifError);
    }

    // Send email notifications (non-blocking)
    try {
      const { sendAgentJoinedAgencyEmail, sendAgencyNewMemberEmail } = await import('../services/emailService');
      await sendAgentJoinedAgencyEmail({
        agentEmail: user.email,
        agentName: user.name || 'Agent',
        agencyName: agency.name,
        agencyId: String(agency._id),
        subscriptionTier: user.subscription?.tier || 'pro',
        listingsLimit: user.subscription?.listingsLimit || 50,
        expiresAt: user.subscription?.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const owner = await User.findById(agency.ownerId);
      if (owner) {
        await sendAgencyNewMemberEmail({
          ownerEmail: owner.email,
          ownerName: owner.name || 'Agency Owner',
          newAgentName: user.name || 'Agent',
          newAgentEmail: user.email,
          agencyName: agency.name,
          agencyId: String(agency._id),
          couponCode: couponCode || '',
          totalAgents: agency.agents.length,
        });
      }
    } catch (emailError) {
      agencyLogger.error('Error sending coupon join emails:', emailError);
    }

    res.status(200).json({
      message: `Successfully joined ${agency.name} with yearly Pro subscription!`,
      subscription: {
        tier: user.subscription.tier,
        status: user.subscription.status,
        listingsLimit: user.subscription.listingsLimit,
        expiresAt: user.subscription.expiresAt,
      },
      agency: {
        id: agency._id,
        name: agency.name,
        role: user.agency.role,
      },
    });
  } catch (error: any) {
    agencyLogger.error('Redeem agent coupon error:', error);

    if (error.code === 11000) {
      res.status(409).json({
        message: 'A subscription already exists for this account. Please contact support.',
        code: 'DUPLICATE_SUBSCRIPTION',
      });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({
        message: 'Invalid subscription data',
        code: 'VALIDATION_ERROR',
      });
    } else {
      res.status(500).json({
        message: 'Error redeeming coupon',
      });
    }
  }
};

// @desc    Get agency coupon status (agent coupons + promotion coupons)
// @route   GET /api/agencies/:id/coupons
// @access  Private (Agency owner and agents)
export const getAgencyCoupons = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if user is owner or agent of this agency
    const isOwner = String(agency.ownerId) === String(currentUser._id);
    const isAgent = agency.agents.some(id => String(id) === String(currentUser._id));

    if (!isOwner && !isAgent) {
      res.status(403).json({
        message: 'Access denied. Only agency owner and agents can view coupons.',
        code: 'ACCESS_DENIED'
      });
      return;
    }

    // Refresh promotion coupons if needed
    agency.refreshPromotionCoupons();
    await agency.save();

    // Get agent coupons (only show to owner) with user details for used coupons
    let agentCoupons = null;
    if (isOwner) {
      // Get user IDs from used coupons
      const usedByIds = agency.agentCoupons
        .filter(c => c.status === 'used' && c.usedBy)
        .map(c => c.usedBy);

      // Fetch user details for those who used coupons
      const usersMap = new Map();
      if (usedByIds.length > 0) {
        const users = await User.find({ _id: { $in: usedByIds } }).select('name email');
        users.forEach(user => {
          usersMap.set(String(user._id), { name: user.name, email: user.email });
        });
      }

      agentCoupons = agency.agentCoupons.map(c => ({
        code: c.code,
        status: c.status,
        generatedAt: c.generatedAt,
        expiresAt: c.expiresAt,
        usedBy: c.usedBy ? usersMap.get(String(c.usedBy)) : null,
        usedAt: c.usedAt,
      }));
    }

    // Fetch actual promotion coupon codes for the agency owner
    // These are visible to all agency members (owner + agents)
    const ownerId = String(agency.ownerId);
    let promotionCouponCodes: Array<{
      code: string;
      tier: string;
      status: string;
      validFrom: Date;
      validUntil: Date;
      used: boolean;
      usedAt?: Date;
      usedBy?: { name: string; email: string } | null;
    }> = [];

    try {
      // Self-heal: if the monthly pool reports available coupons but the
      // matching code documents are missing (older ones expired and were
      // filtered out), generate fresh codes so the displayed list always
      // reflects the current available allocation — the newest codes.
      const ownerObjId = new mongoose.Types.ObjectId(ownerId);
      const poolAvailable = agency.promotionCoupons?.available ?? 0;
      if (agency.isSubscriptionActive() && poolAvailable > 0) {
        const availableDocs = await PromotionCoupon.countDocuments({
          generatedForUserId: ownerObjId,
          status: { $ne: 'expired' },
          validUntil: { $gte: new Date() },
          currentTotalUses: { $lt: 1 },
        });

        const gap = poolAvailable - availableDocs;
        if (gap > 0) {
          const agencyProduct =
            (await Product.findOne({ productId: 'agency_yearly' }).lean()) ??
            (await Product.findOne({ productId: 'seller_enterprise_yearly' }).lean());

          // Distribute the gap across tiers (highlight → premium → featured),
          // using the agency product breakdown as the per-tier cap.
          let remaining = gap;
          const takeHighlight = Math.min(agencyProduct?.highlightedCoupons ?? ENTERPRISE_TIER_LIMITS.HIGHLIGHTED_COUPONS, remaining);
          remaining -= takeHighlight;
          const takePremium = Math.min(agencyProduct?.premiumCoupons ?? ENTERPRISE_TIER_LIMITS.PREMIUM_COUPONS, remaining);
          remaining -= takePremium;
          // Any leftover (breakdown smaller than the gap) goes to featured.
          const takeFeatured = remaining;

          const now = new Date();
          const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
          await generateProSubscriptionCoupons(
            ownerId,
            takeHighlight,
            takePremium,
            takeFeatured,
            monthEnd,
            14, // Agency coupons expire in 2 weeks
          );
        }
      }

      const coupons = await PromotionCoupon.find({
        $or: [
          { generatedForUserId: new mongoose.Types.ObjectId(ownerId) },
          { notes: { $regex: `userId:${ownerId}`, $options: 'i' } },
        ],
      }).sort({ createdAt: -1 }).limit(50);

      // Collect user IDs from usage history for name lookup
      const couponUserIds = new Set<string>();
      for (const c of coupons) {
        for (const usage of c.usageHistory || []) {
          couponUserIds.add(String(usage.userId));
        }
      }
      const couponUsersMap = new Map<string, { name: string; email: string }>();
      if (couponUserIds.size > 0) {
        const couponUsers = await User.find({ _id: { $in: Array.from(couponUserIds) } }).select('name email');
        couponUsers.forEach(u => couponUsersMap.set(String(u._id), { name: u.name, email: u.email }));
      }

      promotionCouponCodes = coupons
        .map(c => {
          const isUsed = c.currentTotalUses > 0 || (c.maxTotalUses && c.currentTotalUses >= c.maxTotalUses);
          const isExpired = c.status === 'expired' || new Date(c.validUntil) < new Date();
          const lastUsage = c.usageHistory?.[c.usageHistory.length - 1];

          return {
            code: c.code,
            tier: c.applicableTiers?.[0] || 'featured',
            status: (isUsed ? 'used' : isExpired ? 'expired' : 'available') as string,
            validFrom: c.validFrom,
            validUntil: c.validUntil,
            used: !!isUsed,
            usedAt: lastUsage?.usedAt,
            usedBy: lastUsage?.userId ? couponUsersMap.get(String(lastUsage.userId)) || null : null,
          };
        })
        // Once coupons expire, replace them with the newest ones: hide expired codes
        // so only the latest active (available/used) codes are shown.
        .filter(c => c.status !== 'expired');
    } catch (err) {
      agencyLogger.error('Error fetching promotion coupon codes:', err);
    }

    res.status(200).json({
      subscription: {
        status: agency.subscription.status,
        expiresAt: agency.subscription.expiresAt,
        isActive: agency.isSubscriptionActive(),
      },
      agentCoupons: agentCoupons ? {
        coupons: agentCoupons,
        available: agentCoupons.filter(c => c.status === 'available').length,
        used: agentCoupons.filter(c => c.status === 'used').length,
        expired: agentCoupons.filter(c => c.status === 'expired').length,
        canGenerateMore: agency.canGenerateMoreCoupons(),
      } : null,
      promotionCoupons: {
        monthly: agency.promotionCoupons.monthly,
        available: agency.promotionCoupons.available,
        used: agency.promotionCoupons.used,
        lastRefresh: agency.promotionCoupons.lastRefresh,
        codes: promotionCouponCodes,
      },
    });
  } catch (error: any) {
    agencyLogger.error('Get agency coupons error:', error);
    res.status(500).json({
      message: 'Error fetching coupons',
    });
  }
};

// @desc    Use promotion coupon (agency-wide pool)
// @route   POST /api/agencies/:id/coupons/use-promotion
// @access  Private (Agency owner and agents)
export const usePromotionCoupon = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const { propertyId } = req.body;

    if (!propertyId) {
      res.status(400).json({
        message: 'Property ID is required',
        code: 'MISSING_PROPERTY_ID'
      });
      return;
    }

    const agency = await Agency.findById(id);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if user is owner or agent of this agency
    const isOwner = String(agency.ownerId) === String(currentUser._id);
    const isAgent = agency.agents.some(id => String(id) === String(currentUser._id));

    if (!isOwner && !isAgent) {
      res.status(403).json({
        message: 'Only agency owner and agents can use promotion coupons',
        code: 'ACCESS_DENIED'
      });
      return;
    }

    // Check if agency subscription is active
    if (!agency.isSubscriptionActive()) {
      res.status(403).json({
        message: 'Agency subscription must be active to use promotion coupons',
        code: 'SUBSCRIPTION_INACTIVE'
      });
      return;
    }

    // Refresh promotion coupons if needed
    agency.refreshPromotionCoupons();

    // Check if coupons are available
    if (agency.promotionCoupons.available <= 0) {
      res.status(400).json({
        message: 'No promotion coupons available. Pool refreshes monthly.',
        code: 'NO_COUPONS_AVAILABLE',
        available: agency.promotionCoupons.available,
        monthly: agency.promotionCoupons.monthly,
        lastRefresh: agency.promotionCoupons.lastRefresh,
      });
      return;
    }

    // Decrement available coupons
    agency.promotionCoupons.available -= 1;
    agency.promotionCoupons.used += 1;
    await agency.save();

    agencyLogger.info(`✅ Agency ${agency.name} used promotion coupon for property ${propertyId} (${agency.promotionCoupons.available}/${agency.promotionCoupons.monthly} remaining)`);

    res.status(200).json({
      message: 'Promotion coupon applied successfully',
      propertyId,
      promotionCoupons: {
        available: agency.promotionCoupons.available,
        used: agency.promotionCoupons.used,
        monthly: agency.promotionCoupons.monthly,
      },
    });
  } catch (error: any) {
    agencyLogger.error('Use promotion coupon error:', error);
    res.status(500).json({
      message: 'Error using promotion coupon',
    });
  }
};

// @desc    Send promotion coupons summary email to agency owner
// @route   POST /api/agencies/:id/coupons/send-promotion-email
// @access  Private (Agency owner)
export const sendPromotionCouponsEmailEndpoint = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Only agency owner can send this email
    if (String(agency.ownerId) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Only the agency owner can request this email' });
      return;
    }

    const user = await User.findById(String(currentUser._id));
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const promotionCoupons = agency.promotionCoupons || { monthly: 0, available: 0, used: 0 };

    // Fetch active coupon codes for this user to include in the email
    const PromotionCoupon = (await import('../models/PromotionCoupon')).default;
    const activeCoupons = await PromotionCoupon.find({
      generatedForUserId: currentUser._id,
      status: 'active',
      validUntil: { $gte: new Date() },
    }).lean();
    const couponCodes = activeCoupons.map((c: any) => ({
      tier: (c.applicableTiers?.[0] || 'featured') as 'highlight' | 'premium' | 'featured',
      code: c.code,
    }));

    const { sendPromotionCouponsEmail } = await import('../services/emailService');
    await sendPromotionCouponsEmail({
      email: user.email,
      ownerName: user.name || 'Agency Owner',
      agencyName: agency.name,
      promotionCoupons: {
        monthly: promotionCoupons.monthly,
        available: promotionCoupons.available,
        used: promotionCoupons.used,
      },
      couponCodes,
    });

    agencyLogger.info(`📧 Promotion coupons email sent to ${user.email} for agency ${agency.name}`);
    res.json({ message: 'Promotion coupons email sent successfully' });
  } catch (error) {
    agencyLogger.error('Error sending promotion coupons email:', error);
    res.status(500).json({ message: 'Failed to send promotion coupons email' });
  }
};

// @desc    Delete agency and transfer agents to Pro monthly
// @route   DELETE /api/agencies/:id
// @access  Private (Agency owner only)
export const deleteAgency = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    if (String(agency.ownerId) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Only the agency owner can delete this agency' });
      return;
    }

    const Subscription = (await import('../models/Subscription')).default;
    const Product = (await import('../models/Product')).default;

    // Find the agency subscription to get the expiration date
    const agencySubscription = await Subscription.findOne({
      userId: currentUser._id,
      productId: { $in: ['agency_yearly', 'seller_enterprise_yearly'] },
      status: { $in: ['active', 'trial', 'grace'] },
    });

    const agencyExpirationDate = agencySubscription?.expirationDate || agency.subscription?.expiresAt;

    // Find all agents in the agency (excluding owner)
    const agentMembers = await User.find({
      agencyId: agency._id,
      _id: { $ne: currentUser._id },
    });

    // Transfer each agent to Pro monthly plan until the agency subscription expires
    if (agencyExpirationDate && agentMembers.length > 0) {
      const proMonthlyProduct = await Product.findOne({ productId: 'seller_pro_monthly' }).lean();

      for (const agent of agentMembers) {
        try {
          // Create a Pro monthly subscription that expires when the agency subscription would have expired
          await Subscription.create({
            userId: agent._id,
            store: 'web',
            productId: 'seller_pro_monthly',
            startDate: new Date(),
            expirationDate: agencyExpirationDate,
            status: 'active',
            autoRenewing: false,
            price: 0,
            currency: 'EUR',
            country: agent.country || 'RS',
            notes: `Transferred from deleted agency "${agency.name}" — active until original agency expiration`,
          });

          // Update agent's subscription fields
          agent.subscriptionPlan = 'seller_pro_monthly';
          agent.subscriptionStatus = 'active';
          agent.subscriptionExpiresAt = agencyExpirationDate;
          (agent as any).subscription = {
            plan: 'seller_pro_monthly',
            tier: 'pro',
            status: 'active',
            expiresAt: agencyExpirationDate,
            listingsLimit: proMonthlyProduct?.listingsLimit ?? 20,
            promotionCoupons: proMonthlyProduct?.promotionCoupons ?? 3,
          };

          // Remove agency association
          (agent as any).agencyId = undefined;
          await agent.save();

          agencyLogger.info(`🔄 Agent ${agent.email} transferred to Pro monthly (expires ${agencyExpirationDate.toISOString()})`);
        } catch (transferError) {
          agencyLogger.error(`⚠️ Failed to transfer agent ${agent.email}:`, transferError);
        }
      }
    } else {
      // No active subscription — just remove agency association from agents
      for (const agent of agentMembers) {
        (agent as any).agencyId = undefined;
        (agent as any).subscription = undefined;
        await agent.save();
      }
    }

    // Cancel the agency subscription
    if (agencySubscription) {
      agencySubscription.status = 'cancelled' as any;
      agencySubscription.canceledAt = new Date();
      await agencySubscription.save();
    }

    // Remove agency reference from owner
    const owner = await User.findById(currentUser._id);
    if (owner) {
      (owner as any).agencyId = undefined;
      await owner.save();
    }

    // Delete the agency
    await Agency.findByIdAndDelete(id);

    agencyLogger.info(`🗑️ Agency "${agency.name}" deleted by owner ${currentUser.email}. ${agentMembers.length} agents transferred to Pro monthly.`);

    res.json({
      message: `Agency deleted successfully. ${agentMembers.length} agent(s) have been transferred to Pro monthly plan${agencyExpirationDate ? ` until ${agencyExpirationDate.toLocaleDateString()}` : ''}.`,
      agentsTransferred: agentMembers.length,
    });
  } catch (error) {
    agencyLogger.error('Error deleting agency:', error);
    res.status(500).json({ message: 'Failed to delete agency' });
  }
};

// @desc    Get agency agents with subscription details
// @route   GET /api/agencies/:id/agents
// @access  Private (Agency owner)
export const getAgencyAgents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id).populate('agents', 'name email phone avatarUrl avatarOptions gender subscription agency agentLicense');
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check if user is the agency owner
    if (String(agency.ownerId) !== String(currentUser._id)) {
      res.status(403).json({
        message: 'Only agency owner can view agent details',
        code: 'OWNER_ONLY'
      });
      return;
    }

    // Map agents with details
    const agentsData = (agency.agents as any[]).map(agent => {
      const agentDetail = agency.agentDetails?.find(
        ad => String(ad.userId) === String(agent._id)
      );

      return {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        avatarUrl: agent.avatarUrl,
        subscription: {
          tier: agent.subscription?.tier,
          status: agent.subscription?.status,
          listingsLimit: agent.subscription?.listingsLimit,
          activeListingsCount: agent.subscription?.activeListingsCount,
          expiresAt: agent.subscription?.expiresAt,
        },
        license: agent.agentLicense ? {
          number: agent.agentLicense.number,
          country: agent.agentLicense.country,
          status: agent.agentLicense.status,
          isVerified: agent.agentLicense.isVerified,
        } : null,
        joinedAt: agentDetail?.joinedAt,
        couponCode: agentDetail?.couponCode,
        isActive: agentDetail?.isActive ?? true,
      };
    });

    res.status(200).json({
      count: agentsData.length,
      agents: agentsData,
    });
  } catch (error: any) {
    agencyLogger.error('Get agency agents error:', error);
    res.status(500).json({
      message: 'Error fetching agents',
    });
  }
};


// @desc    Migrate existing agency agents to have proper Subscription documents
// @route   POST /api/agencies/migrate-agent-subscriptions
// @access  Private (Admin only - should be called once)
export const migrateAgentSubscriptions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    agencyLogger.info('🔄 Starting agency agent subscription migration...');

    // Find all agencies with agents
    const agencies = await Agency.find({ agents: { $exists: true, $ne: [] } })
      .populate('agents', '_id email name subscription agency agencyId agencyName');

    let totalUpdated = 0;
    let totalCreated = 0;
    const results: any[] = [];

    // Get agent listings limit from DB product (configurable in admin)
    const agentProduct = await Product.findOne({ productId: 'agency_agent_yearly' }).lean();
    const agentListingsLimit = agentProduct?.listingsLimit ?? 30;

    for (const agency of agencies) {
      const agencyExpiresAt = agency.subscription?.expiresAt ||
                             new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      for (const agentRef of agency.agents) {
        const agent = agentRef as any;
        if (!agent || !agent._id) continue;

        // Get fresh user data
        const user = await User.findById(agent._id);
        if (!user) continue;

        let userUpdated = false;
        let subscriptionCreated = false;

        // Update user's subscription if needed
        if (!user.subscription || user.subscription.tier === 'free') {
          const migrationNextReset = new Date();
          migrationNextReset.setDate(migrationNextReset.getDate() + 30);
          migrationNextReset.setHours(0, 0, 0, 0);
          user.subscription = {
            tier: 'agency_agent',
            status: 'active',
            listingsLimit: agentListingsLimit,
            activeListingsCount: user.subscription?.activeListingsCount || 0,
            privateSellerCount: user.subscription?.privateSellerCount || 0,
            agentCount: user.subscription?.agentCount || 0,
            monthlyListingsCreated: 0,
            listingsMonthResetDate: migrationNextReset,
            promotionCoupons: { monthly: 0, available: 0, used: 0, rollover: 0, lastRefresh: new Date() },
            savedSearchesLimit: -1,
            totalPaid: user.subscription?.totalPaid || 0,
            expiresAt: agencyExpiresAt,
          };
          userUpdated = true;
        } else if (user.subscription.tier !== 'agency_agent' && user.subscription.tier !== 'agency_owner') {
          // User has a subscription but not agency_agent - update tier
          user.subscription.tier = 'agency_agent';
          user.subscription.listingsLimit = agentListingsLimit;
          user.subscription.expiresAt = agencyExpiresAt;
          userUpdated = true;
        }

        // Update agency fields if needed
        if (!user.agencyId || String(user.agencyId) !== String(agency._id)) {
          user.agencyId = agency._id as any;
          userUpdated = true;
        }
        if (!user.agencyName || user.agencyName === 'Independent Agent') {
          user.agencyName = agency.name;
          userUpdated = true;
        }

        // Update agency object
        if (!user.agency) {
          user.agency = { role: 'agent' };
          userUpdated = true;
        }
        if (!user.agency.agencyId) {
          user.agency.agencyId = agency._id as any;
          user.agency.role = 'agent';
          userUpdated = true;
        }

        if (userUpdated) {
          await user.save();
          totalUpdated++;
        }

        // Check/create Subscription document
        const migrationToken = user.agency?.couponCode
          ? `${user.agency.couponCode}_${user._id}`
          : `agency_coupon_${user._id}`;

        try {
          const existingSubscription = await Subscription.findOne({ userId: user._id });

          if (!existingSubscription) {
            await Subscription.create({
              userId: user._id,
              productId: 'agency_agent_yearly',
              store: 'agency_coupon',
              purchaseToken: migrationToken,
              transactionId: migrationToken,
              status: 'active',
              startDate: user.agency?.joinedAt || new Date(),
              renewalDate: agencyExpiresAt,
              expirationDate: agencyExpiresAt,
              autoRenewing: true,
              price: 0,
              currency: 'EUR',
              isAcknowledged: true,
            });
            subscriptionCreated = true;
            totalCreated++;
          } else if (existingSubscription.productId !== 'agency_agent_yearly') {
            existingSubscription.productId = 'agency_agent_yearly';
            existingSubscription.store = 'agency_coupon';
            existingSubscription.purchaseToken = migrationToken;
            existingSubscription.transactionId = migrationToken;
            existingSubscription.status = 'active';
            existingSubscription.expirationDate = agencyExpiresAt;
            existingSubscription.renewalDate = agencyExpiresAt;
            existingSubscription.price = 0;
            existingSubscription.autoRenewing = true;
            existingSubscription.expiryReminderSent = false;
            await existingSubscription.save();
            totalUpdated++;
          }
        } catch (subError: any) {
          if (subError.code === 11000) {
            agencyLogger.warn(`Migration: duplicate subscription key for user ${user._id}, using upsert`);
            await Subscription.findOneAndUpdate(
              { userId: user._id },
              {
                $set: {
                  productId: 'agency_agent_yearly',
                  store: 'agency_coupon',
                  purchaseToken: migrationToken,
                  transactionId: migrationToken,
                  status: 'active',
                  expirationDate: agencyExpiresAt,
                  renewalDate: agencyExpiresAt,
                  price: 0,
                  autoRenewing: true,
                  expiryReminderSent: false,
                },
              },
              { upsert: true }
            );
            totalUpdated++;
          } else {
            agencyLogger.error(`Migration: subscription error for user ${user._id}:`, subError);
          }
        }

        // Update Agent record if exists
        const agentRecord = await Agent.findOne({ userId: user._id });
        if (agentRecord) {
          if (!agentRecord.agencyId || agentRecord.agencyName === 'Independent Agent') {
            agentRecord.agencyId = agency._id as any;
            agentRecord.agencyName = agency.name;
            await agentRecord.save();
          }
        }

        results.push({
          userId: String(user._id),
          agency: agency.name,
          userUpdated,
          subscriptionCreated,
        });
      }
    }

    agencyLogger.info(`✅ Migration complete: ${totalUpdated} users updated, ${totalCreated} subscriptions created`);

    res.status(200).json({
      message: 'Migration completed successfully',
      summary: {
        usersUpdated: totalUpdated,
        subscriptionsCreated: totalCreated,
        totalAgents: results.length,
      },
      details: results,
    });
  } catch (error: any) {
    agencyLogger.error('Migration error:', error);
    res.status(500).json({
      message: 'Migration failed',
    });
  }
};

// @desc    Get top N agencies by score (leaderboard)
// @route   GET /api/agencies/leaderboard
// @access  Public
export const getTopAgencies = async (req: Request, res: Response): Promise<void> => {
  try {
    const limitNum = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const agencies = await Agency.find({})
      .populate('ownerId', 'name email')
      .populate('agents', 'name email avatarUrl avatarOptions gender')
      .sort({ score: -1, isFeatured: -1 })
      .limit(limitNum)
      .lean();

    const Property = (await import('../models/Property')).default;

    // Include owner + all agents as seller IDs (mirrors agency detail logic)
    const allSellerIds = agencies.flatMap((agency: any) => {
      const ownerIds = agency.ownerId?._id ? [agency.ownerId._id] : [];
      const agentIds = agency.agents?.map((agent: any) => agent._id) || [];
      return [...ownerIds, ...agentIds];
    });

    const propertyCounts = await Property.aggregate([
      {
        $match: {
          sellerId: { $in: allSellerIds },
          status: { $in: ['active', 'pending'] },
        },
      },
      { $group: { _id: '$sellerId', count: { $sum: 1 } } },
    ]);
    const countBySeller = new Map(
      propertyCounts.map((pc: { _id: unknown; count: number }) => [String(pc._id), pc.count])
    );
    const agenciesWithCounts = agencies.map((agency: any) => {
      const sellerIds = [
        ...(agency.ownerId?._id ? [agency.ownerId._id] : []),
        ...(agency.agents?.map((agent: any) => agent._id) || []),
      ];
      const totalProperties = sellerIds.reduce(
        (sum: number, id: unknown) => sum + (countBySeller.get(String(id)) || 0), 0
      );
      return { ...agency, totalProperties, totalAgents: agency.agents?.length || 0 };
    });

    // Re-sort after computing live totalProperties so tiebreaks favour agencies with more listings
    agenciesWithCounts.sort((a: any, b: any) => {
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (b.totalProperties || 0) - (a.totalProperties || 0);
    });

    res.json({ agencies: agenciesWithCounts });
  } catch (error: any) {
    agencyLogger.error('Get top agencies error:', error);
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
};

// @desc    Recompute and persist scores for all agencies (admin backfill)
// @route   POST /api/agencies/admin/recompute-scores
// @access  Private (admin only — validate req.user.role)
export const recomputeAgencyScores = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !['admin', 'super_admin'].includes((req.user as IUser).role)) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }
    const agencies = await Agency.find({});
    const bulkOps = agencies.map((agency) => {
      const b = calcAgencyScoreBreakdown(agency);
      return {
        updateOne: {
          filter: { _id: agency._id },
          update: { $set: { score: b.total, scoreBreakdown: { listings: b.listings, team: b.team, experience: b.experience, featured: b.featured } } },
        },
      };
    });
    let updated = 0;
    if (bulkOps.length > 0) {
      const result = await Agency.bulkWrite(bulkOps);
      updated = result.modifiedCount;
    }
    res.json({ message: `Recomputed scores for ${updated} agencies` });
  } catch (error: any) {
    agencyLogger.error('Recompute agency scores error:', error);
    res.status(500).json({ message: 'Error recomputing scores' });
  }
};
