import type { SoftIconName } from '@/src/shared/illustrations';

export type PoiCategory =
  | 'transport' | 'education' | 'health' | 'shopping' | 'park'
  | 'dining' | 'culture' | 'worship' | 'sport' | 'services';

/** A place of interest as the backend returns it (see backend/src/services/pois/poiTile.ts). */
export interface Poi {
  id: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  rank: number;
}

/** The backend only has places from this zoom up; the tiles are zoom-14 tiles. */
export const POI_ZOOM = 14;

/** Furthest-from-centre tiles are dropped past this, so a wide view never asks for dozens. */
export const MAX_POI_TILES = 16;

/** Pins drawn at once; the most prominent ones win. */
export const MAX_VISIBLE_POIS = 300;

export const POI_STYLE: Record<PoiCategory, { icon: SoftIconName; color: string }> = {
  transport: { icon: 'car', color: '#0EA5E9' },
  education: { icon: 'gradCap', color: '#6366F1' },
  health: { icon: 'hospital', color: '#EF4444' },
  shopping: { icon: 'store', color: '#F59E0B' },
  park: { icon: 'tree', color: '#22C55E' },
  dining: { icon: 'wine', color: '#EC4899' },
  culture: { icon: 'landmark', color: '#A855F7' },
  worship: { icon: 'landmark', color: '#14B8A6' },
  sport: { icon: 'trophy', color: '#84CC16' },
  services: { icon: 'building', color: '#64748B' },
};

export type PoiStatus = 'off' | 'zoom-in' | 'loading' | 'error' | 'empty' | 'ready';
