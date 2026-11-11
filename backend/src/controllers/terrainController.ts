import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import { getElevationGrid, validateGridQuery } from '../services/terrain/elevationGridService';
import { TerrainUnavailableError } from '../services/terrain/terrainTileStore';

/**
 * GET /api/terrain/elevation-grid?south=&west=&north=&east=
 * Heights on a grid over the box, for the map's terrain (slope) tool.
 * 400 for a bad or oversized box, 503 when the elevation tiles can't be read.
 */
export const getTerrainElevationGrid = async (req: Request, res: Response): Promise<void> => {
  const parsed = validateGridQuery(req.query as Record<string, unknown>);
  if (parsed.isValid === false) {
    res.status(400).json({ message: parsed.error });
    return;
  }
  try {
    const result = await getElevationGrid(parsed.value);
    // Ground heights don't change: let browsers and the CDN keep the answer.
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(result);
  } catch (error) {
    const reason = error instanceof TerrainUnavailableError ? error.message : 'unknown error';
    apiLogger.warn(`Terrain elevation unavailable: ${reason}`);
    res.status(503).json({ message: 'Elevation data is temporarily unavailable' });
  }
};
