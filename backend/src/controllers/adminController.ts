import { Request, Response } from 'express';
import User from '../models/User';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import Property from '../models/Property';
import DiscountCode from '../models/DiscountCode';
import { geocodeAddressWithRateLimit } from '../services/geocodingService';


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
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Error fetching admin statistics', error: error.message });
  }
};

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private/Admin + VPN
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, isSubscribed, search, page = 1, limit = 50, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query: any = {};
    if (role) query.role = role;
    if (isSubscribed !== undefined) query.isSubscribed = isSubscribed === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const users = await User.find(query)
      .select('-password')
      .sort({ [String(sortBy)]: sortOrder })
      .skip(skip)
      .limit(Number(limit))
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
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// @desc    Update user details or role
// @route   PATCH /api/admin/users/:id
// @access  Private/Admin + VPN
export const updateUserAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating password through this endpoint
    delete updates.password;

    // Remove empty string values that might cause validation issues
    Object.keys(updates).forEach(key => {
      if (updates[key] === '') {
        delete updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      context: 'query'
    }).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (error: any) {
    console.error('Update user error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }

    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin + VPN
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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

    res.json({ message: 'User and associated data deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
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
      .populate('ownerId', 'name email')
      .populate('agents', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Agency.countDocuments();

    res.json({
      agencies,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error: any) {
    console.error('Get agencies error:', error);
    res.status(500).json({ message: 'Error fetching agencies', error: error.message });
  }
};

// @desc    Update agency details
// @route   PATCH /api/admin/agencies/:id
// @access  Private/Admin
export const updateAgency = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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
    console.error('Update agency error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }

    res.status(500).json({ message: 'Error updating agency', error: error.message });
  }
};

// @desc    Delete agency
// @route   DELETE /api/admin/agencies/:id
// @access  Private/Admin
export const deleteAgency = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

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
    console.error('Delete agency error:', error);
    res.status(500).json({ message: 'Error deleting agency', error: error.message });
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
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
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
    console.error('Get properties error:', error);
    res.status(500).json({ message: 'Error fetching properties', error: error.message });
  }
};

// @desc    Update property details
// @route   PATCH /api/admin/properties/:id
// @access  Private/Admin
export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields through this endpoint
    delete updates.sellerId;
    delete updates.createdByName;
    delete updates.createdByEmail;

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
    console.error('Update property error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }

    res.status(500).json({ message: 'Error updating property', error: error.message });
  }
};

// @desc    Delete property
// @route   DELETE /api/admin/properties/:id
// @access  Private/Admin + VPN
export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const property = await Property.findByIdAndDelete(id);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    res.json({ message: 'Property deleted successfully' });
  } catch (error: any) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Error deleting property', error: error.message });
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
      vpnWhitelistCount: 5, // TODO: Get from actual whitelist
      features: {
        discountCodes: true,
        gamification: true,
        subscriptions: true,
        payments: true,
      },
    });
  } catch (error: any) {
    console.error('Get system config error:', error);
    res.status(500).json({ message: 'Error fetching system config', error: error.message });
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

    console.log(`🔧 Found ${propertiesWithMissingCoords.length} properties with missing coordinates`);

    const results = {
      total: propertiesWithMissingCoords.length,
      fixed: 0,
      failed: 0,
      details: [] as { id: string; title: string; status: string; lat?: number; lng?: number }[],
    };

    for (const property of propertiesWithMissingCoords) {
      try {
        console.log(`📍 Geocoding property: ${property.title || property.address} (${property.city}, ${property.country})`);

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
          console.log(`✅ Fixed: ${property.title || property.address} -> ${geocodeResult.lat}, ${geocodeResult.lng}`);
        } else {
          results.failed++;
          results.details.push({
            id: String(property._id),
            title: property.title || property.address,
            status: 'failed - no geocode result',
          });
          console.log(`❌ Failed to geocode: ${property.title || property.address}`);
        }
      } catch (error: any) {
        results.failed++;
        results.details.push({
          id: String(property._id),
          title: property.title || property.address,
          status: `failed - ${error.message}`,
        });
        console.error(`❌ Error fixing property ${property._id}:`, error.message);
      }
    }

    console.log(`🔧 Fix coordinates complete: ${results.fixed} fixed, ${results.failed} failed`);

    res.json({
      message: `Fixed ${results.fixed} of ${results.total} properties`,
      results,
    });
  } catch (error: any) {
    console.error('Fix coordinates error:', error);
    res.status(500).json({ message: 'Error fixing property coordinates', error: error.message });
  }
};

// @desc    Fix coordinates for a single property by ID
// @route   POST /api/admin/fix-coordinates/:propertyId
// @access  Private/Admin
export const fixSinglePropertyCoordinates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    console.log(`📍 Geocoding single property: ${property.title || property.address} (${property.city}, ${property.country})`);
    console.log(`   Current coordinates: lat=${property.lat}, lng=${property.lng}`);

    const geocodeResult = await geocodeAddressWithRateLimit(
      property.address,
      property.city,
      property.country
    );

    if (geocodeResult && geocodeResult.lat && geocodeResult.lng) {
      property.lat = geocodeResult.lat;
      property.lng = geocodeResult.lng;
      await property.save();

      console.log(`✅ Fixed: ${property.title || property.address} -> ${geocodeResult.lat}, ${geocodeResult.lng}`);

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
      console.log(`❌ Failed to geocode: ${property.title || property.address}`);
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
    console.error('Fix single property coordinates error:', error);
    res.status(500).json({ message: 'Error fixing property coordinates', error: error.message });
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
    console.error('Get properties missing coords error:', error);
    res.status(500).json({ message: 'Error fetching properties', error: error.message });
  }
};
