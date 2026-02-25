import { Request, Response } from 'express';
import PropertyRequest from '../models/PropertyRequest';
import { apiLogger } from '../utils/logger';
import { notifyGroupAboutRequest } from '../services/telegramBotService';

/**
 * Get all active property requests (public, for agents/sellers)
 */
export const getPropertyRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = { status: 'active' };

    if (req.query.listingType && req.query.listingType !== 'any') {
      filter.listingType = req.query.listingType;
    }
    if (req.query.propertyType && req.query.propertyType !== 'any') {
      filter.propertyType = req.query.propertyType;
    }
    if (req.query.country) {
      filter.country = { $regex: req.query.country, $options: 'i' };
    }
    if (req.query.city) {
      filter.city = { $regex: req.query.city, $options: 'i' };
    }

    const [requests, total] = await Promise.all([
      PropertyRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PropertyRequest.countDocuments(filter),
    ]);

    res.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    apiLogger.error('[propertyRequestController] Get requests error:', error);
    res.status(500).json({ message: 'Error fetching property requests' });
  }
};

/**
 * Create a new property request (from website)
 */
export const createPropertyRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      telegramUsername,
      listingType,
      propertyType,
      country,
      city,
      location,
      minPrice,
      maxPrice,
      minBeds,
      minBaths,
      minSqft,
      maxSqft,
      amenities,
      additionalNotes,
    } = req.body;

    if (!name || !listingType) {
      res.status(400).json({ message: 'Name and listing type are required' });
      return;
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ message: 'Invalid email format' });
        return;
      }
    }

    const requestData: any = {
      name: name.trim(),
      email: email?.trim().toLowerCase(),
      phone: phone?.trim(),
      telegramUsername: telegramUsername?.trim(),
      listingType,
      propertyType: propertyType || 'any',
      country: country?.trim(),
      city: city?.trim(),
      location: location?.trim(),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minBeds: minBeds ? Number(minBeds) : undefined,
      minBaths: minBaths ? Number(minBaths) : undefined,
      minSqft: minSqft ? Number(minSqft) : undefined,
      maxSqft: maxSqft ? Number(maxSqft) : undefined,
      amenities: amenities || [],
      additionalNotes: additionalNotes?.trim(),
      source: 'website',
    };

    // If authenticated, attach userId
    if ((req as any).user?._id) {
      requestData.userId = (req as any).user._id;
    }

    const propertyRequest = await PropertyRequest.create(requestData);

    apiLogger.info(`[propertyRequestController] New property request created: ${propertyRequest._id}`);

    // Notify Telegram group about the new request (non-blocking)
    notifyGroupAboutRequest(propertyRequest).catch((err) => {
      apiLogger.error('[propertyRequestController] Failed to notify Telegram group:', err);
    });

    res.status(201).json({
      message: 'Property request submitted successfully',
      request: propertyRequest,
    });
  } catch (error: any) {
    apiLogger.error('[propertyRequestController] Create request error:', error);
    res.status(500).json({ message: 'Error creating property request' });
  }
};

/**
 * Get user's own property requests
 */
export const getMyPropertyRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const requests = await PropertyRequest.find({ userId })
      .sort({ createdAt: -1 })
      .populate('matchedProperties', 'title price city imageUrl listingType propertyType')
      .lean();

    res.json({ requests });
  } catch (error: any) {
    apiLogger.error('[propertyRequestController] Get my requests error:', error);
    res.status(500).json({ message: 'Error fetching your property requests' });
  }
};

/**
 * Close/cancel a property request
 */
export const closePropertyRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const request = await PropertyRequest.findById(id);
    if (!request) {
      res.status(404).json({ message: 'Property request not found' });
      return;
    }

    // Only the owner can close their request
    if (request.userId && request.userId.toString() !== userId.toString()) {
      res.status(403).json({ message: 'Not authorized to close this request' });
      return;
    }

    request.status = 'closed';
    await request.save();

    apiLogger.info(`[propertyRequestController] Request ${id} closed by user ${userId}`);

    res.json({ message: 'Property request closed', request });
  } catch (error: any) {
    apiLogger.error('[propertyRequestController] Close request error:', error);
    res.status(500).json({ message: 'Error closing property request' });
  }
};

/**
 * Get statistics about property requests (for community page)
 */
export const getPropertyRequestStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const [totalActive, byType, byCountry, recentCount] = await Promise.all([
      PropertyRequest.countDocuments({ status: 'active' }),
      PropertyRequest.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$propertyType', count: { $sum: 1 } } },
      ]),
      PropertyRequest.aggregate([
        { $match: { status: 'active', country: { $exists: true, $ne: '' } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      PropertyRequest.countDocuments({
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      totalActive,
      recentCount,
      byType: byType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topCountries: byCountry.map((item: any) => ({
        country: item._id,
        count: item.count,
      })),
    });
  } catch (error: any) {
    apiLogger.error('[propertyRequestController] Get stats error:', error);
    res.status(500).json({ message: 'Error fetching request statistics' });
  }
};
