import type { Poi, PoiCategory } from './poiTypes';
import { POI_STYLE } from './poiTypes';

/** Keeps only well-formed places: the answer comes from the network, so it is checked, not trusted. */
export const parsePoiResponse = (body: unknown): Poi[] => {
  const list = (body as { pois?: unknown } | null)?.pois;
  if (!Array.isArray(list)) return [];
  const pois: Poi[] = [];
  for (const item of list) {
    const p = item as Partial<Poi> | null;
    if (
      p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.trim() &&
      typeof p.category === 'string' && p.category in POI_STYLE &&
      typeof p.lat === 'number' && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 &&
      typeof p.lng === 'number' && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180
    ) {
      pois.push({ id: p.id, name: p.name, category: p.category as PoiCategory, lat: p.lat, lng: p.lng, rank: typeof p.rank === 'number' ? p.rank : 999 });
    }
  }
  return pois;
};
