/**
 * Turns OpenMapTiles vector-tile features (as GeoJSON in lon/lat) into noise
 * sources measured from the home: the same output as the Overpass path, so
 * the noise and traffic model does not care where the map data came from.
 * Pure.
 *
 * Layers used (OpenMapTiles schema, served by OpenFreeMap):
 *   transportation       every road / rail piece, with its class (no names)
 *   transportation_name  named roads, with their class
 *   poi                  bars, pubs, nightclubs
 *   aerodrome_label      airports, with IATA codes
 */

import { polylineDistance, type NoiseSource, type SourceKind } from './osmSources';

export interface TileFeature {
  layer: string;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
}

/** How far each kind is looked for, in metres. */
export const TILE_RADII = { roads: 500, streets: 150, nightlife: 150, airports: 4000 } as const;

/** Named and unnamed pieces of one road this close in distance count as the same road. */
const SAME_ROAD_M = 15;

const ROAD_CLASSES = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'] as const;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** What a tile feature is as a noise source, or null when it is none. */
export const tileKindOf = (layer: string, p: Record<string, unknown>): SourceKind | null => {
  if (layer === 'transportation' || layer === 'transportation_name') {
    // Roads in tunnels are heard far less; leave them out.
    if (p.brunnel === 'tunnel') return null;
    const cls = str(p.class);
    if (!cls) return null;
    if ((ROAD_CLASSES as readonly string[]).includes(cls)) {
      // Ramps carry less traffic than the road they join.
      return Number(p.ramp) === 1 && cls !== 'tertiary' ? 'tertiary' : (cls as SourceKind);
    }
    if (cls === 'minor') return 'street';
    if (cls === 'transit') return 'tram';
    if (cls === 'rail') {
      const sub = str(p.subclass);
      if (sub === 'tram' || sub === 'light_rail') return 'tram';
      if (sub === 'rail' || sub === 'narrow_gauge' || sub === undefined) return 'railway';
    }
    return null;
  }
  if (layer === 'poi') {
    const sub = str(p.subclass);
    if (sub === 'nightclub') return 'nightclub';
    if (sub === 'bar' || sub === 'pub' || sub === 'biergarten' || str(p.class) === 'bar') return 'bar';
    return null;
  }
  if (layer === 'aerodrome_label') return str(p.iata) ? 'airport' : null;
  return null;
};

const radiusFor = (kind: SourceKind): number => {
  if (kind === 'street') return TILE_RADII.streets;
  if (kind === 'bar' || kind === 'nightclub') return TILE_RADII.nightlife;
  if (kind === 'airport') return TILE_RADII.airports;
  return TILE_RADII.roads;
};

type LonLat = [number, number];
const isLonLat = (c: unknown): c is LonLat =>
  Array.isArray(c) && c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]);

/** The lines (or single points) making up a geometry, as lists of lon/lat pairs. */
export const linesOf = (geometry: TileFeature['geometry']): LonLat[][] => {
  const c = geometry.coordinates;
  switch (geometry.type) {
    case 'Point':
      return isLonLat(c) ? [[c]] : [];
    case 'MultiPoint':
    case 'LineString':
      return Array.isArray(c) ? [c.filter(isLonLat)] : [];
    case 'MultiLineString':
    case 'Polygon':
      return Array.isArray(c) ? c.map((l) => (Array.isArray(l) ? l.filter(isLonLat) : [])) : [];
    case 'MultiPolygon':
      return Array.isArray(c) ? c.flatMap((poly) => (Array.isArray(poly) ? poly.map((l) => (Array.isArray(l) ? l.filter(isLonLat) : [])) : [])) : [];
    default:
      return [];
  }
};

const distanceTo = (home: { lat: number; lng: number }, geometry: TileFeature['geometry']): number => {
  const origin = { lat: home.lat, lon: home.lng };
  let best = Infinity;
  for (const line of linesOf(geometry)) {
    if (line.length === 0) continue;
    best = Math.min(best, polylineDistance(origin, line.map(([lon, lat]) => ({ lat, lon }))));
  }
  return best;
};

/**
 * Noise sources from the features of the tiles around a home. Named roads come
 * from `transportation_name`; road pieces without a name from `transportation`
 * count only when no named road of the same class is at about the same
 * distance (the same road, drawn twice).
 */
export const tileFeaturesToSources = (features: TileFeature[], home: { lat: number; lng: number }): NoiseSource[] => {
  const named: NoiseSource[] = [];
  const unnamed: NoiseSource[] = [];

  for (const f of features) {
    if (!f || !f.properties || !f.geometry) continue;
    const kind = tileKindOf(f.layer, f.properties);
    if (!kind) continue;
    const d = distanceTo(home, f.geometry);
    if (!Number.isFinite(d) || d > radiusFor(kind)) continue;
    const distanceM = Math.round(d);
    const name = str(f.properties.name) ?? str(f.properties.ref);

    if (f.layer === 'transportation') {
      unnamed.push({ kind, distanceM, group: `${kind}:piece:${Math.round(distanceM / 30)}` });
    } else if (name) {
      named.push({ kind, name, distanceM, group: `${kind}:${name}` });
    } else {
      // Venues and airports without a name still count, once each.
      named.push({ kind, distanceM, group: `${kind}:at:${distanceM}` });
    }
  }

  const sameRoad = (u: NoiseSource) =>
    named.some((n) => n.kind === u.kind && Math.abs(n.distanceM - u.distanceM) <= SAME_ROAD_M);
  return [...named, ...unnamed.filter((u) => !sameRoad(u))];
};
