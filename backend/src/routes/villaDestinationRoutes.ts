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
      // Has to stay ahead of DEFAULT_VILLA_DESTINATIONS, which is 225 entries.
      // This has now been the wrong number twice: 40 while the list was 14,
      // then 200 while it grew to 225. Both would silently drop the tail —
      // those destinations exist in the database and are listed in the admin,
      // they simply never reach the corridor. Kept generous but bounded, so a
      // runaway table still cannot turn this into an unbounded response.
      .limit(500)
      .lean();

    res.json({ destinations, count: destinations.length });
  } catch (error) {
    apiLogger.error('Get villa destinations error:', error);
    res.status(500).json({ message: 'Error fetching villa destinations' });
  }
});

export default router;
