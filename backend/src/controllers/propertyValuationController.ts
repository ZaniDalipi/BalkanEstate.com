import { Request, Response } from 'express';
import {
  createPropertyValuation,
  getUserValuations,
  getValuationById,
  getCityValuationStats,
} from '../services/propertyValuationService';
import { apiLogger } from '../utils/logger';

/**
 * @desc    Create a new property valuation
 * @route   POST /api/valuations
 * @access  Public
 */
export const createValuationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      address,
      city,
      country,
      lat,
      lng,
      propertyType,
      sqft,
      beds,
      baths,
      yearBuilt,
      condition,
      hasBalcony,
      hasGarden,
      hasElevator,
      hasParking,
      hasPool,
      floorNumber,
      totalFloors,
      viewType,
      energyRating,
      furnishing,
      language,
    } = req.body;

    // Validate required fields
    if (!address || !city || !country || !propertyType || !sqft || beds === undefined || baths === undefined) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: address, city, country, propertyType, sqft, beds, baths',
      });
      return;
    }

    // Validate property type
    const validPropertyTypes = ['house', 'apartment', 'villa', 'land', 'other'];
    if (!validPropertyTypes.includes(propertyType)) {
      res.status(400).json({
        success: false,
        message: `Invalid property type. Must be one of: ${validPropertyTypes.join(', ')}`,
      });
      return;
    }

    // Validate numeric fields
    if (sqft <= 0 || beds < 0 || baths < 0) {
      res.status(400).json({
        success: false,
        message: 'sqft must be positive, beds and baths must be non-negative',
      });
      return;
    }

    // Get user ID if authenticated
    const userId = req.user ? (req.user as any)._id?.toString() : undefined;

    const valuation = await createPropertyValuation({
      address,
      city,
      country,
      lat,
      lng,
      propertyType,
      sqft,
      beds,
      baths,
      yearBuilt,
      condition,
      hasBalcony,
      hasGarden,
      hasElevator,
      hasParking,
      hasPool,
      floorNumber,
      totalFloors,
      viewType,
      energyRating,
      furnishing,
      userId,
      language,
    });

    res.status(201).json({
      success: true,
      data: valuation,
    });
  } catch (error: any) {
    apiLogger.error('Error creating property valuation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating property valuation',
    });
  }
};

/**
 * @desc    Get valuation by ID
 * @route   GET /api/valuations/:id
 * @access  Public
 */
export const getValuationController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const valuation = await getValuationById(id);

    if (!valuation) {
      res.status(404).json({
        success: false,
        message: 'Valuation not found',
      });
      return;
    }

    res.json({
      success: true,
      data: valuation,
    });
  } catch (error: any) {
    apiLogger.error('Error fetching valuation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching valuation',
    });
  }
};

/**
 * @desc    Get user's valuation history
 * @route   GET /api/valuations/history
 * @access  Private
 */
export const getValuationHistoryController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const userId = (req.user as any)._id.toString();
    const limit = parseInt(req.query.limit as string) || 10;

    const valuations = await getUserValuations(userId, limit);

    res.json({
      success: true,
      count: valuations.length,
      data: valuations,
    });
  } catch (error: any) {
    apiLogger.error('Error fetching valuation history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching valuation history',
    });
  }
};

/**
 * @desc    Get valuation statistics for a city
 * @route   GET /api/valuations/stats/:city/:country
 * @access  Public
 */
export const getCityStatsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, country } = req.params;

    if (!city || !country) {
      res.status(400).json({
        success: false,
        message: 'City and country are required',
      });
      return;
    }

    const stats = await getCityValuationStats(city, country);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    apiLogger.error('Error fetching city valuation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching city statistics',
    });
  }
};
