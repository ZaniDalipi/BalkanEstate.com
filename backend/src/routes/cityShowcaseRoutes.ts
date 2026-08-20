import express, { Request, Response } from 'express';
import CityShowcase from '../models/CityShowcase';
import { apiLogger } from '../utils/logger';

const router = express.Router();

/**
 * Upper bound on the public list.
 *
 * The gallery is an accordion: every extra panel makes the inactive ones
 * thinner, so a realistic curated list is under a dozen. The cap is far above
 * that only so a runaway collection cannot turn this into an unbounded
 * response — it is a safety limit, not a design constraint. The frontend
 * applies its own, smaller display limit.
 */
const MAX_PANELS = 50;

/**
 * Public list of city panels for the home-page elastic gallery.
 *
 * Only active rows, in display order. Returns an empty array when there are
 * none: this collection is the sole source of truth for the gallery, so
 * "empty" means "render no section" rather than "fall back to something".
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cities = await CityShowcase.find({ isActive: true })
      .sort({ displayOrder: 1, city: 1 })
      .select('city country searchQuery imageUrl')
      .limit(MAX_PANELS)
      .lean();

    res.json({ cities, count: cities.length });
  } catch (error) {
    apiLogger.error('Get city showcase error:', error);
    res.status(500).json({ message: 'Error fetching city showcase' });
  }
});

export default router;
