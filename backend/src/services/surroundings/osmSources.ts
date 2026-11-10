/**
 * Turns OpenStreetMap elements (an Overpass `out tags geom` / `out tags center`
 * answer) into noise sources with their distance from the home. Pure.
 */

export type RoadKind = 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary';
export type SourceKind = RoadKind | 'railway' | 'tram' | 'airport' | 'nightclub' | 'bar';

export interface NoiseSource {
  kind: SourceKind;
  /** Street, line or venue name when OSM has one. */
  name?: string;
  /** Groups the many OSM pieces of one road or line. */
  group: string;
  distanceM: number;
}

interface LatLon {
  lat: number;
  lon: number;
}

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: LatLon;
  geometry?: Array<LatLon | null>;
  tags?: Record<string, string>;
}

export const ROAD_KINDS: readonly RoadKind[] = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];

const M_PER_DEG_LAT = 111_320;

/** Point → (x, y) metres around an origin; accurate to well under 1% within a few km. */
const project = (origin: LatLon, p: LatLon) => ({
  x: (p.lon - origin.lon) * M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180),
  y: (p.lat - origin.lat) * M_PER_DEG_LAT,
});

/** Shortest distance in metres from `origin` to the segment a–b. */
const segmentDistance = (origin: LatLon, a: LatLon, b: LatLon): number => {
  const pa = project(origin, a);
  const pb = project(origin, b);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(pa.x * dx + pa.y * dy) / len2));
  return Math.hypot(pa.x + t * dx, pa.y + t * dy);
};

/** Shortest distance in metres from `origin` to a polyline; Infinity for an empty one. */
export const polylineDistance = (origin: LatLon, line: LatLon[]): number => {
  if (line.length === 0) return Infinity;
  if (line.length === 1) return segmentDistance(origin, line[0], line[0]);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) best = Math.min(best, segmentDistance(origin, line[i - 1], line[i]));
  return best;
};

const isLatLon = (p: unknown): p is LatLon =>
  !!p && typeof p === 'object' &&
  Number.isFinite((p as LatLon).lat) && Number.isFinite((p as LatLon).lon);

/** What a tagged element is as a noise source, or null when it is none. */
export const kindOf = (tags: Record<string, string>): SourceKind | null => {
  const highway = tags.highway;
  if (highway) {
    if ((ROAD_KINDS as readonly string[]).includes(highway)) return highway as RoadKind;
    // Ramps carry less traffic than the road they join.
    if (/^(motorway|trunk|primary)_link$/.test(highway)) return 'tertiary';
    return null;
  }
  if (tags.railway === 'rail') return 'railway';
  if (tags.railway === 'tram' || tags.railway === 'light_rail') return 'tram';
  if (tags.aeroway === 'aerodrome' && tags.iata) return 'airport';
  if (tags.amenity === 'nightclub') return 'nightclub';
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return 'bar';
  return null;
};

/** Every recognised source in the answer, measured from the home. */
export const toSources = (elements: unknown, home: { lat: number; lng: number }): NoiseSource[] => {
  if (!Array.isArray(elements)) return [];
  const origin = { lat: home.lat, lon: home.lng };
  const out: NoiseSource[] = [];

  for (const raw of elements as OsmElement[]) {
    const tags = raw?.tags;
    if (!tags || typeof tags !== 'object') continue;
    const kind = kindOf(tags);
    if (!kind) continue;

    let distanceM = Infinity;
    if (Array.isArray(raw.geometry)) distanceM = polylineDistance(origin, raw.geometry.filter(isLatLon));
    else if (isLatLon(raw.center)) distanceM = polylineDistance(origin, [raw.center]);
    else if (isLatLon(raw)) distanceM = polylineDistance(origin, [raw]);
    if (!Number.isFinite(distanceM)) continue;

    const name = tags.name?.trim() || tags.ref?.trim() || undefined;
    out.push({
      kind,
      name,
      // One named road is one source however many pieces OSM splits it into.
      group: `${kind}:${name ?? `${raw.type}/${raw.id}`}`,
      distanceM: Math.round(distanceM),
    });
  }
  return out;
};
