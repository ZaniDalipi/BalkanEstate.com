import { Request, Response } from 'express';
import Property from '../models/Property';
import { buildFeatureMatchClauses, parseFeatureMatchRequest } from '../services/featureMatch';
import { apiLogger } from '../utils/logger';

/** More than any search page loads at once; the ids are only used to narrow it. */
const MAX_IDS = 5000;

/**
 * GET /api/properties/feature-matches?features=floor heating|ngrohje&flags=hasBalcony&listingType=sale
 *
 * The ids of listings that have every requested feature, read from the full
 * listing (tags, title, description) rather than the trimmed list payload.
 */
export const getFeatureMatches = async (req: Request, res: Response): Promise<void> => {
  const request = parseFeatureMatchRequest(req.query as Record<string, unknown>);
  if (request.features.length === 0 && request.flags.length === 0) {
    res.status(400).json({ message: 'Give at least one feature or flag to match.' });
    return;
  }
  const listingType = req.query.listingType === 'rent' || req.query.listingType === 'sale'
    ? req.query.listingType
    : undefined;

  try {
    const docs = await Property.find({
      ...(listingType ? { listingType } : {}),
      $and: buildFeatureMatchClauses(request),
    })
      .select('_id')
      .limit(MAX_IDS)
      .lean();
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ ids: docs.map((d) => String(d._id)) });
  } catch (error) {
    apiLogger.error(`Feature match failed: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ message: 'Could not check listing features right now.' });
  }
};
