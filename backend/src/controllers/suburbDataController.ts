import { Request, Response } from 'express';
import { getSuburbData, refreshSuburbData } from '../services/suburbDataService';
import { apiLogger } from '../utils/logger';
import { getParam } from '../utils/validateParams';

/**
 * @desc    Get suburb data for a city (cached, auto-refresh if stale)
 * @route   GET /api/cities/suburbs/:city/:country
 * @access  Public
 */
export const getSuburbDataController = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = decodeURIComponent(getParam(req, 'city'));
    const country = decodeURIComponent(getParam(req, 'country'));

    const data = await getSuburbData(city, country);

    res.json({
      success: true,
      suburbs: data,
      source: data.dataSource,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching suburb data';
    apiLogger.error('Error fetching suburb data:', error);

    if (message.includes('City not found')) {
      res.status(404).json({ success: false, message });
      return;
    }

    res.status(500).json({ success: false, message });
  }
};

/**
 * @desc    Force-refresh suburb data for a city from Gemini
 * @route   POST /api/cities/suburbs/:city/:country/refresh
 * @access  Private/Admin
 */
export const refreshSuburbDataController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user as { role?: string }).role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const city = decodeURIComponent(getParam(req, 'city'));
    const country = decodeURIComponent(getParam(req, 'country'));

    const data = await refreshSuburbData(city, country);

    res.json({
      success: true,
      suburbs: data,
      source: data.dataSource,
      message: `Suburb data refreshed for ${city}, ${country}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error refreshing suburb data';
    apiLogger.error('Error refreshing suburb data:', error);

    if (message.includes('City not found')) {
      res.status(404).json({ success: false, message });
      return;
    }

    res.status(500).json({ success: false, message });
  }
};
