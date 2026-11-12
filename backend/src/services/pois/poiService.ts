/**
 * Places of interest for the search map, one map tile at a time, read from
 * the same OpenFreeMap vector tiles as the noise model. A tile's short list
 * is kept for a day; a failure for half a minute, so a tile host that is down
 * is not hammered by everyone panning the map.
 */

import { createPromiseCache } from '../../utils/promiseCache';
import type { TileId } from '../surroundings/tileMath';
import { featuresInTile, TilesUnavailableError } from '../surroundings/vectorTileClient';
import { tileFeaturesToPois, type Poi } from './poiTile';

export { TilesUnavailableError as PoisUnavailableError };

const DAY_MS = 24 * 60 * 60 * 1000;
const cache = createPromiseCache<Poi[]>(DAY_MS, 2000, 30_000);

/** For tests. */
export const clearPoiCache = (): void => cache.clear();

/** The places in one tile; rejects with PoisUnavailableError when the tile cannot be read. */
export const getTilePois = (tile: TileId): Promise<Poi[]> =>
  cache.get(`${tile.z}/${tile.x}/${tile.y}`, async () => tileFeaturesToPois(await featuresInTile(tile, ['poi'])));
