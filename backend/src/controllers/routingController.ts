import { Request, Response } from 'express';
import { apiLogger } from '../utils/logger';
import { getRoute, RoutingUnavailableError, validateRouteQuery } from '../services/routing/routingService';

/**
 * GET /api/routing/route?from=lat,lng&to=lat,lng&mode=car|foot|bike
 * A route for drawing on a map. 404 when there is no route, 503 when the
 * router is down — the client then falls back to straight-line distance.
 */
export const getTravelRoute = async (req: Request, res: Response): Promise<void> => {
  const parsed = validateRouteQuery(req.query as Record<string, unknown>);
  if (parsed.isValid === false) {
    res.status(400).json({ message: parsed.error });
    return;
  }
  try {
    const route = await getRoute(parsed.value);
    if (!route) {
      res.status(404).json({ message: 'No route found between these points' });
      return;
    }
    res.set('Cache-Control', 'private, max-age=600');
    res.json({ route });
  } catch (error) {
    // Never log the coordinates: they are the visitor's location.
    apiLogger.warn(`Routing unavailable: ${error instanceof RoutingUnavailableError ? error.message : 'unknown error'}`);
    res.status(503).json({ message: 'Routing is temporarily unavailable' });
  }
};
