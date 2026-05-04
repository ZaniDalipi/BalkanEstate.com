import { Request, Response } from 'express';
import User from '../models/User';
import { generateSecureMeasurementId } from '../utils/secureRandom';
import { apiLogger } from '../utils/logger';
import { getParam } from '../utils/validateParams';

interface MeasurementPoint {
  lat: number;
  lng: number;
}

interface SavedMeasurement {
  id: string;
  name: string;
  points: MeasurementPoint[];
  type: 'distance' | 'area';
  distance?: number;
  area?: number;
  perimeter?: number;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Maximum measurements per user
const MAX_MEASUREMENTS_FREE = 5;
const MAX_MEASUREMENTS_PRO = 50;

/**
 * @desc    Get user's saved measurements
 * @route   GET /api/measurements
 * @access  Private
 */
export const getMeasurements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId).select('savedMeasurements proSubscription isSubscribed');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const measurements = user.savedMeasurements || [];
    const isPro = user.proSubscription?.isActive || user.isSubscribed;
    const maxAllowed = isPro ? MAX_MEASUREMENTS_PRO : MAX_MEASUREMENTS_FREE;

    res.status(200).json({
      success: true,
      measurements,
      count: measurements.length,
      maxAllowed,
      isPro,
    });
  } catch (error: any) {
    apiLogger.error('Error getting measurements:', error);
    res.status(500).json({ message: 'Error getting measurements' });
  }
};

/**
 * @desc    Save a new measurement
 * @route   POST /api/measurements
 * @access  Private
 */
export const saveMeasurement = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { name, points, type, distance, area, perimeter, address, notes } = req.body;

    // Validation
    if (!name || !points || !type) {
      res.status(400).json({ message: 'Name, points, and type are required' });
      return;
    }

    if (!Array.isArray(points) || points.length < 2) {
      res.status(400).json({ message: 'At least 2 points are required' });
      return;
    }

    if (type === 'area' && points.length < 3) {
      res.status(400).json({ message: 'At least 3 points are required for area measurement' });
      return;
    }

    // Validate points
    for (const point of points) {
      if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
        res.status(400).json({ message: 'Invalid point coordinates' });
        return;
      }
      if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
        res.status(400).json({ message: 'Coordinates out of valid range' });
        return;
      }
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check measurement limit
    const isPro = user.proSubscription?.isActive || user.isSubscribed;
    const maxAllowed = isPro ? MAX_MEASUREMENTS_PRO : MAX_MEASUREMENTS_FREE;
    const currentCount = user.savedMeasurements?.length || 0;

    if (currentCount >= maxAllowed) {
      res.status(403).json({
        message: `Maximum measurements limit reached (${maxAllowed}). ${!isPro ? 'Upgrade to Pro for more storage.' : ''}`,
        code: 'LIMIT_REACHED',
        limit: maxAllowed,
        isPro,
      });
      return;
    }

    // Create measurement with secure random ID
    const measurement: SavedMeasurement = {
      id: generateSecureMeasurementId(),
      name: name.trim().substring(0, 100), // Limit name length
      points,
      type,
      distance,
      area,
      perimeter,
      address: address?.trim().substring(0, 200),
      notes: notes?.trim().substring(0, 500),
      createdAt: new Date(),
    };

    // Initialize array if doesn't exist
    if (!user.savedMeasurements) {
      user.savedMeasurements = [];
    }

    user.savedMeasurements.push(measurement as any);
    await user.save();

    apiLogger.info(`📏 Measurement saved for user ${user._id}: ${measurement.name} (${measurement.type})`);

    res.status(201).json({
      success: true,
      message: 'Measurement saved successfully',
      measurement,
      count: user.savedMeasurements.length,
      maxAllowed,
    });
  } catch (error: any) {
    apiLogger.error('Error saving measurement:', error);
    res.status(500).json({ message: 'Error saving measurement' });
  }
};

/**
 * @desc    Update a measurement
 * @route   PUT /api/measurements/:id
 * @access  Private
 */
export const updateMeasurement = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    const id = getParam(req, 'id');

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { name, address, notes } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // DEBUG
    if (user.savedMeasurements && user.savedMeasurements.length > 0) {
      const first = user.savedMeasurements[0] as any;
      const firstObj = first.toObject?.() || first;
      apiLogger.info(`DEBUG update - incoming id: "${id}", toObject().id: "${firstObj.id}", .id: "${first.id}", ._id: "${first._id}"`);
    }

    const measurementIndex = user.savedMeasurements?.findIndex(
      m => {
        const mObj = (m as any).toObject?.() || m;
        return mObj.id === id;
      }
    );

    if (measurementIndex === undefined || measurementIndex === -1) {
      res.status(404).json({ message: 'Measurement not found' });
      return;
    }

    // Update allowed fields
    if (name) {
      user.savedMeasurements![measurementIndex].name = name.trim().substring(0, 100);
    }
    if (address !== undefined) {
      user.savedMeasurements![measurementIndex].address = address?.trim().substring(0, 200);
    }
    if (notes !== undefined) {
      user.savedMeasurements![measurementIndex].notes = notes?.trim().substring(0, 500);
    }
    user.savedMeasurements![measurementIndex].updatedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Measurement updated successfully',
      measurement: user.savedMeasurements![measurementIndex],
    });
  } catch (error: any) {
    apiLogger.error('Error updating measurement:', error);
    res.status(500).json({ message: 'Error updating measurement' });
  }
};

/**
 * @desc    Delete a measurement
 * @route   DELETE /api/measurements/:id
 * @access  Private
 */
export const deleteMeasurement = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    const id = getParam(req, 'id');

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const measurementIndex = user.savedMeasurements?.findIndex(
      m => {
        const mObj = (m as any).toObject?.() || m;
        return mObj.id === id;
      }
    );

    if (measurementIndex === undefined || measurementIndex === -1) {
      res.status(404).json({ message: 'Measurement not found' });
      return;
    }

    user.savedMeasurements!.splice(measurementIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Measurement deleted successfully',
      count: user.savedMeasurements?.length || 0,
    });
  } catch (error: any) {
    apiLogger.error('Error deleting measurement:', error);
    res.status(500).json({ message: 'Error deleting measurement' });
  }
};

/**
 * @desc    Get a single measurement by ID
 * @route   GET /api/measurements/:id
 * @access  Private
 */
export const getMeasurementById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    const id = getParam(req, 'id');

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const user = await User.findById(userId).select('savedMeasurements');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const measurement = user.savedMeasurements?.find(
      m => {
        const mObj = (m as any).toObject?.() || m;
        return mObj.id === id;
      }
    );

    if (!measurement) {
      res.status(404).json({ message: 'Measurement not found' });
      return;
    }

    res.status(200).json({
      success: true,
      measurement,
    });
  } catch (error: any) {
    apiLogger.error('Error getting measurement:', error);
    res.status(500).json({ message: 'Error getting measurement' });
  }
};
