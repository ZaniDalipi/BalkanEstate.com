import { Request, Response } from 'express';
import User from '../models/User';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import Property from '../models/Property';
import DiscountCode from '../models/DiscountCode';
import Inquiry from '../models/Inquiry';
import { geocodeAddressWithRateLimit } from '../services/geocodingService';
import { getWhitelistConfig } from '../middleware/adminAuth';
import { adminLogger } from '../utils/logger';
import { invalidateCache } from '../middleware/cache';
import { migratePropertySchema } from '../utils/migratePropertySchema';
import { getObjectIdParam } from '../utils/validateParams';
import { escapeRegex } from '../utils/escapeRegex';
import { sendLicenseRejectionEmail } from '../services/emailService';


// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin + VPN
export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalAgents,
      totalAgencies,
      totalProperties,
      activeDiscountCodes,
      todayUsers,
      todayProperties,
      totalInquiries,
      newInquiries,
    ] = await Promise.all([
      User.countDocuments(),
      Agent.countDocuments({ isActive: true }),
      Agency.countDocuments(),
      Property.countDocuments(),
      DiscountCode.countDocuments({ isActive: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Property.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ status: 'new' }),
    ]);

    // User role breakdown
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    // Property status breakdown
    const propertiesByStatus = await Property.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Subscription status
    const subscribedUsers = await User.countDocuments({ isSubscribed: true });

    res.json({
      overview: {
        totalUsers,
        totalAgents,
        totalAgencies,
        totalProperties,
        activeDiscountCodes,
        subscribedUsers,
        todayUsers,
        todayProperties,
        totalInquiries,
        newInquiries,
      },
      usersByRole: usersByRole.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      propertiesByStatus: propertiesByStatus.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });
  } catch (error: any) {
    adminLogger.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Error fetching admin statistics' });
  }
};

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private/Admin + VPN
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, isSubscribed, licenseVerified, search, page = 1, limit = 50, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query: any = {};
    if (role) query.role = role;
    if (isSubscribed !== undefined) query.isSubscribed = isSubscribed === 'true';
    if (licenseVerified !== undefined) query.licenseVerified = licenseVerified === 'true';
    if (search) {
      const safeSearch = escapeRegex(String(search));
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    // SECURITY: Whitelist sortBy to prevent sorting by internal/sensitive fields
    const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'email', 'role', 'isSubscribed', 'phone', 'city', 'country'];
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(String(sortBy)) ? String(sortBy) : 'createdAt';
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-password -refreshTokens -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires -loginHistory -publicKey -__v')
      .sort({ [safeSortBy]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error: any) {
    adminLogger.error('Get all users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// @desc    Update user details or role
// @route   PATCH /api/admin/users/:id
// @access  Private/Admin + VPN
export const updateUserAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    // SECURITY: Whitelist allowed fields to prevent mass assignment.
    // Fields like password, refreshTokens, loginHistory, etc. can never be set here.
    // Sensitive fields like email, subscription, and enterprise tier are managed
    // through dedicated endpoints (subscription management, user self-service).
    const ALLOWED_ADMIN_UPDATE_FIELDS = [
      'name', 'phone', 'city', 'country',
      'role', 'activeRole', 'primaryRole',
      'availableRoles', 'status', 'isEmailVerified', 'licenseVerified',
      'licenseNumber', 'bio', 'languages', 'specializations',
      'serviceAreas', 'avatarUrl', 'avatarOptions',
      'agencyName',
    ];

    const updates: Record<string, any> = {};
    for (const field of ALLOWED_ADMIN_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No valid fields to update' });
      return;
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      context: 'query'
    }).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Invalidate related caches so changes reflect immediately across the app
    invalidateCache('/api/agents');
    invalidateCache('/api/agencies');
    invalidateCache('/api/properties');

    res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (error: any) {
    adminLogger.error('Update user error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }

    res.status(500).json({ message: 'Error updating user' });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin + VPN
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Delete associated data
    if (user.role === 'agent') {
      await Agent.deleteMany({ userId: id });
    }

    await Property.deleteMany({ sellerId: id });
    await user.deleteOne();

    // Invalidate related caches so deletion reflects immediately across the app
    invalidateCache('/api/agents');
    invalidateCache('/api/agencies');
    invalidateCache('/api/properties');

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (error: any) {
    adminLogger.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// @desc    Get all agencies with details
// @route   GET /api/admin/agencies
// @access  Private/Admin + VPN
export const getAllAgenciesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const agencies = await Agency.find()
      .populate('ownerId', 'name email subscription')
      .populate('agents', 'name email role subscription agencyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Agency.countDocuments();

    // Enhance agencies with subscription and coupon stats
    const enhancedAgencies = agencies.map((agency: any) => {
      // Count agent coupons
      const availableCoupons = agency.agentCoupons?.filter((c: any) => c.status === 'available').length || 0;
      const usedCoupons = agency.agentCoupons?.filter((c: any) => c.status === 'used').length || 0;
      const expiredCoupons = agency.agentCoupons?.filter((c: any) => c.status === 'expired').length || 0;

      // Count agents with active subscriptions
      const agentsWithSubscription = (agency.agents || []).filter((agent: any) =>
        agent.subscription?.tier === 'agency_agent' && agent.subscription?.status === 'active'
      ).length;

      return {
        ...agency,
        stats: {
          ...agency.stats,
          totalAgents: agency.agents?.length || 0,
          agentsWithSubscription,
          maxAgents: 6, // Enterprise plan: owner + 5 agents
          slotsRemaining: Math.max(0, 6 - (agency.agents?.length || 0)),
        },
        couponStats: {
          total: (agency.agentCoupons?.length || 0),
          available: availableCoupons,
          used: usedCoupons,
          expired: expiredCoupons,
        },
        subscription: {
          status: agency.subscription?.status,
          expiresAt: agency.subscription?.expiresAt,
          isActive: agency.subscription?.status === 'active' &&
                   agency.subscription?.expiresAt &&
                   new Date(agency.subscription.expiresAt) > new Date(),
        },
      };
    });

    res.json({
      agencies: enhancedAgencies,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error: any) {
    adminLogger.error('Get agencies error:', error);
    res.status(500).json({ message: 'Error fetching agencies' });
  }
};

// @desc    Get single agency with full agent details
// @route   GET /api/admin/agencies/:id
// @access  Private/Admin + VPN
export const getAgencyDetailAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id)
      .populate('ownerId', 'name email phone subscription avatarUrl')
      .populate('agents', 'name email phone role subscription agencyName avatarUrl createdAt')
      .lean();

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Get detailed agent info with their coupon codes
    const agentDetails = (agency.agents || []).map((agent: any) => {
      // Find the coupon this agent used
      const agentCoupon = agency.agentCoupons?.find(
        (c: any) => String(c.usedBy) === String(agent._id)
      );

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        avatarUrl: agent.avatarUrl,
        createdAt: agent.createdAt,
        subscription: {
          tier: agent.subscription?.tier,
          status: agent.subscription?.status,
          listingsLimit: agent.subscription?.listingsLimit,
          activeListingsCount: agent.subscription?.activeListingsCount || 0,
          expiresAt: agent.subscription?.expiresAt,
        },
        coupon: agentCoupon ? {
          code: agentCoupon.code,
          usedAt: agentCoupon.usedAt,
          expiresAt: agentCoupon.expiresAt,
        } : null,
      };
    });

    // Coupon statistics
    const couponStats = {
      total: agency.agentCoupons?.length || 0,
      available: agency.agentCoupons?.filter((c: any) => c.status === 'available').length || 0,
      used: agency.agentCoupons?.filter((c: any) => c.status === 'used').length || 0,
      expired: agency.agentCoupons?.filter((c: any) => c.status === 'expired').length || 0,
      coupons: agency.agentCoupons?.map((c: any) => ({
        code: c.code,
        status: c.status,
        generatedAt: c.generatedAt,
        expiresAt: c.expiresAt,
        usedBy: c.usedBy,
        usedAt: c.usedAt,
      })) || [],
    };

    res.json({
      agency: {
        _id: agency._id,
        name: agency.name,
        email: agency.email,
        phone: agency.phone,
        website: agency.website,
        address: agency.address,
        city: agency.city,
        country: agency.country,
        logo: agency.logo,
        coverImage: agency.coverImage,
        owner: agency.ownerId,
        invitationCode: agency.invitationCode,
        createdAt: agency.createdAt,
        subscription: {
          status: agency.subscription?.status,
          expiresAt: agency.subscription?.expiresAt,
          isActive: agency.subscription?.status === 'active' &&
                   agency.subscription?.expiresAt &&
                   new Date(agency.subscription.expiresAt) > new Date(),
        },
        stats: {
          totalAgents: agentDetails.length,
          agentsWithActiveSubscription: agentDetails.filter(a => a.subscription.status === 'active').length,
          maxAgents: 6,
          slotsRemaining: Math.max(0, 6 - agentDetails.length),
          totalListings: agency.stats?.totalListings || 0,
          activeListings: agency.stats?.activeListings || 0,
        },
      },
      agents: agentDetails,
      couponStats,
    });
  } catch (error: any) {
    adminLogger.error('Get agency detail error:', error);
    res.status(500).json({ message: 'Error fetching agency details' });
  }
};

// @desc    Update agency details
// @route   PATCH /api/admin/agencies/:id
// @access  Private/Admin
export const updateAgency = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const updates = req.body;

    // Prevent updating certain fields through this endpoint
    delete updates.ownerId;
    delete updates.agents;
    delete updates.slug; // Slug should be managed separately

    const agency = await Agency.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      context: 'query'
    })
      .populate('ownerId', 'name email')
      .populate('agents', 'name email role');

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    res.json({
      message: 'Agency updated successfully',
      agency,
    });
  } catch (error: any) {
    adminLogger.error('Update agency error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }

    res.status(500).json({ message: 'Error updating agency' });
  }
};

// @desc    Delete agency
// @route   DELETE /api/admin/agencies/:id
// @access  Private/Admin
export const deleteAgency = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const agency = await Agency.findById(id);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Unassign all agents from this agency
    await User.updateMany(
      { agencyId: id },
      { $unset: { agencyId: '', agencyName: '' } }
    );

    // Delete the agency
    await agency.deleteOne();

    res.json({ message: 'Agency deleted successfully and agents unassigned' });
  } catch (error: any) {
    adminLogger.error('Delete agency error:', error);
    res.status(500).json({ message: 'Error deleting agency' });
  }
};

// @desc    Get all properties with filters
// @route   GET /api/admin/properties
// @access  Private/Admin + VPN
export const getAllPropertiesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (search) {
      const safeSearch = escapeRegex(String(search));
      query.$or = [
        { title: { $regex: safeSearch, $options: 'i' } },
        { address: { $regex: safeSearch, $options: 'i' } },
        { city: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const properties = await Property.find(query)
      .populate('sellerId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Property.countDocuments(query);

    res.json({
      properties,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error: any) {
    adminLogger.error('Get properties error:', error);
    res.status(500).json({ message: 'Error fetching properties' });
  }
};

// @desc    Update property details
// @route   PATCH /api/admin/properties/:id
// @access  Private/Admin
export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const updates = req.body;

    // Prevent updating certain fields through this endpoint
    delete updates.sellerId;
    delete updates.createdByName;
    delete updates.createdByEmail;
    // Price can only be changed by the property owner, not admin
    delete updates.price;
    delete updates.priceType;

    const property = await Property.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      context: 'query'
    })
      .populate('sellerId', 'name email role');

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    res.json({
      message: 'Property updated successfully',
      property,
    });
  } catch (error: any) {
    adminLogger.error('Update property error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }

    res.status(500).json({ message: 'Error updating property' });
  }
};

// @desc    Delete property
// @route   DELETE /api/admin/properties/:id
// @access  Private/Admin + VPN
export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const property = await Property.findByIdAndDelete(id);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    res.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    adminLogger.error('Delete property error:', error);
    res.status(500).json({ message: 'Error deleting property' });
  }
};

// @desc    Get system configuration
// @route   GET /api/admin/config
// @access  Private/Admin + VPN
export const getSystemConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      vpnWhitelistCount: getWhitelistConfig().ips.length,
      features: {
        discountCodes: true,
        gamification: true,
        subscriptions: true,
        payments: true,
      },
    });
  } catch (error: any) {
    adminLogger.error('Get system config error:', error);
    res.status(500).json({ message: 'Error fetching system config' });
  }
};

// @desc    Fix properties with missing or invalid coordinates
// @route   POST /api/admin/fix-coordinates
// @access  Private/Admin
export const fixPropertyCoordinates = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find all properties with missing or invalid coordinates
    const propertiesWithMissingCoords = await Property.find({
      $or: [
        { lat: { $exists: false } },
        { lng: { $exists: false } },
        { lat: null },
        { lng: null },
        { lat: 0 },
        { lng: 0 },
      ],
      status: 'active', // Only fix active properties
    });

    adminLogger.info(`🔧 Found ${propertiesWithMissingCoords.length} properties with missing coordinates`);

    const results = {
      total: propertiesWithMissingCoords.length,
      fixed: 0,
      failed: 0,
      details: [] as { id: string; title: string; status: string; lat?: number; lng?: number }[],
    };

    for (const property of propertiesWithMissingCoords) {
      try {
        adminLogger.info(`📍 Geocoding property: ${property.title || property.address} (${property.city}, ${property.country})`);

        const geocodeResult = await geocodeAddressWithRateLimit(
          property.address,
          property.city,
          property.country
        );

        if (geocodeResult && geocodeResult.lat && geocodeResult.lng) {
          property.lat = geocodeResult.lat;
          property.lng = geocodeResult.lng;
          await property.save();

          results.fixed++;
          results.details.push({
            id: String(property._id),
            title: property.title || property.address,
            status: 'fixed',
            lat: geocodeResult.lat,
            lng: geocodeResult.lng,
          });
          adminLogger.info(`✅ Fixed: ${property.title || property.address} -> ${geocodeResult.lat}, ${geocodeResult.lng}`);
        } else {
          results.failed++;
          results.details.push({
            id: String(property._id),
            title: property.title || property.address,
            status: 'failed - no geocode result',
          });
          adminLogger.info(`❌ Failed to geocode: ${property.title || property.address}`);
        }
      } catch (error: any) {
        results.failed++;
        results.details.push({
          id: String(property._id),
          title: property.title || property.address,
          status: `failed - ${error.message}`,
        });
        adminLogger.error(`❌ Error fixing property ${property._id}:`, error.message);
      }
    }

    adminLogger.info(`🔧 Fix coordinates complete: ${results.fixed} fixed, ${results.failed} failed`);

    res.json({
      message: `Fixed ${results.fixed} of ${results.total} properties`,
      results,
    });
  } catch (error: any) {
    adminLogger.error('Fix coordinates error:', error);
    res.status(500).json({ message: 'Error fixing property coordinates' });
  }
};

// @desc    Fix coordinates for a single property by ID
// @route   POST /api/admin/fix-coordinates/:propertyId
// @access  Private/Admin
export const fixSinglePropertyCoordinates = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = getObjectIdParam(req, res, 'propertyId');
    if (!propertyId) return;

    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    adminLogger.info(`📍 Geocoding single property: ${property.title || property.address} (${property.city}, ${property.country})`);
    adminLogger.info(`   Current coordinates: lat=${property.lat}, lng=${property.lng}`);

    const geocodeResult = await geocodeAddressWithRateLimit(
      property.address,
      property.city,
      property.country
    );

    if (geocodeResult && geocodeResult.lat && geocodeResult.lng) {
      property.lat = geocodeResult.lat;
      property.lng = geocodeResult.lng;
      await property.save();

      adminLogger.info(`✅ Fixed: ${property.title || property.address} -> ${geocodeResult.lat}, ${geocodeResult.lng}`);

      res.json({
        message: 'Property coordinates fixed successfully',
        property: {
          id: String(property._id),
          title: property.title || property.address,
          address: property.address,
          city: property.city,
          country: property.country,
          lat: property.lat,
          lng: property.lng,
        },
      });
    } else {
      adminLogger.info(`❌ Failed to geocode: ${property.title || property.address}`);
      res.status(400).json({
        message: 'Failed to geocode property address. The address may not be recognized.',
        property: {
          id: String(property._id),
          title: property.title || property.address,
          address: property.address,
          city: property.city,
          country: property.country,
        },
      });
    }
  } catch (error: any) {
    adminLogger.error('Fix single property coordinates error:', error);
    res.status(500).json({ message: 'Error fixing property coordinates' });
  }
};

// @desc    Get properties with missing coordinates
// @route   GET /api/admin/properties-missing-coords
// @access  Private/Admin
export const getPropertiesMissingCoords = async (req: Request, res: Response): Promise<void> => {
  try {
    const properties = await Property.find({
      $or: [
        { lat: { $exists: false } },
        { lng: { $exists: false } },
        { lat: null },
        { lng: null },
        { lat: 0 },
        { lng: 0 },
      ],
    }).select('_id title address city country lat lng status createdAt');

    res.json({
      count: properties.length,
      properties,
    });
  } catch (error: any) {
    adminLogger.error('Get properties missing coords error:', error);
    res.status(500).json({ message: 'Error fetching properties' });
  }
};

// ===== Inquiry Management =====

// @desc    Get all inquiries with filters
// @route   GET /api/admin/inquiries
// @access  Private/Admin
export const getAllInquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type,
      status,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const query: any = {};
    if (type && type !== 'all') query.type = type;
    if (status && status !== 'all') query.status = status;
    if (search) {
      const safeSearch = escapeRegex(String(search));
      query.$or = [
        { buyerName: { $regex: safeSearch, $options: 'i' } },
        { buyerEmail: { $regex: safeSearch, $options: 'i' } },
        { recipientName: { $regex: safeSearch, $options: 'i' } },
        { propertyTitle: { $regex: safeSearch, $options: 'i' } },
        { message: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const inquiries = await Inquiry.find(query)
      .populate('recipientId', 'name email role avatarUrl')
      .populate('propertyId', 'title images price city country')
      .sort({ [String(sortBy)]: sortOrder })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Inquiry.countDocuments(query);

    // Get status counts for filtering
    const statusCounts = await Inquiry.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const typeCounts = await Inquiry.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    res.json({
      inquiries,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      counts: {
        byStatus: statusCounts.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byType: typeCounts.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error: any) {
    adminLogger.error('Get all inquiries error:', error);
    res.status(500).json({ message: 'Error fetching inquiries' });
  }
};

// @desc    Get single inquiry details
// @route   GET /api/admin/inquiries/:id
// @access  Private/Admin
export const getInquiryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const inquiry = await Inquiry.findById(id)
      .populate('recipientId', 'name email role avatarUrl phone')
      .populate('propertyId', 'title images price city country address')
      .populate('buyerId', 'name email avatarUrl');

    if (!inquiry) {
      res.status(404).json({ message: 'Inquiry not found' });
      return;
    }

    res.json({ inquiry });
  } catch (error: any) {
    adminLogger.error('Get inquiry by id error:', error);
    res.status(500).json({ message: 'Error fetching inquiry' });
  }
};

// @desc    Update inquiry status or add admin notes
// @route   PATCH /api/admin/inquiries/:id
// @access  Private/Admin
export const updateInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const { status, adminNotes } = req.body;

    const updates: any = {};
    if (status) {
      updates.status = status;
      if (status === 'read' && !updates.readAt) {
        updates.readAt = new Date();
      }
      if (status === 'replied' && !updates.repliedAt) {
        updates.repliedAt = new Date();
      }
    }
    if (adminNotes !== undefined) {
      updates.adminNotes = adminNotes;
    }

    const inquiry = await Inquiry.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('recipientId', 'name email role avatarUrl')
      .populate('propertyId', 'title images price city country');

    if (!inquiry) {
      res.status(404).json({ message: 'Inquiry not found' });
      return;
    }

    res.json({
      message: 'Inquiry updated successfully',
      inquiry,
    });
  } catch (error: any) {
    adminLogger.error('Update inquiry error:', error);
    res.status(500).json({ message: 'Error updating inquiry' });
  }
};

// @desc    Delete inquiry
// @route   DELETE /api/admin/inquiries/:id
// @access  Private/Admin
export const deleteInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const inquiry = await Inquiry.findByIdAndDelete(id);
    if (!inquiry) {
      res.status(404).json({ message: 'Inquiry not found' });
      return;
    }

    res.json({ message: 'Inquiry deleted successfully' });
  } catch (error: any) {
    adminLogger.error('Delete inquiry error:', error);
    res.status(500).json({ message: 'Error deleting inquiry' });
  }
};

// @desc    Bulk update inquiry status
// @route   PATCH /api/admin/inquiries/bulk-status
// @access  Private/Admin
export const bulkUpdateInquiryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inquiryIds, status } = req.body;

    if (!inquiryIds || !Array.isArray(inquiryIds) || inquiryIds.length === 0) {
      res.status(400).json({ message: 'Inquiry IDs array is required' });
      return;
    }

    if (!status || !['new', 'read', 'replied', 'archived'].includes(status)) {
      res.status(400).json({ message: 'Valid status is required' });
      return;
    }

    const updates: any = { status };
    if (status === 'read') updates.readAt = new Date();
    if (status === 'replied') updates.repliedAt = new Date();

    const result = await Inquiry.updateMany(
      { _id: { $in: inquiryIds } },
      updates
    );

    res.json({
      message: `${result.modifiedCount} inquiries updated to ${status}`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    adminLogger.error('Bulk update inquiry status error:', error);
    res.status(500).json({ message: 'Error updating inquiries' });
  }
};

// @desc    Get inquiry statistics
// @route   GET /api/admin/inquiries/stats
// @access  Private/Admin
export const getInquiryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalInquiries,
      newInquiries,
      todayInquiries,
      weekInquiries,
    ] = await Promise.all([
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ status: 'new' }),
      Inquiry.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Inquiry.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    // Get counts by type
    const byType = await Inquiry.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    // Get counts by status
    const byStatus = await Inquiry.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Get top agents by inquiries received
    const topAgents = await Inquiry.aggregate([
      { $group: { _id: '$recipientId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent',
        },
      },
      { $unwind: '$agent' },
      {
        $project: {
          _id: 1,
          count: 1,
          name: '$agent.name',
          email: '$agent.email',
          avatarUrl: '$agent.avatarUrl',
        },
      },
    ]);

    res.json({
      overview: {
        totalInquiries,
        newInquiries,
        todayInquiries,
        weekInquiries,
      },
      byType: byType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byStatus: byStatus.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topAgents,
    });
  } catch (error: any) {
    adminLogger.error('Get inquiry stats error:', error);
    res.status(500).json({ message: 'Error fetching inquiry stats' });
  }
};

// @desc    Sync property schema — adds missing attributes and indexes to all properties
// @route   POST /api/admin/sync-property-schema
// @access  Private/Admin
export const syncPropertySchema = async (req: Request, res: Response): Promise<void> => {
  try {
    // Sync missing document attributes
    const { commonUpdated, rentalUpdated } = await migratePropertySchema();

    // Sync missing indexes
    await Property.syncIndexes();
    const indexes = await Property.collection.indexes();

    invalidateCache('/api/properties');

    res.json({
      success: true,
      message: 'Property schema synced successfully',
      commonUpdated,
      rentalUpdated,
      indexCount: indexes.length,
    });
  } catch (error: any) {
    adminLogger.error('Sync property schema error:', error);
    res.status(500).json({ message: 'Error syncing property schema' });
  }
};

// ===== License Verification Management =====

// @desc    Get agents with pending license verification
// @route   GET /api/admin/pending-licenses
// @access  Private/Admin
export const getPendingLicenses = async (req: Request, res: Response): Promise<void> => {
  try {
    const pendingAgents = await Agent.find({ licenseStatus: 'pending' })
      .populate('userId', 'name email phone avatarUrl country city')
      .sort({ updatedAt: -1 });

    res.json({
      count: pendingAgents.length,
      agents: pendingAgents.map((agent) => ({
        agentId: agent.agentId,
        userId: agent.userId,
        licenseNumber: agent.licenseNumber,
        licenseCountry: agent.licenseCountry,
        licenseStatus: agent.licenseStatus,
        agencyName: agent.agencyName,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      })),
    });
  } catch (error: any) {
    adminLogger.error('Get pending licenses error:', error);
    res.status(500).json({ message: 'Error fetching pending licenses' });
  }
};

// @desc    Approve an agent's license
// @route   POST /api/admin/approve-license/:userId
// @access  Private/Admin
export const approveLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;

    const [user, agentRecord] = await Promise.all([
      User.findById(userId),
      Agent.findOne({ userId }),
    ]);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!agentRecord) {
      res.status(404).json({ message: 'Agent record not found' });
      return;
    }

    if (!agentRecord.licenseNumber) {
      res.status(400).json({ message: 'Agent has no license number to approve' });
      return;
    }

    // Update Agent record
    agentRecord.licenseVerified = true;
    agentRecord.licenseVerificationDate = new Date();
    agentRecord.licenseStatus = 'verified';
    await agentRecord.save();

    // Update User record
    user.licenseVerified = true;
    user.licenseVerificationDate = new Date();
    await user.save();

    adminLogger.info(`License approved for user ${userId} (license: ${agentRecord.licenseNumber})`);

    res.json({
      message: 'License approved successfully',
      userId: String(user._id),
      licenseNumber: agentRecord.licenseNumber,
      licenseStatus: 'verified',
    });
  } catch (error: any) {
    adminLogger.error('Approve license error:', error);
    res.status(500).json({ message: 'Error approving license' });
  }
};

// @desc    Reject an agent's license
// @route   POST /api/admin/reject-license/:userId
// @access  Private/Admin
export const rejectLicense = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;

    const { reason } = req.body;

    const [user, agentRecord] = await Promise.all([
      User.findById(userId),
      Agent.findOne({ userId }),
    ]);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!agentRecord) {
      res.status(404).json({ message: 'Agent record not found' });
      return;
    }

    // Update Agent record
    agentRecord.licenseVerified = false;
    agentRecord.licenseVerificationDate = undefined;
    agentRecord.licenseStatus = 'rejected';
    await agentRecord.save();

    // Update User record — also sync agentLicense sub-document status
    user.licenseVerified = false;
    user.licenseVerificationDate = undefined;
    if (user.agentLicense) {
      user.agentLicense.status = 'rejected';
      user.agentLicense.isVerified = false;
      if (reason) {
        user.agentLicense.rejectionReason = reason;
      }
    }
    await user.save();

    adminLogger.info(`License rejected for user ${userId} (reason: ${reason || 'none provided'})`);

    // Send rejection email notification to the user
    try {
      await sendLicenseRejectionEmail({
        email: user.email,
        userName: user.name || 'Agent',
        licenseNumber: agentRecord.licenseNumber || '',
        reason: reason || undefined,
      });
    } catch (emailError) {
      adminLogger.error('Failed to send license rejection email:', emailError);
      // Don't fail the rejection if email fails
    }

    res.json({
      message: 'License rejected',
      userId: String(user._id),
      licenseNumber: agentRecord.licenseNumber,
      licenseStatus: 'rejected',
      reason: reason || undefined,
    });
  } catch (error: any) {
    adminLogger.error('Reject license error:', error);
    res.status(500).json({ message: 'Error rejecting license' });
  }
};
