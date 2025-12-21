import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Agency from '../models/Agency';
import User, { IUser } from '../models/User';
import Agent from '../models/Agent';
import Property from '../models/Property';
import { geocodeAgency } from '../services/geocodingService';
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';

// Helper function to generate unique Agent ID
function generateAgentId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AGT-${timestamp}-${randomStr}`;
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

    // Check if user has Enterprise subscription (skip in development mode)
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isDevelopment && user.subscriptionPlan !== 'enterprise') {
      res.status(403).json({
        message: 'Agency profiles are only available for Enterprise tier subscribers. Please upgrade your plan to create an agency.',
      });
      return;
    }

    if (isDevelopment && user.subscriptionPlan !== 'enterprise') {
      console.log('🔧 Development mode: Bypassing Enterprise subscription check for agency creation');
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

    const agencyData = {
      ...req.body,
      ownerId: user._id,
      agents: [user._id], // Add the owner as the first agent
      admins: [user._id], // Add the owner as admin
      isFeatured: req.body.isFeatured || false, // Can be set manually or defaults to false
      totalAgents: 1, // Initialize with 1 agent (the owner)
      // Add geocoded coordinates (will be undefined if geocoding failed)
      ...(coordinates.lat && coordinates.lng && {
        lat: coordinates.lat,
        lng: coordinates.lng,
      }),
    };

    console.log(`📍 Creating agency with coordinates:`, coordinates.lat ? `${coordinates.lat}, ${coordinates.lng}` : 'No coordinates');

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
    user.agencyName = agency.name;

    // If user is not already an agent, change their role to agent
    if (user.role !== 'agent') {
      user.role = 'agent';
    }

    await user.save();

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
      console.log(`✅ Updated existing agent profile for ${user.email}`);
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
      console.log(`✅ Created new agent profile for ${user.email} with ID: ${agentId}`);
    }

    // Update user with agent ID
    user.agentId = agentProfile.agentId;
    await user.save();

    console.log(`✅ Agency created successfully. User ${user.email} is now admin of agency ${agency.name}`);

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
        console.log(`🎁 Automatically started 7-day free featured trial for agency ${agency.name}`);
      } else {
        console.log(`⚠️ Could not start free trial: ${trialResult.error}`);
      }
    } catch (trialError) {
      console.error('Error starting auto free trial:', trialError);
      // Don't fail agency creation if trial fails
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
    });
  } catch (error: any) {
    console.error('Create agency error:', error);
    res.status(500).json({ message: 'Error creating agency', error: error.message });
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
    const { city, country, featured, page = 1, limit = 12, name } = req.query;

    const filter: any = {};

    if (city) {
      filter.city = new RegExp(city as string, 'i');
      console.log(`🔍 Filtering agencies by city: ${city}`);
    }

    if (country) {
      filter.country = new RegExp(country as string, 'i');
      console.log(`🔍 Filtering agencies by country: ${country}`);
    }

    if (name) {
      filter.name = new RegExp(name as string, 'i');
      console.log(`🔍 Filtering agencies by name: ${name}`);
    }

    if (featured === 'true') {
      filter.isFeatured = true;
      console.log(`⭐ Filtering for featured agencies only`);
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

    console.log(`📄 Fetching agencies: page ${pageNum}, limit ${limitNum}, skip ${skip}`);

    // Get agencies sorted by rotation order for featured ones
    const agencies = await Agency.find(filter)
      .populate('ownerId', 'name email phone avatarUrl')
      .populate('agents', 'name email phone avatarUrl role agencyName licenseNumber stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating')
      .populate('admins', 'name email phone avatarUrl')
      .sort({ isFeatured: -1, adRotationOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance when we don't need document methods

    // Import Property model at the top if not already imported
    const Property = (await import('../models/Property')).default;

    // Calculate totalProperties for each agency by counting properties from all agents
    const agenciesWithCounts = await Promise.all(
      agencies.map(async (agency: any) => {
        const agentIds = agency.agents?.map((agent: any) => agent._id) || [];

        // Count active properties for all agents in this agency
        const propertyCount = await Property.countDocuments({
          sellerId: { $in: agentIds },
          status: { $in: ['active', 'pending'] }
        });

        return {
          ...agency,
          totalProperties: propertyCount,
          totalAgents: agency.agents?.length || 0
        };
      })
    );

    const total = await Agency.countDocuments(filter);

    console.log(`✅ Found ${agencies.length} agencies out of ${total} total`);

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
    console.error('❌ Get agencies error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      message: 'Error fetching agencies',
      error: error.message,
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
    const { country, name, idOrSlug } = req.params;

    // Construct slug from country/name or use idOrSlug
    let identifier = idOrSlug;
    if (country && name) {
      identifier = `${country}/${name}`;
      console.log(`🔍 Looking up agency by country/name: ${identifier}`);
    } else if (idOrSlug) {
      console.log(`🔍 Looking up agency by idOrSlug: ${idOrSlug}`);
    }

    if (!identifier) {
      console.error('❌ getAgency: No identifier provided');
      res.status(400).json({ message: 'Agency ID or slug is required' });
      return;
    }

    // Try to find by ID first, then by slug
    let agency;
    let lookupMethod = '';

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      lookupMethod = 'ID';
      console.log(`🔑 Attempting lookup by ObjectId: ${identifier}`);
      agency = await Agency.findById(identifier)
        .populate('ownerId', 'name email phone avatarUrl')
        .populate('agents', 'name email phone avatarUrl role agencyName licenseNumber stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating')
        .populate('admins', 'name email phone avatarUrl');
    }

    if (!agency) {
      lookupMethod = 'slug';
      const slugLower = identifier.toLowerCase();
      console.log(`🏷️  Attempting lookup by slug: ${slugLower}`);
      agency = await Agency.findOne({ slug: slugLower })
        .populate('ownerId', 'name email phone avatarUrl')
        .populate('agents', 'name email phone avatarUrl role agencyName licenseNumber stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating')
        .populate('admins', 'name email phone avatarUrl');
    }

    // If not found and slug contains forward slash, try converting to comma format for backward compatibility
    if (!agency && identifier.includes('/')) {
      lookupMethod = 'slug (legacy format)';
      const legacySlug = identifier.toLowerCase().replace('/', ',');
      console.log(`🏷️  Attempting lookup by legacy slug format: ${legacySlug}`);
      agency = await Agency.findOne({ slug: legacySlug })
        .populate('ownerId', 'name email phone avatarUrl')
        .populate('agents', 'name email phone avatarUrl role agencyName licenseNumber stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating')
        .populate('admins', 'name email phone avatarUrl');
    }

    if (!agency) {
      console.error(`❌ Agency not found for identifier: ${identifier}`);
      res.status(404).json({
        message: 'Agency not found',
        searchedFor: identifier,
        attemptedMethods: ['ObjectId', 'slug', 'legacy slug format']
      });
      return;
    }

    console.log(`✅ Agency found via ${lookupMethod}: ${agency.name} (ID: ${agency._id})`);

    // Validate that populated fields were successful
    if (!agency.ownerId) {
      console.warn(`⚠️  Agency owner not found or failed to populate for agency: ${agency._id}`);
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
        console.log(`👤 Auto-adding owner/admin ${currentUser.email} to agency members`);

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
            console.log(`✅ Updated existing agent profile for ${user.email}`);
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
            console.log(`✅ Created new agent profile for ${user.email} with ID: ${agentId}`);
          }

          // Update user with agent ID
          user.agentId = agentProfile.agentId;
          await user.save();
          console.log(`✅ User ${currentUser.email} profile updated with agency info`);
        }

        // Re-populate agents to include the newly added admin
        await agency.populate('agents', 'name email phone avatarUrl role agencyName licenseNumber stats.activeListings stats.totalSalesValue stats.propertiesSold stats.rating');
      }
    }

    // Get agency's properties with error handling
    let properties: any[] = [];
    try {
      const sellerIds = [agency.ownerId, ...agency.agents].filter(Boolean);
      console.log(`🏠 Fetching properties for ${sellerIds.length} sellers (owner + ${agency.agents.length} agents)`);

      const rawProperties = await Property.find({
        sellerId: { $in: sellerIds },
        status: { $in: ['active', 'sold'] }, // Include both active and sold properties
      })
        .populate('sellerId', 'name email phone avatarUrl role agencyName')
        .sort({ createdAt: -1 })
        .lean();

      // Transform sellerId to seller for frontend compatibility
      properties = rawProperties.map((prop: any) => ({
        ...prop,
        id: prop._id.toString(),
        seller: prop.sellerId,
      }));

      console.log(`✅ Found ${properties.length} properties for agency`);
    } catch (propertyError: any) {
      console.error(`⚠️  Error fetching properties for agency ${agency._id}:`, propertyError.message);
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
    const agencyWithStats = {
      ...agency.toObject(),
      salesStats,
      totalProperties: activeProperties.length,
      totalAgents: agency.agents?.length || 0,
    };

    res.json({ agency: agencyWithStats, properties });
  } catch (error: any) {
    console.error('❌ Get agency error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      message: 'Error fetching agency',
      error: error.message,
      identifier: req.params.idOrSlug
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

    const agency = await Agency.findById(req.params.id);

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

    // Update agency
    Object.assign(agency, req.body);
    await agency.save();

    await agency.populate('ownerId', 'name email phone avatarUrl');
    await agency.populate('agents', 'name email phone avatarUrl role agencyName');

    res.json({ agency });
  } catch (error: any) {
    console.error('Update agency error:', error);
    res.status(500).json({ message: 'Error updating agency', error: error.message });
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

    const { agentUserId } = req.body;
    const agency = await Agency.findById(req.params.id);

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

    await agency.populate('agents', 'name email phone avatarUrl role agencyName');

    res.json({ agency });
  } catch (error: any) {
    console.error('Add agent error:', error);
    res.status(500).json({ message: 'Error adding agent to agency', error: error.message });
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

    const agency = await Agency.findById(req.params.id);

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
      id => id.toString() !== req.params.agentId
    );
    agency.totalAgents = agency.agents.length;
    await agency.save();

    // Clear agent's agency info in User model
    const agentUser = await User.findById(req.params.agentId);
    if (agentUser) {
      agentUser.agencyName = undefined;
      agentUser.agencyId = undefined;
      await agentUser.save();
    }

    // Clear agent's agency info in Agent model
    const agentRecord = await Agent.findOne({ userId: req.params.agentId });
    if (agentRecord) {
      agentRecord.agencyName = 'Independent Agent';
      agentRecord.agencyId = undefined;
      await agentRecord.save();
    }

    res.json({ message: 'Agent removed from agency successfully' });
  } catch (error: any) {
    console.error('Remove agent error:', error);
    res.status(500).json({ message: 'Error removing agent from agency', error: error.message });
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
      .populate('ownerId', 'name email phone avatarUrl')
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
    console.error('Get featured agencies error:', error);
    res.status(500).json({ message: 'Error fetching featured agencies', error: error.message });
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
      console.error('Cloudinary not configured');
      res.status(500).json({ message: 'Image upload service not configured' });
      return;
    }

    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check ownership
    if (agency.ownerId.toString() !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to update this agency' });
      return;
    }

    console.log('Uploading logo for agency:', agency._id);

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'balkan-estate/agencies/logos',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'center' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error uploading logo', error: error.message });
          }
          return;
        }

        if (result) {
          try {
            // Update agency with new logo URL
            agency.logo = result.secure_url;
            await agency.save();

            console.log('Logo uploaded successfully:', result.secure_url);

            if (!res.headersSent) {
              res.json({ logo: result.secure_url, agency });
            }
          } catch (saveError: any) {
            console.error('Error saving agency:', saveError);
            if (!res.headersSent) {
              res.status(500).json({ message: 'Error saving logo URL', error: saveError.message });
            }
          }
        }
      }
    );

    const bufferStream = Readable.from(req.file.buffer);
    bufferStream.pipe(uploadStream);
  } catch (error: any) {
    console.error('Upload agency logo error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error uploading logo', error: error.message });
    }
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
      console.error('Cloudinary not configured');
      res.status(500).json({ message: 'Image upload service not configured' });
      return;
    }

    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Check ownership
    if (agency.ownerId.toString() !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to update this agency' });
      return;
    }

    console.log('Uploading cover for agency:', agency._id);

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'balkan-estate/agencies/covers',
        transformation: [
          { width: 1200, height: 400, crop: 'fill', gravity: 'center' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error uploading cover image', error: error.message });
          }
          return;
        }

        if (result) {
          try {
            // Update agency with new cover URL
            agency.coverImage = result.secure_url;
            await agency.save();

            console.log('Cover uploaded successfully:', result.secure_url);

            if (!res.headersSent) {
              res.json({ coverImage: result.secure_url, agency });
            }
          } catch (saveError: any) {
            console.error('Error saving agency:', saveError);
            if (!res.headersSent) {
              res.status(500).json({ message: 'Error saving cover URL', error: saveError.message });
            }
          }
        }
      }
    );

    const bufferStream = Readable.from(req.file.buffer);
    bufferStream.pipe(uploadStream);
  } catch (error: any) {
    console.error('Upload agency cover error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error uploading cover image', error: error.message });
    }
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
          console.log(`✅ Removed agent from old agency: ${oldAgency.name}`);
        }
      } catch (error) {
        console.error('Error removing agent from old agency:', error);
        // Continue anyway - we still want to add them to the new agency
      }
    }

    // Add agent to new agency
    const userObjectId = user._id as unknown as mongoose.Types.ObjectId;
    agency.agents.push(userObjectId);
    agency.totalAgents = agency.agents.length;
    await agency.save();

    // Update agent's agency info
    user.agencyName = agency.name;
    user.agencyId = agency._id as mongoose.Types.ObjectId;
    await user.save();

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
      agent: updatedAgent,
    });
  } catch (error: any) {
    console.error('Join agency by invitation code error:', error);
    res.status(500).json({ message: 'Error joining agency', error: error.message });
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
    const { id } = req.params;
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
      console.log(`✅ Valid invitation code for agency: ${agency.name}`);
      res.json({ valid: true, message: 'Invitation code is valid' });
    } else {
      console.log(`❌ Invalid invitation code for agency: ${agency.name}`);
      res.json({ valid: false, message: 'Invalid invitation code' });
    }
  } catch (error: any) {
    console.error('Verify invitation code error:', error);
    res.status(500).json({ valid: false, message: 'Error verifying invitation code', error: error.message });
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

    console.log(`🔍 Looking up agency with invitation code: ${code.toUpperCase()}`);

    // Find agency by invitation code
    const agency = await Agency.findOne({ invitationCode: code.toUpperCase() })
      .populate('ownerId', 'name email');

    if (!agency) {
      console.log(`❌ No agency found with invitation code: ${code.toUpperCase()}`);
      res.status(404).json({ message: 'Invalid invitation code. Please check and try again.' });
      return;
    }

    console.log(`✅ Found agency: ${agency.name} (${agency._id})`);

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
    console.error('Find agency by invitation code error:', error);
    res.status(500).json({ message: 'Error looking up agency', error: error.message });
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

    const { id } = req.params;
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

    console.log(`✅ Added admin to agency: ${agency.name}`);
    res.json({ message: 'Admin added successfully', agency });
  } catch (error: any) {
    console.error('Add agency admin error:', error);
    res.status(500).json({ message: 'Error adding admin', error: error.message });
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

    const { id, userId } = req.params;
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

    console.log(`✅ Removed admin from agency: ${agency.name}`);
    res.json({ message: 'Admin removed successfully', agency });
  } catch (error: any) {
    console.error('Remove agency admin error:', error);
    res.status(500).json({ message: 'Error removing admin', error: error.message });
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
      console.log(`✅ Removed user from admins of agency: ${agencyName}`);
    }

    await agency.save();

    // Clear agent's agency info in User model
    user.agencyName = undefined;
    user.agencyId = undefined;
    await user.save();

    // Clear agent's agency info in Agent model
    const agentRecord = await Agent.findOne({ userId: user._id });
    if (agentRecord) {
      agentRecord.agencyName = 'Independent Agent';
      agentRecord.agencyId = undefined;
      await agentRecord.save();
      console.log(`✅ Updated agent profile to Independent Agent`);
    }

    console.log(`✅ User ${user.email} left agency: ${agencyName}`);

    res.json({
      message: `Successfully left ${agencyName}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
        agencyName: user.agencyName,
      }
    });
  } catch (error: any) {
    console.error('Leave agency error:', error);
    res.status(500).json({ message: 'Error leaving agency', error: error.message });
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
    const { id } = req.params;

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

    // Check if agency can generate more coupons
    if (!agency.canGenerateMoreCoupons()) {
      res.status(400).json({
        message: 'Maximum of 5 agent coupons can be active at once. Revoke or wait for coupons to be used.',
        code: 'MAX_COUPONS_REACHED',
        currentCoupons: agency.agentCoupons.filter(c => c.status === 'available').length,
      });
      return;
    }

    // Generate coupon codes (up to 5 total)
    const availableCoupons = agency.agentCoupons.filter(c => c.status === 'available').length;
    const couponsToGenerate = 5 - availableCoupons;

    const newCoupons = [];
    for (let i = 0; i < couponsToGenerate; i++) {
      const code = agency.generateCouponCode();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

      agency.agentCoupons.push({
        code,
        generatedAt: new Date(),
        expiresAt,
        status: 'available',
      } as any);

      newCoupons.push({ code, expiresAt });
    }

    await agency.save();

    console.log(`✅ Generated ${couponsToGenerate} agent coupons for agency ${agency.name}`);

    res.status(200).json({
      message: `Successfully generated ${couponsToGenerate} agent coupon codes`,
      coupons: newCoupons,
      totalAvailable: agency.agentCoupons.filter(c => c.status === 'available').length,
    });
  } catch (error: any) {
    console.error('Generate agent coupons error:', error);
    res.status(500).json({
      message: 'Error generating coupons',
      error: error.message
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
    const { couponCode } = req.body;

    if (!couponCode) {
      res.status(400).json({
        message: 'Coupon code is required',
        code: 'MISSING_COUPON_CODE'
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
        code: 'INVALID_COUPON'
      });
      return;
    }

    // Find the specific coupon
    const coupon = agency.agentCoupons.find(c => c.code === couponCode);
    if (!coupon) {
      res.status(404).json({
        message: 'Coupon not found',
        code: 'COUPON_NOT_FOUND'
      });
      return;
    }

    // Check coupon status
    if (coupon.status === 'used') {
      res.status(400).json({
        message: 'This coupon has already been used',
        code: 'COUPON_ALREADY_USED',
        usedBy: coupon.usedBy,
        usedAt: coupon.usedAt,
      });
      return;
    }

    if (coupon.status === 'expired' || new Date(coupon.expiresAt) < new Date()) {
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

    const user = await User.findById(currentUser._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Initialize subscription if doesn't exist
    if (!user.subscription) {
      user.subscription = {
        tier: 'free',
        status: 'active',
        listingsLimit: 3,
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

    // Upgrade user to agency_agent tier with Pro benefits
    user.subscription.tier = 'agency_agent';
    user.subscription.status = 'active';
    user.subscription.listingsLimit = 25;
    if (user.subscription.promotionCoupons) {
      user.subscription.promotionCoupons.monthly = 0; // Agency agents share agency pool
    }
    user.subscription.expiresAt = new Date(coupon.expiresAt); // 1 year from coupon generation

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

    console.log(`✅ User ${user.email} redeemed agent coupon for agency ${agency.name}`);

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
    console.error('Redeem agent coupon error:', error);
    res.status(500).json({
      message: 'Error redeeming coupon',
      error: error.message
    });
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
    const { id } = req.params;

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

    // Get agent coupons (only show to owner)
    const agentCoupons = isOwner ? agency.agentCoupons.map(c => ({
      code: c.code,
      status: c.status,
      generatedAt: c.generatedAt,
      expiresAt: c.expiresAt,
      usedBy: c.usedBy,
      usedAt: c.usedAt,
    })) : null;

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
      },
    });
  } catch (error: any) {
    console.error('Get agency coupons error:', error);
    res.status(500).json({
      message: 'Error fetching coupons',
      error: error.message
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
    const { id } = req.params;
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

    console.log(`✅ Agency ${agency.name} used promotion coupon for property ${propertyId} (${agency.promotionCoupons.available}/${agency.promotionCoupons.monthly} remaining)`);

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
    console.error('Use promotion coupon error:', error);
    res.status(500).json({
      message: 'Error using promotion coupon',
      error: error.message
    });
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
    const { id } = req.params;

    const agency = await Agency.findById(id).populate('agents', 'name email phone avatarUrl subscription agency agentLicense');
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
    console.error('Get agency agents error:', error);
    res.status(500).json({
      message: 'Error fetching agents',
      error: error.message
    });
  }
};
