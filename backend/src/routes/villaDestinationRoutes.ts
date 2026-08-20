import express, { Request, Response } from 'express';
import VillaDestination from '../models/VillaDestination';
import { apiLogger } from '../utils/logger';

const router = express.Router();

/**
 * Public list of villa destinations for the home-page corridor.
 *
 * Only active ones, in display order. Returns an empty array rather than an
 * error when none exist yet — the frontend treats "empty" as "use the built-in
 * list", so the section still renders on a fresh database.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const destinations = await VillaDestination.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .select('name query country imageUrl imageCity imageCountry lat lng zoom')
      // Has to stay ahead of DEFAULT_VILLA_DESTINATIONS, which is 60 entries.
      // It was 40 while the built-in list was 14, so importing the current
      // list would have silently dropped the last 20 from the home page —
      // they would exist in the database, be listed in the admin, and never
      // appear in the corridor. Still bounded, so a runaway table cannot
      // turn this into an unbounded response.
      .limit(200)
      .lean();

    res.json({ destinations, count: destinations.length });
  } catch (error) {
    apiLogger.error('Get villa destinations error:', error);
    res.status(500).json({ message: 'Error fetching villa destinations' });
  }
});

export default router;
