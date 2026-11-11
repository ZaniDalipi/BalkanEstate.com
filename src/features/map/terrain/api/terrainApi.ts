import { apiRequest } from '@/src/shared/api';
import type { ElevationGridResponse, GridBounds } from '../types';
import { parseElevationGridResponse } from '../utils/parseElevationGrid';

/** Heights on a grid over the box, from `/api/terrain/elevation-grid`. */
export async function fetchElevationGrid(bounds: GridBounds): Promise<ElevationGridResponse> {
  const query = new URLSearchParams({
    south: String(bounds.south),
    west: String(bounds.west),
    north: String(bounds.north),
    east: String(bounds.east),
  });
  const raw = await apiRequest<unknown>(`/terrain/elevation-grid?${query.toString()}`);
  const parsed = parseElevationGridResponse(raw);
  if (!parsed) throw new Error('Unexpected elevation data');
  return parsed;
}
