import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import { getTilePois, PoisUnavailableError } from '../services/pois/poiService';
import { parsePoiTile } from '../services/pois/poiTile';

/** A tile's places change with the weekly map release: let browsers and the CDN keep them for an hour. */
const CACHE_CONTROL = 'public, max-age=3600';

// @route   GET /api/pois/tile/:x/:y
// @access  Public
export const getPoiTile = async (req: Request, res: Response): Promise<void> => {
  const tile = parsePoiTile(req.params.x, req.params.y);
  if (tile.ok === false) {
    res.status(400).json({ message: tile.error });
    return;
  }

  try {
    const pois = await getTilePois(tile.value);
    res.set('Cache-Control', CACHE_CONTROL);
    res.json({ pois });
  } catch (error: unknown) {
    if (error instanceof PoisUnavailableError) {
      res.set('Retry-After', '30');
      res.status(503).json({ message: 'Places of interest are temporarily unavailable' });
      return;
    }
    apiLogger.error('Get POI tile error:', error);
    res.status(500).json({ message: 'Error fetching places of interest' });
  }
};
