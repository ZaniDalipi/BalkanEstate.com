import { Request, Response } from 'express';
import { getFeaturedCities, getCitiesByCountry, getCityMarketData } from '../services/cityMarketDataService';
import { triggerMarketDataUpdate } from '../jobs/updateCityMarketData';
import { refreshAllCityImages } from '../services/cityImageService';
import { fetchCityImages, getCityFallbackImageUrl } from '../services/wikiImageService';
import { getCityPriceHistory } from '../services/cityHistoryService';
import { getEconomicIndicators } from '../services/economicIndicatorsService';
import { getCityGeoData } from '../services/geoDataService';
import { seedCityImages } from '../scripts/seedCityImages';
import { triggerCityMarketDigest } from '../jobs/cityMarketDigestJob';
import { previewCityMarketDigest } from '../services/cityMarketDigestService';
import { apiLogger } from '../utils/logger';
import { getParam } from '../utils/validateParams';

/** Admin gate used by the write endpoints in this controller. */
const isAdmin = (req: Request): boolean =>
  Boolean(req.user) && (req.user as { role?: string }).role === 'admin';

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
 * @desc    Preview the city changes the next Explore-Cities digest would report
 * @route   GET /api/cities/market-digest/preview
 * @access  Private/Admin
 */
export const previewCityMarketDigestController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const preview = await previewCityMarketDigest();

    res.json({
      success: true,
      windowStart: preview.windowStart,
      windowEnd: preview.windowEnd,
      periodLabel: preview.periodLabel,
      count: preview.changes.length,
      changes: preview.changes,
    });
  } catch (error: unknown) {
    apiLogger.error('Error previewing city market digest:', error);
    res.status(500).json({ success: false, message: 'Error previewing city market digest' });
  }
};

/**
 * @desc    Run the Explore-Cities market digest now (admin only)
 * @route   POST /api/cities/market-digest/run
 * @access  Private/Admin
 *
 * Runs inline rather than fire-and-forget: an admin triggering a mass email
 * needs the outcome (how many cities, how many recipients) in the response,
 * and the digest's own guards mean an empty or too-soon run costs nothing.
 */
export const runCityMarketDigestController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }

    const body: Record<string, unknown> = (req.body && typeof req.body === 'object') ? req.body : {};

    for (const key of ['dryRun', 'force'] as const) {
      if (key in body && typeof body[key] !== 'boolean') {
        res.status(400).json({ success: false, message: `"${key}" must be a boolean` });
        return;
      }
    }

    const result = await triggerCityMarketDigest({
      dryRun: body.dryRun === true,
      // Cadence is skipped by default for a manual run, but an admin can ask to
      // respect it (force: false) to verify the schedule behaves as expected.
      force: body.force !== false,
    });

    res.json({ success: true, result });
  } catch (error: unknown) {
    apiLogger.error('Error running city market digest:', error);
    res.status(500).json({ success: false, message: 'Error running city market digest' });
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

/**
 * @desc    Get historical quarterly price data (8 years)
 * @route   GET /api/cities/history/:city/:country
 * @access  Public
 */
export const getCityHistoryController = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = getParam(req, 'city');
    const country = getParam(req, 'country');
    if (!city || !country) {
      res.status(400).json({ success: false, message: 'City and country are required' });
      return;
    }
    const history = await getCityPriceHistory(city, country);
    res.json(history);
  } catch (error: unknown) {
    apiLogger.error('Error fetching city price history:', error);
    res.status(500).json({ success: false, message: 'Error fetching price history' });
  }
};

/**
 * @desc    Get macroeconomic indicators (GDP, inflation, etc.) from World Bank
 * @route   GET /api/cities/economic/:country
 * @access  Public
 */
export const getEconomicIndicatorsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const country = getParam(req, 'country');
    if (!country) {
      res.status(400).json({ success: false, message: 'Country is required' });
      return;
    }
    const indicators = await getEconomicIndicators(country);
    res.json(indicators);
  } catch (error: unknown) {
    apiLogger.error('Error fetching economic indicators:', error);
    res.status(500).json({ success: false, message: 'Error fetching economic indicators' });
  }
};

/**
 * @desc    Get real GeoJSON municipality boundaries from OpenStreetMap
 * @route   GET /api/cities/geodata/:city/:country
 * @access  Public
 */
export const getCityGeoDataController = async (req: Request, res: Response): Promise<void> => {
  try {
    const city = getParam(req, 'city');
    const country = getParam(req, 'country');
    if (!city || !country) {
      res.status(400).json({ success: false, message: 'City and country are required' });
      return;
    }
    const forceRefresh = req.query.refresh === 'true';
    const geoData = await getCityGeoData(city, country, forceRefresh);
    const result = geoData ?? { type: 'FeatureCollection' as const, features: [] };
    res.json({ success: true, data: result, featureCount: result.features.length });
  } catch (error: unknown) {
    apiLogger.error('Error fetching city geo data:', error);
    res.status(500).json({ success: false, message: 'Error fetching boundary data' });
  }
};

/**
 * @desc    Seed missing city images to Cloudinary (admin only)
 * @route   POST /api/cities/seed-images
 * @access  Private/Admin
 */
export const seedCityImagesController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user as { role?: string }).role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }
    const force = req.query.force === 'true';
    const only = typeof req.query.only === 'string' ? req.query.only : undefined;

    // Run in background — don't block the response
    seedCityImages(force, only).then(({ ok, skipped, failed }) => {
      apiLogger.info(`City image seed complete: ${ok} uploaded, ${skipped} skipped, ${failed} failed`);
    }).catch(err => {
      apiLogger.error('City image seed failed:', err);
    });

    res.json({ success: true, message: 'City image seeding started in background' });
  } catch (error: unknown) {
    apiLogger.error('Error starting city image seed:', error);
    res.status(500).json({ success: false, message: 'Error starting image seed' });
  }
};
