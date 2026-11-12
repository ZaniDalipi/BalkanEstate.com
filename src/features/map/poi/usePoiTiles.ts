import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { poiKeys } from '@/src/shared/query/queryKeys';
import { fetchPoiTile } from './poiApi';
import { tilesInBounds, type ViewBounds } from './poiTiles';
import { MAX_VISIBLE_POIS, POI_ZOOM, type Poi, type PoiStatus } from './poiTypes';

const HOUR_MS = 60 * 60 * 1000;

/**
 * The places of interest in the current map view, from the backend one tile at
 * a time (cached an hour, so panning back costs nothing). `status` says what
 * to tell the person instead of leaving an empty map unexplained.
 */
export function usePoiTiles(enabled: boolean, bounds: ViewBounds | null, zoom: number): { pois: Poi[]; status: PoiStatus } {
  const tileKey = bounds ? `${bounds.north.toFixed(3)},${bounds.south.toFixed(3)},${bounds.east.toFixed(3)},${bounds.west.toFixed(3)}` : '';
  const tiles = useMemo(
    () => (enabled && zoom >= POI_ZOOM ? tilesInBounds(bounds) : []),
    // `tileKey` stands for `bounds`: a new object with the same view must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, zoom, tileKey],
  );

  const results = useQueries({
    queries: tiles.map((t) => ({
      queryKey: poiKeys.tile(t.x, t.y),
      queryFn: () => fetchPoiTile(t.x, t.y),
      staleTime: HOUR_MS,
      retry: 1,
      retryDelay: 2000,
      refetchOnWindowFocus: false,
    })),
  });

  const pois = useMemo(() => {
    const seen = new Map<string, Poi>();
    for (const r of results) for (const p of r.data ?? []) if (!seen.has(p.id)) seen.set(p.id, p);
    return [...seen.values()].sort((a, b) => a.rank - b.rank).slice(0, MAX_VISIBLE_POIS);
  }, [results]);

  if (!enabled) return { pois: [], status: 'off' };
  if (zoom < POI_ZOOM) return { pois: [], status: 'zoom-in' };
  if (tiles.length === 0) return { pois: [], status: 'loading' };
  if (pois.length > 0) return { pois, status: 'ready' };
  if (results.some((r) => r.isPending)) return { pois, status: 'loading' };
  return { pois, status: results.every((r) => r.isError) ? 'error' : 'empty' };
}
