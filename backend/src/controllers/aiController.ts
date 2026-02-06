import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import * as geminiService from '../services/geminiService';

/**
 * Check if the GOOGLE_AI_API_KEY is configured
 */
const isApiKeyConfigured = (): boolean => {
  return !!process.env.GOOGLE_AI_API_KEY;
};

/**
 * POST /api/ai/generate-description
 * Generate property description and analysis from uploaded images
 * Expects multipart form data with images and JSON body fields
 */
export const generateDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ message: 'At least one image is required.' });
      return;
    }

    const { language, propertyType } = req.body;

    if (!language || !propertyType) {
      res.status(400).json({ message: 'language and propertyType are required fields.' });
      return;
    }

    const validPropertyTypes = ['house', 'apartment', 'villa', 'land', 'other'];
    if (!validPropertyTypes.includes(propertyType)) {
      res.status(400).json({ message: `propertyType must be one of: ${validPropertyTypes.join(', ')}` });
      return;
    }

    // Parse location if provided (sent as JSON string in form data)
    let location: geminiService.LocationContext | undefined;
    if (req.body.location) {
      try {
        location = typeof req.body.location === 'string'
          ? JSON.parse(req.body.location)
          : req.body.location;
      } catch (_e) {
        res.status(400).json({ message: 'Invalid location JSON format.' });
        return;
      }
    }

    const images = files.map(f => f.buffer);
    const mimeTypes = files.map(f => f.mimetype);

    apiLogger.info(`Generating description from ${images.length} images for ${propertyType} in ${language}`);

    const result = await geminiService.generateDescriptionFromImages(
      images,
      mimeTypes,
      language,
      propertyType,
      location
    );

    res.json(result);
  } catch (error) {
    apiLogger.error('Error in generateDescription:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to generate property description. Please try again later.' });
  }
};

/**
 * POST /api/ai/calculate-distances
 * Calculate estimated distances from a property to key amenities
 */
export const calculateDistances = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const { address, city, country, lat, lng } = req.body;

    if (!address || !city || !country || lat === undefined || lng === undefined) {
      res.status(400).json({ message: 'address, city, country, lat, and lng are all required fields.' });
      return;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      res.status(400).json({ message: 'lat and lng must be numbers.' });
      return;
    }

    apiLogger.info(`Calculating distances for ${address}, ${city}, ${country}`);

    const result = await geminiService.calculatePropertyDistances(address, city, country, lat, lng);

    res.json(result);
  } catch (error) {
    apiLogger.error('Error in calculateDistances:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to calculate distances. Please try again later.' });
  }
};

/**
 * POST /api/ai/chat
 * Get AI chat response for the real estate assistant
 */
export const aiChat = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const { history, properties } = req.body;

    if (!history || !Array.isArray(history)) {
      res.status(400).json({ message: 'history is required and must be an array.' });
      return;
    }

    // Validate history entries have sender and text
    for (const msg of history) {
      if (!msg.sender || !msg.text) {
        res.status(400).json({ message: 'Each history entry must have sender and text fields.' });
        return;
      }
    }

    if (!properties || !Array.isArray(properties)) {
      res.status(400).json({ message: 'properties is required and must be an array.' });
      return;
    }

    apiLogger.info(`Processing AI chat with ${history.length} messages and ${properties.length} properties`);

    const result = await geminiService.getAiChatResponse(history, properties);

    res.json(result);
  } catch (error) {
    apiLogger.error('Error in aiChat:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to get AI chat response. Please try again later.' });
  }
};

/**
 * POST /api/ai/generate-search-name
 * Generate a human-readable name for a saved search based on filters
 */
export const generateSearchName = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isApiKeyConfigured()) {
      res.status(503).json({ message: 'AI service is not available. GOOGLE_AI_API_KEY is not configured.' });
      return;
    }

    const { filters, lat, lng } = req.body;

    if (!filters || typeof filters !== 'object') {
      res.status(400).json({ message: 'filters is required and must be an object.' });
      return;
    }

    // If lat/lng provided (from generateSearchNameFromCoords fallback), generate location-based name
    if (typeof lat === 'number' && typeof lng === 'number') {
      apiLogger.info(`Generating search name from coordinates: ${lat}, ${lng}`);
      const name = await geminiService.generateSearchNameFromCoords(lat, lng);
      res.json({ name });
      return;
    }

    apiLogger.info('Generating search name from filters');

    const name = await geminiService.generateSearchName(filters);

    res.json({ name });
  } catch (error) {
    apiLogger.error('Error in generateSearchName:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ message: 'Failed to generate search name. Please try again later.' });
  }
};
