import { Request, Response } from 'express';
import Property from '../models/Property';
import User, { IUser } from '../models/User';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import SalesHistory from '../models/SalesHistory';
import { geocodeProperty } from '../services/geocodingService';
import { incrementViewCount, updateSoldStats, incrementActiveListings } from '../utils/statsUpdater';
import {
  uploadPropertyImages,
  deleteImages,
  deleteFolder,
} from '../services/cloudinaryService';
import { sortPropertiesWithHighlighting, getHighlightingStats } from '../utils/highlightingUtils';
import { recordPriceChange, processInstantAlertsForProperty, processInstantPriceDropForProperty } from '../jobs/propertyAlertsJob';
import { trackUserActivity } from '../services/proBuyerEmailService';
import { FREE_TIER_LIMITS, PRO_TIER_LIMITS } from '../config/subscriptionConstants';
import { sanitizeProperty } from '../utils/responseSanitizer';
import {
  emitPropertyCreated,
  emitPropertyUpdated,
  emitPropertyDeleted,
} from '../sockets/propertySocket';
import { propertyLogger } from '../utils/logger';
import { invalidateCache } from '../middleware/cache';
import { getObjectIdParam, getParam } from '../utils/validateParams';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROPERTY ROLE SYSTEM - IMPORTANT BUSINESS LOGIC
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Properties are created with a LOCKED role that determines their classification:
 *
 * 1. PRIVATE SELLER (createdAsRole: 'private_seller')
 *    - Non-licensed individual selling their own property
 *    - Free users can only create as private seller (3 listings max)
 *    - Pro users can create as private seller (20 listings total shared with agent)
 *    - Once created as private seller, ALWAYS stays private seller
 *
 * 2. AGENT (createdAsRole: 'agent')
 *    - Licensed real estate professional
 *    - Can be independent or part of an agency
 *    - REQUIRES Pro subscription to post listings
 *    - Once created as agent, ALWAYS stays agent
 *    - Tracks agency name and license number at creation time
 *
 * IMMUTABILITY RULES:
 * - The 'createdAsRole' field is SET ONCE at creation and NEVER changes
 * - Properties posted as private seller stay as private seller forever
 * - Properties posted as agent stay as agent forever
 * - This ensures proper analytics, role separation, and subscription enforcement
 *
 * SUBSCRIPTION LIMITS:
 * - Free users: 3 active listings (private seller only)
 * - Pro users: 20 active listings total (can be split between roles however they want)
 * - Role-specific counters track: privateSellerCount + agentCount = totalListingsCount
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// @desc    Get all properties with filters
// @route   GET /api/properties
// @access  Public
export const getProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      query,
      minPrice,
      maxPrice,
      beds,
      baths,
      livingRooms,
      minSqft,
      maxSqft,
      sortBy,
      propertyType,
      city,
      country,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter object
    const filter: any = {};

    // Default to active properties + recently sold (within 24 hours) + rented (for rental listings)
    if (!status || status === 'active') {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const orConditions: any[] = [
        { status: 'active' },
        {
          status: 'sold',
          soldAt: { $gte: twentyFourHoursAgo }
        }
      ];

      // Include rented properties so they appear on the rental search page
      if (req.query.listingType === 'rent') {
        orConditions.push({ status: 'rented' });
      }

      filter.$or = orConditions;
    } else {
      filter.status = status;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (beds) filter.beds = { $gte: Number(beds) };
    if (baths) filter.baths = { $gte: Number(baths) };
    if (livingRooms) filter.livingRooms = { $gte: Number(livingRooms) };

    if (minSqft || maxSqft) {
      filter.sqft = {};
      if (minSqft) filter.sqft.$gte = Number(minSqft);
      if (maxSqft) filter.sqft.$lte = Number(maxSqft);
    }

    if (propertyType && propertyType !== 'any') {
      filter.propertyType = propertyType;
    }

    if (city) {
      filter.city = new RegExp(city as string, 'i');
    }

    if (country) {
      filter.country = new RegExp(country as string, 'i');
    }

    // Filter by listing type (sale vs rent)
    if (req.query.listingType && req.query.listingType !== 'any') {
      filter.listingType = req.query.listingType;
    }

    // Filter by max days listed (e.g., last 24h, 3 days, 7 days, 30 days)
    if (req.query.maxDaysListed) {
      const daysAgo = new Date(Date.now() - Number(req.query.maxDaysListed) * 24 * 60 * 60 * 1000);
      filter.createdAt = { ...filter.createdAt, $gte: daysAgo };
    }

    // Filter by price reduced (has discount)
    if (req.query.hasDiscount === 'true') {
      filter.originalPrice = { $exists: true, $ne: null };
      filter.$expr = { ...filter.$expr, $gt: ['$originalPrice', '$price'] };
    }

    // Filter by price increased
    if (req.query.hasPriceIncrease === 'true') {
      filter.originalPrice = { $exists: true, $ne: null };
      filter.$expr = { ...filter.$expr, $lt: ['$originalPrice', '$price'] };
    }

    // Filter by price per sqm range (computed field: price / sqft)
    if (req.query.minPricePerSqm || req.query.maxPricePerSqm) {
      const pricePerSqmConditions: any[] = [];
      // Ensure sqft > 0 to avoid division by zero
      pricePerSqmConditions.push({ $gt: ['$sqft', 0] });

      if (req.query.minPricePerSqm) {
        pricePerSqmConditions.push({
          $gte: [{ $divide: ['$price', '$sqft'] }, Number(req.query.minPricePerSqm)]
        });
      }
      if (req.query.maxPricePerSqm) {
        pricePerSqmConditions.push({
          $lte: [{ $divide: ['$price', '$sqft'] }, Number(req.query.maxPricePerSqm)]
        });
      }

      // Merge with any existing $expr conditions
      if (filter.$expr) {
        filter.$expr = { $and: [filter.$expr, ...pricePerSqmConditions] };
      } else {
        filter.$expr = pricePerSqmConditions.length === 1
          ? pricePerSqmConditions[0]
          : { $and: pricePerSqmConditions };
      }
    }

    // Filter by role context (for dual-role system)
    if (req.query.createdAsRole) {
      filter.createdAsRole = req.query.createdAsRole;
    }

    // Filter by specific user (for "My Listings")
    if (req.query.sellerId) {
      filter.sellerId = req.query.sellerId;
    }

    // Handle query search - search only in address and city, NOT description
    // Use $and to preserve other filters like status
    if (query) {
      const queryRegex = new RegExp(query as string, 'i');
      const queryConditions = [
        { address: queryRegex },
        { city: queryRegex },
      ];

      // If we already have $or (for status), use $and to combine them
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: queryConditions }
        ];
        delete filter.$or;
      } else {
        filter.$or = queryConditions;
      }
    }

    // Build sort object
    // Priority order: Premium > Highlight > Featured > Urgent > Standard, then sold properties, then apply user-selected sorting
    let sort: any = {};

    // First priority: Promoted properties (Premium > Highlight > Featured)
    // We'll handle this with a custom sort after fetching

    // Add status sorting (sold first among non-promoted)
    sort.status = -1; // 'sold' > 'active' alphabetically (reversed)

    // Then apply user's preferred sorting
    if (sortBy === 'price-low') {
      sort.price = 1;
    } else if (sortBy === 'price-high') {
      sort.price = -1;
    } else if (sortBy === 'sqft-low') {
      sort.sqft = 1;
    } else if (sortBy === 'sqft-high') {
      sort.sqft = -1;
    } else {
      sort.lastRenewed = -1; // Default: newest first
    }

    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with seller population
    // Fetch more than needed to allow for promoted property sorting
    const fetchLimit = limitNum * 2; // Fetch 2x to ensure we have enough promoted properties
    let properties = await Property.find(filter)
      .populate('sellerId', 'name email phone avatarUrl role agencyName agencyId')
      .sort(sort)
      .skip(skip)
      .limit(fetchLimit);

    // Use centralized highlighting utility for sorting
    // This handles:
    // - Priority order: Premium > Highlight > Featured > Standard
    // - Hourly rotation within same tier for fair exposure
    // - Urgent badge bonus points
    const currentHour = new Date().getHours();
    properties = sortPropertiesWithHighlighting(properties, currentHour);

    // Log highlighting stats for monitoring
    const stats = getHighlightingStats(properties);
    if (stats.activePromotions > 0) {
      propertyLogger.info(`📊 Highlighting stats: ${stats.premium} premium, ${stats.highlight} highlight, ${stats.featured} featured (rotation hour: ${currentHour})`);
    }

    // Trim to requested limit after sorting
    properties = properties.slice(0, limitNum);

    // Convert all properties to plain objects first (required for sanitizer)
    const plainProperties = properties.map(p => p.toObject ? p.toObject() : p);

    // Enrich properties with agency logos for agent sellers
    const agencyIds = plainProperties
      .map(p => (p.sellerId as any)?.agencyId)
      .filter(Boolean);

    if (agencyIds.length > 0) {
      const agencies = await Agency.find(
        { _id: { $in: agencyIds } },
        { _id: 1, logo: 1 }
      ).lean();

      const agencyLogoMap = new Map(
        agencies.map(a => [String(a._id), a.logo])
      );

      // Add agencyLogo to each property's seller
      for (const prop of plainProperties) {
        const seller = prop.sellerId as any;
        if (seller?.agencyId) {
          seller.agencyLogo = agencyLogoMap.get(String(seller.agencyId));
        }
      }
    }

    const enrichedProperties = plainProperties;

    // Get total count for pagination
    const total = await Property.countDocuments(filter);

    // Track user activity for pro buyer email recommendations
    // Only track if user is authenticated (req.user from auth middleware)
    if (req.user) {
      const userId = String((req.user as any)._id || (req.user as any).id);
      trackUserActivity(userId, {
        city: city as string,
        country: country as string,
        propertyType: propertyType as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minBeds: beds ? Number(beds) : undefined,
      });
    }

    // Sanitize: strip PII (email, phone, license) from list responses
    const sanitizedProperties = enrichedProperties.map((p: any) => sanitizeProperty(p, 'list'));

    res.json({
      properties: sanitizedProperties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    propertyLogger.error('Get properties error:', error);
    res.status(500).json({ message: 'Error fetching properties' });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
export const getProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const property = await Property.findById(id).populate(
      'sellerId',
      'name email phone avatarUrl role agencyName agencyId licenseNumber'
    );

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Increment views on property
    property.views += 1;
    await property.save();

    // Update seller's stats in real-time
    await incrementViewCount(String(property.sellerId._id || property.sellerId));

    // Enrich property with agency logo if seller is an agent
    let enrichedProperty = property.toObject();
    const seller = enrichedProperty.sellerId as any;
    if (seller?.agencyId) {
      const agency = await Agency.findById(seller.agencyId, { logo: 1 }).lean();
      if (agency) {
        seller.agencyLogo = agency.logo;
      }
    }

    // Sanitize: detail context keeps phone for "Call Seller" button, strips email/license
    res.json({ property: sanitizeProperty(enrichedProperty, 'detail') });
  } catch (error: any) {
    propertyLogger.error('Get property error:', error);
    res.status(500).json({ message: 'Error fetching property' });
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private
export const createProperty = async (
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

    // **CRITICAL: Verify subscription status from database - this is the source of truth**
    const Subscription = (await import('../models/Subscription')).default;

    // First check for active/trial/grace subscriptions
    let validSubscription = await Subscription.findOne({
      userId: user._id,
      status: { $in: ['active', 'trial', 'grace'] },
      expirationDate: { $gt: new Date() }
    }).sort({ expirationDate: -1 });

    // Also check for cancelled subscriptions that haven't expired yet (user can still use until expiration)
    if (!validSubscription) {
      validSubscription = await Subscription.findOne({
        userId: user._id,
        status: 'canceled',
        expirationDate: { $gt: new Date() }
      }).sort({ expirationDate: -1 });

      if (validSubscription) {
        // User has cancelled subscription, still valid
      }
    }

    // **AUTO-DOWNGRADE: If NO valid subscription in DB but user thinks they have Pro, downgrade to free**
    if (!validSubscription && user.subscription && user.subscription.tier !== 'free' && user.subscription.tier !== 'buyer') {
      // User has no active subscription, downgrading to free
      user.subscription.tier = 'free';
      user.subscription.status = 'expired';
      user.subscription.listingsLimit = FREE_TIER_LIMITS.LISTINGS; // Free tier limit
      user.subscription.promotionCoupons = {
        monthly: 0,
        available: 0,
        used: 0,
        rollover: 0,
        lastRefresh: new Date(),
      };

      // Also update legacy fields
      user.isSubscribed = false;
      user.subscriptionPlan = undefined;
      user.subscriptionExpiresAt = undefined;
      if (user.proSubscription) {
        user.proSubscription.isActive = false;
      }

      await user.save();
      // User downgraded to free tier
    }

    // If user has valid subscription but proSubscription not set, sync it now
    if (validSubscription && (!user.proSubscription || !user.proSubscription.isActive)) {
      // Auto-syncing Pro subscription

      const Product = (await import('../models/Product')).default;
      const product = await Product.findOne({ productId: validSubscription.productId });

      // Determine the correct listing limit based on product or plan type
      const isYearlyPlan = validSubscription.productId.includes('yearly');
      const defaultListingLimit = isYearlyPlan ? PRO_TIER_LIMITS.YEARLY.LISTINGS : PRO_TIER_LIMITS.MONTHLY.LISTINGS;

      user.proSubscription = {
        isActive: true,
        plan: isYearlyPlan ? 'pro_yearly' : 'pro_monthly',
        expiresAt: validSubscription.expirationDate,
        startedAt: validSubscription.startDate,
        totalListingsLimit: product?.listingsLimit || defaultListingLimit,
        activeListingsCount: user.proSubscription?.activeListingsCount || 0,
        privateSellerCount: user.proSubscription?.privateSellerCount || 0,
        agentCount: user.proSubscription?.agentCount || 0,
        promotionCoupons: {
          monthly: product?.promotionCoupons || 3,
          available: user.proSubscription?.promotionCoupons?.available || (product?.promotionCoupons || 3),
          used: user.proSubscription?.promotionCoupons?.used || 0,
          highlightCoupons: product?.highlightedCoupons || 2,
          usedHighlightCoupons: user.proSubscription?.promotionCoupons?.usedHighlightCoupons || 0,
        },
      };

      user.isSubscribed = true;
      user.subscriptionPlan = validSubscription.productId;
      user.subscriptionExpiresAt = validSubscription.expirationDate;

      await user.save();
      // Pro subscription auto-synced
    }

    // Initialize subscription object if doesn't exist (for existing users migration)
    if (!user.subscription) {
      // Check if user has an active Pro subscription (legacy or new system)
      let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
      let listingsLimit = FREE_TIER_LIMITS.LISTINGS;
      let promotionCoupons = { monthly: 0, available: 0, used: 0, rollover: 0, lastRefresh: new Date() };
      let savedSearchesLimit = FREE_TIER_LIMITS.SAVED_SEARCHES;

      // Sync from proSubscription (legacy system)
      if (user.proSubscription?.isActive) {
        tier = 'pro';
        // Default to yearly limit for legacy subscriptions
        listingsLimit = user.proSubscription.totalListingsLimit || PRO_TIER_LIMITS.YEARLY.LISTINGS;
        if (user.proSubscription.promotionCoupons) {
          promotionCoupons = {
            monthly: user.proSubscription.promotionCoupons.monthly || 3,
            available: user.proSubscription.promotionCoupons.available || 3,
            used: user.proSubscription.promotionCoupons.used || 0,
            rollover: 0,
            lastRefresh: new Date(),
          };
        }
        savedSearchesLimit = -1; // Unlimited for Pro
        // Migrating Pro subscription
      }

      // Count existing active properties to initialize counters correctly
      const existingProperties = await Property.find({
        sellerId: user._id,
        status: { $in: ['active', 'pending', 'draft'] }
      });

      const activeListingsCount = existingProperties.length;
      const privateSellerCount = existingProperties.filter(p => p.createdAsRole === 'private_seller').length;
      const agentCount = existingProperties.filter(p => p.createdAsRole === 'agent').length;

      // Found existing properties

      user.subscription = {
        tier,
        status: 'active',
        listingsLimit,
        activeListingsCount,
        privateSellerCount,
        agentCount,
        promotionCoupons,
        savedSearchesLimit,
        totalPaid: 0,
        startDate: user.proSubscription?.startedAt || new Date(),
        expiresAt: user.proSubscription?.expiresAt,
      };
      await user.save();
      // Subscription initialized
    }

    // Determine which role is being used to create this listing
    // PRIORITY: Use the role explicitly selected by user in the form, NOT the profile default
    const validRoles = ['private_seller', 'agent'];
    let createdAsRole = 'private_seller'; // Default fallback

    // Determine role for listing

    if (req.body.createdAsRole && validRoles.includes(req.body.createdAsRole)) {
      // Use the explicitly selected role from the form
      createdAsRole = req.body.createdAsRole;
    } else if (user.activeRole && validRoles.includes(user.activeRole)) {
      // Fallback to user's active role if form value is invalid
      createdAsRole = user.activeRole;
    } else if (user.role && validRoles.includes(user.role)) {
      // Last fallback to user's primary role
      createdAsRole = user.role;
    }

    // Update user's activeRole to match what they selected (for future consistency)
    if (user.activeRole !== createdAsRole && validRoles.includes(createdAsRole)) {
      user.activeRole = createdAsRole as 'private_seller' | 'agent';
    }

    // Buyers without an active paid subscription (listingsLimit === 0) cannot create listings.
    // Buyer Pro subscribers get listingsLimit = 3 and ARE allowed.
    if (user.role === 'buyer' && (user.subscription?.listingsLimit ?? 0) === 0) {
      res.status(403).json({
        message: 'Buyers cannot create property listings. Upgrade to Buyer Pro to post up to 3 listings.',
        code: 'BUYER_CANNOT_CREATE_LISTING',
        availableRoles: user.availableRoles,
      });
      return;
    }

    // Buyer Pro posts always go under 'private_seller' role context
    if (user.role === 'buyer') {
      createdAsRole = 'private_seller';
    }

    // **Phone number is required to create a listing**
    if (!user.phone || user.phone.trim() === '') {
      res.status(422).json({
        message: 'A mobile phone number is required to create a listing. Please add your phone number in Profile Settings first.',
        code: 'PHONE_REQUIRED',
      });
      return;
    }

    // **CRITICAL: Agency agents can ONLY post as agents**
    // They work under an agency and all their listings go to the agency portfolio
    if (user.subscription?.tier === 'agency_agent' && createdAsRole === 'private_seller') {
      res.status(403).json({
        message: 'As an agency agent, you can only post listings as an agent. Your listings appear on both your profile and your agency\'s page.',
        code: 'AGENCY_AGENT_ONLY',
        tier: 'agency_agent',
        allowedRole: 'agent',
        requestedRole: createdAsRole,
      });
      return;
    }

    // Check listing limits based on subscription tier
    const currentCount = user.subscription.activeListingsCount || 0;
    const limit = user.subscription.listingsLimit || FREE_TIER_LIMITS.LISTINGS;
    const tier = user.subscription.tier || 'free';

    // Creating listing

    if (currentCount >= limit) {
      res.status(403).json({
        message: `You have reached your ${tier} tier limit of ${limit} active listings. ${tier === 'free' ? 'Upgrade to Pro for up to 250 active listings!' : 'Please delete some listings to create new ones.'}`,
        code: 'LISTING_LIMIT_REACHED',
        tier,
        limit,
        current: currentCount,
        privateSellerCount: user.subscription.privateSellerCount || 0,
        agentCount: user.subscription.agentCount || 0,
        upgradeAvailable: tier === 'free',
      });
      return;
    }

    // Geocode the property address automatically
    // Only geocode if we have at least city and country (for precision)
    const coordinates = await geocodeProperty({
      address: req.body.address,
      city: req.body.city,
      country: req.body.country,
    });

    // Whitelist allowed fields to prevent mass assignment attacks
    // (e.g., attacker setting isPromoted, views, saves, etc.)
    const ALLOWED_PROPERTY_FIELDS = [
      'listingType', 'title', 'status', 'price', 'originalPrice', 'priceIntervals',
      'address', 'city', 'country',
      'beds', 'baths', 'livingRooms', 'sqft', 'yearBuilt', 'parking',
      'description', 'specialFeatures', 'materials',
      'tourUrl', 'virtualTour360Url', 'hasVirtualTour360', 'videoUrl',
      'imageUrl', 'imagePublicId', 'images',
      'lat', 'lng',
      'propertyType', 'floorNumber', 'totalFloors', 'floorplanUrl', 'floorplanPublicId',
      'amenities', 'hasBalcony', 'hasGarden', 'hasElevator', 'hasSecurity',
      'hasAirConditioning', 'hasPool', 'petsAllowed',
      'distanceToCenter', 'distanceToSea', 'distanceToSchool', 'distanceToHospital',
      'furnishing', 'heatingType', 'condition', 'viewType', 'energyRating', 'orientation',
      // Rental-specific fields
      'rentPeriod', 'securityDeposit', 'minimumLeaseDuration', 'maximumLeaseDuration',
      'availableFrom', 'utilitiesIncluded', 'internetIncluded',
      'tenantRequirements', 'maxOccupants',
      'visitAvailability',
    ] as const;

    const sanitizedBody: Record<string, any> = {};
    for (const field of ALLOWED_PROPERTY_FIELDS) {
      if (req.body[field] !== undefined) {
        sanitizedBody[field] = req.body[field];
      }
    }

    const propertyData = {
      ...sanitizedBody,
      sellerId: String(currentUser._id),
      // Add user identification for 1:1 relationship tracking
      createdByName: user.name,
      createdByEmail: user.email,
      // Role context tracking
      createdAsRole,
      ...(createdAsRole === 'agent' && {
        createdByAgencyName: user.agencyName,
        createdByLicenseNumber: user.licenseNumber,
      }),
      // Override with geocoded coordinates if geocoding succeeded, otherwise keep frontend values
      ...(coordinates.lat && coordinates.lng && {
        lat: coordinates.lat,
        lng: coordinates.lng,
      }),
    };

    // Property created with coordinates

    const property = await Property.create(propertyData);

    // Update subscription counters
    user.subscription.activeListingsCount = (user.subscription.activeListingsCount || 0) + 1;

    if (createdAsRole === 'private_seller') {
      user.subscription.privateSellerCount = (user.subscription.privateSellerCount || 0) + 1;
    } else if (createdAsRole === 'agent') {
      user.subscription.agentCount = (user.subscription.agentCount || 0) + 1;
    }

    // Update user listing counts (legacy fields)
    user.listingsCount += 1;
    user.totalListingsCreated += 1;
    await user.save();

    // Update stats for active listings
    if (sanitizedBody.status === 'active') {
      await incrementActiveListings(String(user._id));

      // Trigger instant alerts for saved searches that match this property
      // Run asynchronously to not block the response
      processInstantAlertsForProperty(String(property._id)).catch(err => {
        propertyLogger.error('Error processing instant alerts:', err);
      });
    }

    // Update agent activeListings count if user is an agent
    if (user.role === 'agent') {
      const agent = await Agent.findOne({ userId: user._id });
      if (agent) {
        agent.activeListings += 1;
        await agent.save();
      }
    }

    // Populate seller info
    await property.populate('sellerId', 'name email phone avatarUrl role agencyName');

    // Emit real-time event for instant updates across all connected clients
    emitPropertyCreated(property.toObject());

    // Invalidate properties cache so new listing appears immediately in search
    invalidateCache('/api/properties');

    // Return updated subscription info so frontend can update UI immediately
    res.status(201).json({
      property,
      updatedSubscription: {
        activeListingsCount: user.subscription.activeListingsCount,
        privateSellerCount: user.subscription.privateSellerCount,
        agentCount: user.subscription.agentCount,
        listingsLimit: user.subscription.listingsLimit,
        tier: user.subscription.tier,
      },
    });
  } catch (error: any) {
    propertyLogger.error('Create property error:', error);
    res.status(500).json({ message: 'Error creating property' });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private
export const updateProperty = async (
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

    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Check ownership
    if (property.sellerId.toString() !== String((req.user as IUser)._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this property' });
      return;
    }

    // IMPORTANT: Protect immutable fields from being changed after creation
    // These fields are set once at creation and should NEVER change:
    // - createdAsRole: Determines if this was posted as private_seller or agent
    // - sellerId: The owner of the listing
    // - createdByName, createdByEmail: Creator identification
    // - createdByAgencyName, createdByLicenseNumber: Agent credentials
    const immutableFields = [
      'createdAsRole',
      'listingType',
      'sellerId',
      'createdByName',
      'createdByEmail',
      'createdByAgencyName',
      'createdByLicenseNumber',
    ];

    // Remove immutable fields from update body to prevent tampering
    const updateData = { ...req.body };
    immutableFields.forEach(field => delete updateData[field]);

    // Track price change for alerts
    const previousPrice = property.price;
    const previousStatus = property.status;

    // Log if someone tried to change immutable fields
    const attemptedImmutableChanges = immutableFields.filter(field => req.body[field] !== undefined);
    if (attemptedImmutableChanges.length > 0) {
      propertyLogger.warn(`⚠️ Blocked attempt to change immutable fields: ${attemptedImmutableChanges.join(', ')}`);
    }

    // Debug: Log what images are being received
    propertyLogger.info('🔍 [updateProperty] Received images:', {
      hasImages: updateData.images !== undefined,
      imagesCount: updateData.images?.length || 0,
      existingImagesCount: property.images?.length || 0,
      sampleImage: updateData.images?.[0]?.url?.substring(0, 50)
    });

    // IMPORTANT: Only update fields that are explicitly provided and not undefined
    // This preserves existing data when fields are not included in the update
    const fieldsToUpdate = [
      'status', 'title', 'price', 'address', 'city', 'country',
      'beds', 'baths', 'livingRooms', 'sqft', 'yearBuilt', 'parking',
      'description', 'specialFeatures', 'materials', 'amenities',
      'tourUrl', 'virtualTour360Url', 'hasVirtualTour360',
      'imageUrl', 'images', 'lat', 'lng',
      'propertyType', 'floorNumber', 'totalFloors', 'floorplanUrl',
      'furnishing', 'heatingType', 'condition', 'viewType', 'energyRating',
      'orientation',
      'hasBalcony', 'hasGarden', 'hasElevator', 'hasSecurity',
      'hasAirConditioning', 'hasPool', 'petsAllowed',
      'distanceToCenter', 'distanceToSea', 'distanceToSchool', 'distanceToHospital',
      // Rental-specific fields
      'rentPeriod', 'securityDeposit', 'minimumLeaseDuration', 'maximumLeaseDuration',
      'availableFrom', 'utilitiesIncluded', 'internetIncluded',
      'tenantRequirements', 'maxOccupants',
      // Visit availability
      'visitAvailability',
    ];

    let updatedFields: string[] = [];
    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined) {
        // Skip updating coordinates if they're 0 (invalid) - preserve existing valid coordinates
        if ((field === 'lat' || field === 'lng') && updateData[field] === 0) {
          propertyLogger.info(`⚠️ Skipping ${field} update - value is 0, preserving existing: ${(property as any)[field]}`);
          return;
        }
        (property as any)[field] = updateData[field];
        updatedFields.push(field);
      }
    });

    // Log coordinates status
    propertyLogger.info(`📍 Property coordinates after update: lat=${property.lat}, lng=${property.lng}`);
    propertyLogger.info(`📝 Updated property ${property._id} fields: ${updatedFields.join(', ') || 'none'}`);

    // Track price reduction for display (originalPrice and priceReducedAt)
    if (updateData.price !== undefined && updateData.price < previousPrice) {
      // Price was reduced - set originalPrice if not already set, update priceReducedAt
      if (!property.originalPrice || property.originalPrice < previousPrice) {
        property.originalPrice = previousPrice;
      }
      property.priceReducedAt = new Date();
      propertyLogger.info(`📉 Price reduced: €${previousPrice} → €${property.price} (original: €${property.originalPrice})`);
    } else if (updateData.price !== undefined && updateData.price > previousPrice) {
      // Price was increased - clear the reduction tracking
      property.originalPrice = undefined;
      property.priceReducedAt = undefined;
      propertyLogger.info(`📈 Price increased: €${previousPrice} → €${property.price} (cleared reduction)`);
    }

    await property.save();

    // Record price change for alerts if price was updated
    if (updateData.price !== undefined && updateData.price !== previousPrice) {
      await recordPriceChange(String(property._id), property.price, previousPrice);
      propertyLogger.info(`💰 Price changed: €${previousPrice} → €${property.price}`);

      // Trigger instant price change alerts for Pro users (favorites + saved searches)
      if (property.price !== previousPrice) {
        processInstantPriceDropForProperty(String(property._id), property.price, previousPrice).catch(err => {
          propertyLogger.error('Error processing instant price change alerts:', err);
        });
      }
    }

    // Trigger instant alerts if property status changed to 'active'
    // This handles the case when a property is published from 'pending' or 'draft'
    if (previousStatus !== 'active' && property.status === 'active') {
      propertyLogger.info(`📢 Property ${property._id} status changed to active - triggering instant alerts`);
      processInstantAlertsForProperty(String(property._id)).catch(err => {
        propertyLogger.error('Error processing instant alerts:', err);
      });
    }

    // Populate seller info
    await property.populate('sellerId', 'name email phone avatarUrl role agencyName');

    // Emit real-time event for instant updates across all connected clients
    emitPropertyUpdated(String(property._id), property.toObject());

    // Invalidate properties cache so changes appear immediately in search
    invalidateCache('/api/properties');

    res.json({ property });
  } catch (error: any) {
    propertyLogger.error('Update property error:', error);
    res.status(500).json({ message: 'Error updating property' });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private
export const deleteProperty = async (
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

    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Check ownership
    const currentUser = req.user as IUser;
    if (property.sellerId.toString() !== String(currentUser._id).toString()) {
      res.status(403).json({ message: 'Not authorized to delete this property' });
      return;
    }

    // Delete images from Cloudinary before deleting property
    try {
      const userId = currentUser._id.toString();
      const propertyId = String(property._id);

      // Option 1: Delete entire property folder (most efficient)
      // This deletes all images in balkan-estate/properties/user-{userId}/listing-{propertyId}/
      await deleteFolder(`balkan-estate/properties/user-${userId}/listing-${propertyId}`);

      // Option 2 (fallback): Delete individual images if they exist
      const publicIdsToDelete: string[] = [];

      // Collect all public IDs
      if (property.imagePublicId) {
        publicIdsToDelete.push(property.imagePublicId);
      }

      if (property.floorplanPublicId) {
        publicIdsToDelete.push(property.floorplanPublicId);
      }

      if (property.images && property.images.length > 0) {
        const imagePublicIds = property.images
          .map((img: any) => img.publicId)
          .filter((id: string) => id);
        publicIdsToDelete.push(...imagePublicIds);
      }

      // Delete any remaining images that weren't in the folder
      if (publicIdsToDelete.length > 0) {
        await deleteImages(publicIdsToDelete);
      }

      propertyLogger.info(`✅ Cleaned up all images for property ${propertyId}`);
    } catch (cloudinaryError: any) {
      propertyLogger.error('⚠️  Error deleting images from Cloudinary:', cloudinaryError);
      // Continue with property deletion even if Cloudinary cleanup fails
    }

    // Decrement listing count if property is active or pending
    if (property.status === 'active' || property.status === 'pending' || property.status === 'draft') {
      const user = await User.findById(String(currentUser._id));
      if (user) {
        // Auto-initialize subscription for existing users (migration-safe)
        if (!user.subscription) {
          let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
          let listingsLimit = FREE_TIER_LIMITS.LISTINGS;

          // Sync from proSubscription if exists
          if (user.proSubscription?.isActive) {
            tier = 'pro';
            // Default to yearly limit for legacy subscriptions
            listingsLimit = user.proSubscription.totalListingsLimit || PRO_TIER_LIMITS.YEARLY.LISTINGS;
          }

          // Count existing properties (excluding the one being deleted)
          const existingProperties = await Property.find({
            sellerId: user._id,
            _id: { $ne: property._id },
            status: { $in: ['active', 'pending', 'draft'] }
          });

          user.subscription = {
            tier,
            status: 'active',
            listingsLimit,
            activeListingsCount: existingProperties.length,
            privateSellerCount: existingProperties.filter(p => p.createdAsRole === 'private_seller').length,
            agentCount: existingProperties.filter(p => p.createdAsRole === 'agent').length,
            promotionCoupons: {
              monthly: user.proSubscription?.promotionCoupons?.monthly || 0,
              available: user.proSubscription?.promotionCoupons?.available || 0,
              used: user.proSubscription?.promotionCoupons?.used || 0,
              rollover: 0,
              lastRefresh: new Date(),
            },
            savedSearchesLimit: tier === 'pro' ? -1 : FREE_TIER_LIMITS.SAVED_SEARCHES, // Unlimited for Pro
            totalPaid: 0,
            startDate: user.proSubscription?.startedAt || new Date(),
            expiresAt: user.proSubscription?.expiresAt,
          };
        }

        // Decrement legacy listingsCount (for backwards compatibility)
        if (user.listingsCount > 0) {
          user.listingsCount -= 1;
        }

        // Decrement unified subscription counters based on the property's role
        if (user.subscription.activeListingsCount > 0) {
          user.subscription.activeListingsCount -= 1;
        }

        // Decrement role-specific counter based on how the property was created
        if (property.createdAsRole === 'private_seller' && (user.subscription.privateSellerCount || 0) > 0) {
          user.subscription.privateSellerCount = (user.subscription.privateSellerCount || 0) - 1;
        } else if (property.createdAsRole === 'agent' && (user.subscription.agentCount || 0) > 0) {
          user.subscription.agentCount = (user.subscription.agentCount || 0) - 1;
        }

        await user.save();

        // Update agent activeListings count if user is an agent (legacy Agent collection)
        if (user.role === 'agent') {
          const agent = await Agent.findOne({ userId: user._id });
          if (agent && agent.activeListings > 0) {
            agent.activeListings -= 1;
            await agent.save();
          }
        }
      }
    }

    // Store property ID before deletion for emit
    const deletedPropertyId = String(property._id);

    await property.deleteOne();

    // Emit real-time event for instant updates across all connected clients
    emitPropertyDeleted(deletedPropertyId);

    // Invalidate properties cache so deletion is reflected immediately in search
    invalidateCache('/api/properties');

    // Get updated subscription info to return to frontend
    const updatedUser = await User.findById(String(currentUser._id));
    const updatedSubscription = updatedUser?.subscription ? {
      activeListingsCount: updatedUser.subscription.activeListingsCount,
      privateSellerCount: updatedUser.subscription.privateSellerCount,
      agentCount: updatedUser.subscription.agentCount,
      listingsLimit: updatedUser.subscription.listingsLimit,
      tier: updatedUser.subscription.tier,
    } : null;

    res.json({
      message: 'Property deleted successfully',
      updatedSubscription,
    });
  } catch (error: any) {
    propertyLogger.error('Delete property error:', error);
    res.status(500).json({ message: 'Error deleting property' });
  }
};

// @desc    Get user's properties
// @route   GET /api/properties/my-listings
// @access  Private
export const getMyListings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    // Get the role filter from query parameters (optional)
    // If provided, only show listings created with that specific role
    const roleFilter = req.query.role as string | undefined;

    // Build query: always filter by sellerId, optionally filter by createdAsRole
    const query: any = { sellerId: userId };

    if (roleFilter && (roleFilter === 'agent' || roleFilter === 'private_seller')) {
      query.createdAsRole = roleFilter;
      propertyLogger.info(`📋 Fetching listings for user ${userId} created as ${roleFilter}`);
    } else {
      propertyLogger.info(`📋 Fetching all listings for user ${userId}`);
    }

    const properties = await Property.find(query)
      .populate('sellerId', 'name email phone avatarUrl role agencyName')
      .sort({ lastRenewed: -1, createdAt: -1 }); // Renewed listings appear first

    propertyLogger.info(`✅ Found ${properties.length} listings`);
    // Sanitize: strip PII even for own listings (frontend doesn't need it in list view)
    const sanitizedProperties = properties.map(p => sanitizeProperty(p.toObject ? p.toObject() : p, 'list'));
    res.json({ properties: sanitizedProperties });
  } catch (error: any) {
    propertyLogger.error('Get my listings error:', error);
    res.status(500).json({ message: 'Error fetching listings' });
  }
};

// @desc    Upload property images
// @route   POST /api/properties/upload-images
// @route   POST /api/properties/:propertyId/upload-images (with property ID for organized folders)
// @access  Private
export const uploadImages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const userId = req.user.id;

    // Get propertyId from route params or request body
    let propertyId: string | undefined = req.body.propertyId;
    const propertyIdParam = getParam(req, 'propertyId');
    if (propertyIdParam) {
      const paramId = getObjectIdParam(req, res, 'propertyId');
      if (!paramId) return;
      propertyId = paramId;
    }

    // If propertyId is provided, verify ownership
    if (propertyId) {
      const property = await Property.findById(propertyId);
      if (!property) {
        res.status(404).json({ message: 'Property not found' });
        return;
      }

      if (property.sellerId.toString() !== userId.toString()) {
        res.status(403).json({ message: 'Not authorized to upload images for this property' });
        return;
      }
    }

    // Upload images using the centralized service
    // Images will be organized in: balkan-estate/properties/user-{userId}/listing-{propertyId}/
    const uploadedImages = await uploadPropertyImages(files, userId, propertyId);

    res.json({
      images: uploadedImages,
      message: `Successfully uploaded ${uploadedImages.length} images`,
    });
  } catch (error: any) {
    propertyLogger.error('❌ Upload images error:', error);
    res.status(500).json({ message: 'Error uploading images' });
  }
};

// @desc    Mark property as sold
// @route   PATCH /api/properties/:id/mark-sold
// @access  Private
export const markAsSold = async (
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

    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Check ownership
    const currentUser = req.user as IUser;
    if (property.sellerId.toString() !== String(currentUser._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this property' });
      return;
    }

    // Decrement listing count if property was active
    if (property.status === 'active' || property.status === 'pending') {
      const user = await User.findById(String(currentUser._id));
      if (user && user.listingsCount > 0) {
        user.listingsCount -= 1;
        await user.save();

        // Update agent stats if user is an agent
        if (user.role === 'agent') {
          const agent = await Agent.findOne({ userId: user._id });
          if (agent) {
            // Decrement active listings
            if (agent.activeListings > 0) {
              agent.activeListings -= 1;
            }
            // Increment total sales and sales value
            agent.totalSales += 1;
            agent.totalSalesValue += property.price || 0;
            await agent.save();
          }
        }
      }
    }

    const soldDate = new Date();
    property.status = 'sold';
    property.soldAt = soldDate;
    await property.save();

    // Update seller's sold statistics in real-time
    await updateSoldStats(String(currentUser._id), property.price || 0);

    // Create sales history record
    const user = await User.findById(String(currentUser._id));
    if (user) {
      const daysOnMarket = Math.floor((soldDate.getTime() - property.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      await SalesHistory.create({
        sellerId: user._id,
        sellerName: user.name,
        sellerEmail: user.email,
        sellerRole: user.role,
        propertyId: property._id,
        propertyAddress: property.address,
        propertyCity: property.city,
        propertyCountry: property.country,
        propertyType: property.propertyType,
        salePrice: property.price || 0,
        currency: 'EUR', // Default currency
        soldAt: soldDate,
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        totalViews: property.views || 0,
        totalSaves: property.saves || 0,
        daysOnMarket,
      });

      propertyLogger.info(`📊 Sales history record created for property ${property._id}`);
    }

    // Invalidate properties cache so sold status appears immediately in search
    invalidateCache('/api/properties');

    res.json({ property });
  } catch (error: any) {
    propertyLogger.error('Mark as sold error:', error);
    res.status(500).json({ message: 'Error marking property as sold' });
  }
};

// @desc    Mark rental property as rented
// @route   PATCH /api/properties/:id/mark-rented
// @access  Private
export const markAsRented = async (
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

    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Check ownership
    const currentUser = req.user as IUser;
    if (property.sellerId.toString() !== String(currentUser._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this property' });
      return;
    }

    if (property.listingType !== 'rent') {
      res.status(400).json({ message: 'Only rental properties can be marked as rented' });
      return;
    }

    // Decrement listing count if property was active
    if (property.status === 'active' || property.status === 'pending') {
      const user = await User.findById(String(currentUser._id));
      if (user && user.listingsCount > 0) {
        user.listingsCount -= 1;
        await user.save();
      }
    }

    const rentedDate = new Date();
    property.status = 'rented';
    property.rentedAt = rentedDate;

    // Accept optional rentedUntil date from request body
    if (req.body?.rentedUntil) {
      property.rentedUntil = new Date(req.body.rentedUntil);
    }

    await property.save();

    // Invalidate properties cache
    invalidateCache('/api/properties');

    res.json({ property });
  } catch (error: any) {
    propertyLogger.error('Mark as rented error:', error);
    res.status(500).json({ message: 'Error marking property as rented' });
  }
};

// @desc    Mark rented property as available again
// @route   PATCH /api/properties/:id/mark-available
// @access  Private
export const markAsAvailable = async (
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

    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const currentUser = req.user as IUser;
    if (property.sellerId.toString() !== String(currentUser._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this property' });
      return;
    }

    if (property.status !== 'rented') {
      res.status(400).json({ message: 'Only rented properties can be marked as available' });
      return;
    }

    // Increment listing count back
    const user = await User.findById(String(currentUser._id));
    if (user) {
      user.listingsCount += 1;
      await user.save();
    }

    // Save current rental period to history before clearing
    if (property.rentedAt) {
      const endDate = new Date();
      // Calculate monthly rent equivalent for history
      let monthlyRent = property.price;
      if (property.rentPeriod === 'weekly') monthlyRent = property.price * 4.33;
      else if (property.rentPeriod === 'daily') monthlyRent = property.price * 30;

      await Property.updateOne(
        { _id: property._id },
        {
          $push: {
            rentalHistory: {
              startDate: property.rentedAt,
              endDate,
              monthlyRent,
            },
          },
        }
      );
    }

    // Set availableFrom
    const newAvailableFrom = req.body?.availableFrom ? new Date(req.body.availableFrom) : new Date();

    // Use updateOne with $set and $unset to properly clear fields
    await Property.updateOne(
      { _id: property._id },
      {
        $set: {
          status: 'active',
          availableFrom: newAvailableFrom,
        },
        $unset: {
          rentedAt: 1,
          rentedUntil: 1,
        },
      }
    );

    // Reload the property to return fresh data
    const updatedProperty = await Property.findById(property._id);

    // Invalidate properties cache
    invalidateCache('/api/properties');

    res.json({ property: updatedProperty });
  } catch (error: any) {
    propertyLogger.error('Mark as available error:', error);
    res.status(500).json({ message: 'Error marking property as available' });
  }
};

// @desc    Add a rental history entry manually
// @route   POST /api/properties/:id/rental-history
// @access  Private (owner only)
export const addRentalHistoryEntry = async (
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

    const property = await Property.findById(id);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const currentUser = req.user as IUser;
    if (property.sellerId.toString() !== String(currentUser._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this property' });
      return;
    }

    const { startDate, endDate, monthlyRent, tenantName, notes } = req.body;
    if (!startDate || !endDate || monthlyRent === undefined) {
      res.status(400).json({ message: 'startDate, endDate, and monthlyRent are required' });
      return;
    }

    const entry = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      monthlyRent: Number(monthlyRent),
      tenantName: tenantName || undefined,
      notes: notes || undefined,
    };

    await Property.updateOne(
      { _id: property._id },
      { $push: { rentalHistory: entry } }
    );

    const updatedProperty = await Property.findById(property._id);
    invalidateCache('/api/properties');

    res.json({ property: updatedProperty });
  } catch (error: any) {
    propertyLogger.error('Add rental history error:', error);
    res.status(500).json({ message: 'Error adding rental history entry' });
  }
};

// @desc    Delete a rental history entry
// @route   DELETE /api/properties/:id/rental-history/:entryId
// @access  Private (owner only)
export const deleteRentalHistoryEntry = async (
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

    const entryId = getObjectIdParam(req, res, 'entryId');
    if (!entryId) return;

    const property = await Property.findById(id);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const currentUser = req.user as IUser;
    if (property.sellerId.toString() !== String(currentUser._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this property' });
      return;
    }

    await Property.updateOne(
      { _id: property._id },
      { $pull: { rentalHistory: { _id: entryId } } }
    );

    const updatedProperty = await Property.findById(property._id);
    invalidateCache('/api/properties');

    res.json({ property: updatedProperty });
  } catch (error: any) {
    propertyLogger.error('Delete rental history error:', error);
    res.status(500).json({ message: 'Error deleting rental history entry' });
  }
};

// @desc    Renew property listing (puts listing at top, once per 24 hours)
// @route   PATCH /api/properties/:id/renew
// @access  Private
export const renewProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    propertyLogger.info('🔄 Renew property request:', id);

    if (!req.user) {
      propertyLogger.info('❌ Renew failed: Not authorized');
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Check ownership
    if (property.sellerId.toString() !== String((req.user as IUser)._id).toString()) {
      res.status(403).json({ message: 'Not authorized to renew this property' });
      return;
    }

    // Check 24hr cooldown
    const COOLDOWN_HOURS = 24;
    const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
    const now = new Date();

    if (property.lastRenewed) {
      const lastRenewedTime = new Date(property.lastRenewed).getTime();
      const timeSinceRenewal = now.getTime() - lastRenewedTime;

      if (timeSinceRenewal < cooldownMs) {
        const canRenewAt = new Date(lastRenewedTime + cooldownMs);
        const hoursRemaining = Math.ceil((cooldownMs - timeSinceRenewal) / (60 * 60 * 1000));
        const minutesRemaining = Math.ceil((cooldownMs - timeSinceRenewal) / (60 * 1000)) % 60;

        res.status(429).json({
          message: `You can only renew once every ${COOLDOWN_HOURS} hours`,
          code: 'RENEWAL_COOLDOWN',
          canRenewAt: canRenewAt.toISOString(),
          hoursRemaining,
          minutesRemaining,
          lastRenewed: property.lastRenewed,
        });
        return;
      }
    }

    property.lastRenewed = now;
    await property.save();
    propertyLogger.info('✅ Property renewed successfully:', property._id, 'lastRenewed:', now.toISOString());

    // Invalidate properties cache so renewed position is reflected immediately
    invalidateCache('/api/properties');

    // Calculate when they can renew next
    const canRenewAt = new Date(now.getTime() + cooldownMs);

    res.json({
      success: true,
      message: 'Property renewed successfully! It will appear at the top of search results.',
      property,
      lastRenewed: now.toISOString(),
      canRenewAt: canRenewAt.toISOString(),
    });
  } catch (error: any) {
    propertyLogger.error('Renew property error:', error);
    res.status(500).json({ message: 'Error renewing property' });
  }
};