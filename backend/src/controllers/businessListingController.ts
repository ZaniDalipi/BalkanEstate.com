import { Request, Response } from 'express';
import { escapeRegex } from '../utils/escapeRegex';
import BusinessListing, { BUSINESS_CATEGORIES, LISTING_TYPES } from '../models/BusinessListing';
import { IUser } from '../models/User';
import { uploadImage, deleteImage } from '../services/cloudinaryService';
import { getParam, getObjectIdParam } from '../utils/validateParams';
import { encodeId, resolveId } from '../utils/idObfuscation';

/** Transform lean document: map _id → obfuscated id, strip internals */
const transformLean = (doc: any) => {
  if (!doc) return doc;
  const { _id, __v, logoPublicId, ...rest } = doc;
  const hex = _id?.toString();
  return { id: hex ? encodeId(hex) : hex, ...rest };
};

// @desc    Get all business listings (public, with filtering & pagination)
// @route   GET /api/business-listings
// @access  Public
export const getBusinessListings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, any> = { isActive: true };

    // Category filter
    const category = req.query.category as string;
    if (category && BUSINESS_CATEGORIES.includes(category as any)) {
      filter.category = category;
    }

    // City filter
    const city = req.query.city as string;
    if (city) {
      filter.city = { $regex: new RegExp(`^${escapeRegex(city)}$`, 'i') };
    }

    // Country filter
    const country = req.query.country as string;
    if (country) {
      filter.country = { $regex: new RegExp(`^${escapeRegex(country)}$`, 'i') };
    }

    // Listing type filter
    const listingType = req.query.listingType as string;
    if (listingType && LISTING_TYPES.includes(listingType as any)) {
      filter.listingType = listingType;
    }

    // Text search
    const search = req.query.search as string;
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { services: searchRegex },
      ];
    }

    const [listings, total] = await Promise.all([
      BusinessListing.find(filter)
        .sort({ isVerified: -1, views: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name avatarUrl')
        .lean(),
      BusinessListing.countDocuments(filter),
    ]);

    res.status(200).json({
      listings: listings.map(transformLean),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch business listings', error: error.message });
  }
};

// @desc    Get single business listing (public)
// @route   GET /api/business-listings/:id
// @access  Public
export const getBusinessListing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const idOrSlug = getParam(req, 'id');
    if (!idOrSlug) {
      res.status(400).json({ message: 'Invalid ID or slug' });
      return;
    }

    let listing;

    // 1. Try resolving as encoded/obfuscated ID (supports raw hex, base64url, and slug_EncodedId)
    const resolvedId = resolveId(idOrSlug);
    if (resolvedId) {
      listing = await BusinessListing.findById(resolvedId)
        .populate('owner', 'name avatarUrl email')
        .lean();
    }

    // 2. Fallback: try finding by slug field directly
    if (!listing) {
      listing = await BusinessListing.findOne({ slug: idOrSlug.toLowerCase() })
        .populate('owner', 'name avatarUrl email')
        .lean();
    }

    if (!listing) {
      res.status(404).json({ message: 'Business listing not found' });
      return;
    }

    // Increment view count (fire-and-forget)
    BusinessListing.updateOne({ _id: listing._id }, { $inc: { views: 1 } }).catch(() => {});

    res.status(200).json({ listing: transformLean(listing) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch business listing', error: error.message });
  }
};

// @desc    Create a business listing
// @route   POST /api/business-listings
// @access  Private
export const createBusinessListing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // Limit: max 3 business listings per user
    const existingCount = await BusinessListing.countDocuments({ owner: currentUser._id });
    if (existingCount >= 3) {
      res.status(400).json({ message: 'Maximum of 3 business listings allowed per user' });
      return;
    }

    // Validate required fields
    const { name, category, contactPhone, city, country } = req.body;
    if (!name || !category || !contactPhone || !city || !country) {
      res.status(400).json({ message: 'Name, category, contact phone, city, and country are required' });
      return;
    }

    if (!BUSINESS_CATEGORIES.includes(category)) {
      res.status(400).json({ message: `Invalid category. Must be one of: ${BUSINESS_CATEGORIES.join(', ')}` });
      return;
    }

    // Whitelist allowed fields to prevent mass assignment
    const listingData = {
      owner: currentUser._id,
      listingType: LISTING_TYPES.includes(req.body.listingType) ? req.body.listingType : 'business',
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      services: Array.isArray(req.body.services) ? req.body.services.slice(0, 20) : [],
      contactPhone: req.body.contactPhone,
      contactEmail: req.body.contactEmail,
      website: req.body.website,
      address: req.body.address,
      city: req.body.city,
      country: req.body.country,
      socialMedia: {
        facebook: req.body.socialMedia?.facebook,
        instagram: req.body.socialMedia?.instagram,
        linkedin: req.body.socialMedia?.linkedin,
      },
      businessHours: req.body.businessHours,
    };

    const listing = await BusinessListing.create(listingData);
    const leanListing = listing.toObject();

    res.status(201).json({ listing: transformLean(leanListing), message: 'Business listing created successfully' });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join('. ') });
      return;
    }
    res.status(500).json({ message: 'Failed to create business listing', error: error.message });
  }
};

// @desc    Update a business listing
// @route   PUT /api/business-listings/:id
// @access  Private (owner only)
export const updateBusinessListing = async (
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

    const currentUser = req.user as IUser;
    const listing = await BusinessListing.findById(id);

    if (!listing) {
      res.status(404).json({ message: 'Business listing not found' });
      return;
    }

    if (String(listing.owner) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to update this listing' });
      return;
    }

    // Whitelist updateable fields
    const allowedFields = [
      'name', 'description', 'category', 'listingType', 'services', 'contactPhone',
      'contactEmail', 'website', 'address', 'city', 'country',
      'socialMedia', 'businessHours', 'isActive',
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Validate category if provided
    if (updates.category && !BUSINESS_CATEGORIES.includes(updates.category)) {
      res.status(400).json({ message: `Invalid category. Must be one of: ${BUSINESS_CATEGORIES.join(', ')}` });
      return;
    }

    // Limit services array length
    if (updates.services && Array.isArray(updates.services)) {
      updates.services = updates.services.slice(0, 20);
    }

    Object.assign(listing, updates);
    await listing.save();
    const updatedLean = listing.toObject();

    res.status(200).json({ listing: transformLean(updatedLean), message: 'Business listing updated successfully' });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join('. ') });
      return;
    }
    res.status(500).json({ message: 'Failed to update business listing', error: error.message });
  }
};

// @desc    Delete a business listing
// @route   DELETE /api/business-listings/:id
// @access  Private (owner only)
export const deleteBusinessListing = async (
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

    const currentUser = req.user as IUser;
    const listing = await BusinessListing.findById(id);

    if (!listing) {
      res.status(404).json({ message: 'Business listing not found' });
      return;
    }

    if (String(listing.owner) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to delete this listing' });
      return;
    }

    // Clean up logo from Cloudinary
    if (listing.logoPublicId) {
      await deleteImage(listing.logoPublicId).catch(() => {});
    }

    await BusinessListing.deleteOne({ _id: listing._id });

    res.status(200).json({ message: 'Business listing deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete business listing', error: error.message });
  }
};

// @desc    Upload business logo
// @route   POST /api/business-listings/:id/upload-logo
// @access  Private (owner only)
export const uploadBusinessLogo = async (
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

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const currentUser = req.user as IUser;
    const listing = await BusinessListing.findById(id);

    if (!listing) {
      res.status(404).json({ message: 'Business listing not found' });
      return;
    }

    if (String(listing.owner) !== String(currentUser._id)) {
      res.status(403).json({ message: 'Not authorized to update this listing' });
      return;
    }

    // Delete old logo if exists
    if (listing.logoPublicId) {
      await deleteImage(listing.logoPublicId).catch(() => {});
    }

    const userId = String(currentUser._id);

    // Upload new logo using centralized cloudinaryService
    // Reuses 'agency-logo' type for similar folder structure
    const result = await uploadImage(req.file.buffer, {
      userId,
      agencyId: id, // Reuse agencyId param for folder organization
      type: 'agency-logo',
      maxWidth: 400,
      maxHeight: 400,
    });

    listing.logoUrl = result.url;
    listing.logoPublicId = result.publicId;
    await listing.save();

    res.status(200).json({
      logoUrl: result.url,
      message: 'Logo uploaded successfully',
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to upload logo', error: error.message });
  }
};

// @desc    Get business listings owned by current user
// @route   GET /api/business-listings/my-listings
// @access  Private
export const getMyBusinessListings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;
    const listings = await BusinessListing.find({ owner: currentUser._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ listings: listings.map(transformLean) });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch your business listings', error: error.message });
  }
};

// @desc    Get all business listings (admin, with owner info)
// @route   GET /api/admin/business-listings
// @access  Admin
export const getAllBusinessListingsAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.listingType) filter.listingType = req.query.listingType;
    if (req.query.search) {
      const escaped = escapeRegex(req.query.search as string);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { city: { $regex: escaped, $options: 'i' } },
        { country: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [listings, total] = await Promise.all([
      BusinessListing.find(filter)
        .populate('owner', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BusinessListing.countDocuments(filter),
    ]);

    res.status(200).json({
      listings: listings.map(transformLean),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch business listings', error: error.message });
  }
};

// @desc    Admin delete any business listing
// @route   DELETE /api/admin/business-listings/:id
// @access  Admin
export const adminDeleteBusinessListing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const listing = await BusinessListing.findById(id);
    if (!listing) {
      res.status(404).json({ message: 'Business listing not found' });
      return;
    }

    // Clean up logo from Cloudinary
    if (listing.logoPublicId) {
      await deleteImage(listing.logoPublicId).catch(() => {});
    }

    await BusinessListing.deleteOne({ _id: listing._id });

    res.status(200).json({ message: 'Business listing deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete business listing', error: error.message });
  }
};
