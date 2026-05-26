import { Request, Response } from 'express';
import { getFeaturedCities, getCitiesByCountry, getCityMarketData } from '../services/cityMarketDataService';
import { triggerMarketDataUpdate } from '../jobs/updateCityMarketData';
import { refreshAllCityImages } from '../services/cityImageService';
import { fetchCityImages, getCityFallbackImageUrl } from '../services/wikiImageService';
import { apiLogger } from '../utils/logger';
import { getParam } from '../utils/validateParams';

/**
 * @desc    Get featured city recommendations
 * @route   GET /api/cities/featured
 * @access  Public
 */
export const getFeaturedCitiesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 12;
    const cities = await getFeaturedCities(limit);

    res.json({
      success: true,
      count: cities.length,
      cities,
    });
  } catch (error: any) {
    apiLogger.error('Error fetching featured cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured cities',
    });
  }
};

/**
 * @desc    Get cities by country
 * @route   GET /api/cities/country/:country
 * @access  Public
 */
export const getCitiesByCountryController = async (req: Request, res: Response): Promise<void> => {
  try {
    const country = getParam(req, 'country');
    const cities = await getCitiesByCountry(country);

    res.json({
      success: true,
      count: cities.length,
      cities,
    });
  } catch (error: any) {
    apiLogger.error('Error fetching cities by country:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities',
    });
  }
};

/**
 * @desc    Get market data for specific city
 * @route   GET /api/cities/market-data/:city/:country
 * @access  Public
 */
export const getCityMarketDataController = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = getParam(req, 'city');
    const country = getParam(req, 'country');
    const marketData = await getCityMarketData(city, country);

    if (!marketData) {
      res.status(404).json({
        success: false,
        message: `No market data found for ${city}, ${country}`,
      });
      return;
    }

    res.json({
      success: true,
      data: marketData,
    });
  } catch (error: any) {
    apiLogger.error('Error fetching city market data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching market data',
    });
  }
};

/**
 * @desc    Manually trigger market data update (admin only)
 * @route   POST /api/cities/update-market-data
 * @access  Private/Admin
 */
export const triggerMarketDataUpdateController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user is admin (you can add proper auth middleware)
    if (!req.user || (req.user as any).role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
      return;
    }

    // Trigger update in background
    triggerMarketDataUpdate().catch(error => {
      apiLogger.error('Background market data update failed:', error);
    });

    res.json({
      success: true,
      message: 'Market data update triggered successfully',
    });
  } catch (error: any) {
    apiLogger.error('Error triggering market data update:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering update',
    });
  }
};

/**
 * @desc    Refresh city images from Wikipedia → Cloudinary (admin only)
 * @route   POST /api/cities/refresh-images
 * @access  Private/Admin
 */
export const refreshCityImagesController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user as any).role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const force = req.query.force === 'true';

    // Run in background
    refreshAllCityImages(force).catch(error => {
      apiLogger.error('Background city image refresh failed:', error);
    });

    res.json({
      success: true,
      message: 'City image refresh triggered successfully',
    });
  } catch (error: any) {
    apiLogger.error('Error triggering city image refresh:', error);
    res.status(500).json({ success: false, message: 'Error triggering image refresh' });
  }
};

/**
 * @desc    Get city photos from Wikimedia Commons
 * @route   GET /api/cities/images/:city/:country
 * @access  Public
 */
export const getCityImagesController = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = getParam(req, 'city');
    const country = getParam(req, 'country');

    if (!city || !country) {
      res.status(400).json({ success: false, message: 'City and country are required' });
      return;
    }

    const images = await fetchCityImages(city, country, 5);
    const fallbackUrl = getCityFallbackImageUrl(city, country);

    res.json({ images, fallbackUrl });
  } catch (error: unknown) {
    apiLogger.error('Error fetching city images:', error);
    res.status(500).json({ success: false, message: 'Error fetching city images' });
  }
};
