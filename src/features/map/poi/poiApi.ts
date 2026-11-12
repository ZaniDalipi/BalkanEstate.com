import { apiRequest } from '@/src/shared/api';
import { parsePoiResponse } from './parsePoiResponse';
import type { Poi } from './poiTypes';

/** The places in one zoom-14 map tile. Throws when the server cannot answer, so the caller can say so. */
export const fetchPoiTile = async (x: number, y: number): Promise<Poi[]> =>
  parsePoiResponse(await apiRequest<unknown>(`/pois/tile/${x}/${y}`));
