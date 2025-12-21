import { Request, Response } from 'express';
import { getFeaturedCities, getCitiesByCountry, getCityMarketData } from '../services/cityMarketDataService';
import { triggerMarketDataUpdate } from '../jobs/updateCityMarketData';

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
    console.error('Error fetching featured cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured cities',
      error: error.message,
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
    const { country } = req.params;
    const cities = await getCitiesByCountry(country);

    res.json({
      success: true,
      count: cities.length,
      cities,
    });
  } catch (error: any) {
    console.error('Error fetching cities by country:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cities',
      error: error.message,
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
    const { city, country } = req.params;
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
    console.error('Error fetching city market data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching market data',
      error: error.message,
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
      console.error('Background market data update failed:', error);
    });

    res.json({
      success: true,
      message: 'Market data update triggered successfully',
    });
  } catch (error: any) {
    console.error('Error triggering market data update:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering update',
      error: error.message,
    });
  }
};
