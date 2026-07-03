/**
 * geoDataService.ts
 *
 * Fetches real administrative boundary GeoJSON from OpenStreetMap's Overpass API.
 * Used to display actual municipality/neighborhood polygon shapes on the choropleth map.
 *
 * Flow:
 *   1. Check MongoDB cache (90-day TTL)
 *   2. Nominatim: resolve city → OSM area ID
 *   3. Overpass: fetch admin_level 7–10 relations within the city area
 *   4. Convert Overpass JSON → GeoJSON FeatureCollection
 *   5. Select the admin level that gives the most useful number of districts
 *   6. Cache in MongoDB and return
 */

import axios from 'axios';
import { apiLogger } from '../utils/logger';
import CityGeoData from '../models/CityGeoData';

// ── Constants ─────────────────────────────────────────────────────────────────

const GEO_CACHE_DAYS = 90;
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const HTTP_HEADERS = {
  'User-Agent': 'BalkanEstate Research Bot/1.0 (real estate)',
  'Accept-Language': 'en',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface OSMNode {
  lat: number;
  lon: number;
}

interface OverpassMember {
  type: string;
  ref: number;
  role: string;
  geometry?: OSMNode[];
}

interface OverpassRelation {
  type: 'relation';
  id: number;
  tags: Record<string, string>;
  members: OverpassMember[];
}

interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: Array<Array<[number, number]>>;
}

interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: Array<Array<Array<[number, number]>>>;
}

interface GeoJSONFeature {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// ── Overpass → GeoJSON conversion ────────────────────────────────────────────

function toCoord(node: OSMNode): [number, number] {
  return [node.lon, node.lat];
}

/**
 * Stitch a list of ways (coordinate arrays) into a single closed ring.
 * Handles cases where ways share endpoints and need to be ordered.
 */
function stitchWays(ways: Array<Array<[number, number]>>): Array<[number, number]> | null {
  if (ways.length === 0) return null;
  if (ways.length === 1) {
    const w = ways[0];
    if (w.length < 3) return null;
    const closed = [...w];
    if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
      closed.push(closed[0]);
    }
    return closed;
  }

  const ring: Array<[number, number]> = [...ways[0]];
  const remaining = ways.slice(1).map(w => [...w] as Array<[number, number]>);
  const EPS = 1e-7;

  while (remaining.length > 0) {
    const tail = ring[ring.length - 1];
    const head = ring[0];

    // Close if ring head ≈ tail
    if (Math.abs(tail[0] - head[0]) < EPS && Math.abs(tail[1] - head[1]) < EPS) break;

    let found = false;
    for (let i = 0; i < remaining.length; i++) {
      const w = remaining[i];
      const wHead = w[0];
      const wTail = w[w.length - 1];

      if (Math.abs(wHead[0] - tail[0]) < EPS && Math.abs(wHead[1] - tail[1]) < EPS) {
        ring.push(...w.slice(1));
        remaining.splice(i, 1);
        found = true;
        break;
      }
      if (Math.abs(wTail[0] - tail[0]) < EPS && Math.abs(wTail[1] - tail[1]) < EPS) {
        ring.push(...[...w].reverse().slice(1));
        remaining.splice(i, 1);
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  // Ensure ring is closed
  const head = ring[0];
  const tail = ring[ring.length - 1];
  if (Math.abs(head[0] - tail[0]) > EPS || Math.abs(head[1] - tail[1]) > EPS) {
    ring.push(head);
  }

  return ring.length >= 4 ? ring : null;
}

/** Convert one Overpass relation to a GeoJSON Feature */
function relationToFeature(rel: OverpassRelation): GeoJSONFeature | null {
  const outerBuckets: Map<number, Array<[number, number]>> = new Map();
  const innerWays: Array<Array<[number, number]>> = [];

  let wayIndex = 0;
  for (const m of rel.members) {
    if (m.type !== 'way' || !m.geometry || m.geometry.length < 2) continue;
    const coords = m.geometry.map(toCoord);
    if (m.role === 'outer') {
      outerBuckets.set(wayIndex++, coords);
    } else if (m.role === 'inner') {
      innerWays.push(coords);
    }
  }

  if (outerBuckets.size === 0) return null;

  // Greedily stitch outer ways into rings
  const allOuter = [...outerBuckets.values()];
  const outerRings: Array<Array<[number, number]>> = [];
  const unused = [...allOuter];

  while (unused.length > 0) {
    const start = unused.shift()!;
    const ringWays: Array<Array<[number, number]>> = [start];
    const EPS = 1e-7;

    let extended = true;
    while (extended && unused.length > 0) {
      extended = false;
      const tail = ringWays[ringWays.length - 1];
      const tailPt = tail[tail.length - 1];
      const headPt = ringWays[0][0];
      if (Math.abs(tailPt[0] - headPt[0]) < EPS && Math.abs(tailPt[1] - headPt[1]) < EPS) break;

      for (let i = 0; i < unused.length; i++) {
        const w = unused[i];
        const wH = w[0];
        const wT = w[w.length - 1];
        if (Math.abs(wH[0] - tailPt[0]) < EPS && Math.abs(wH[1] - tailPt[1]) < EPS) {
          ringWays.push(w);
          unused.splice(i, 1);
          extended = true;
          break;
        }
        if (Math.abs(wT[0] - tailPt[0]) < EPS && Math.abs(wT[1] - tailPt[1]) < EPS) {
          ringWays.push([...w].reverse());
          unused.splice(i, 1);
          extended = true;
          break;
        }
      }
    }

    const ring = stitchWays(ringWays);
    if (ring) outerRings.push(ring);
  }

  if (outerRings.length === 0) return null;

  // Build inner holes (simplified: stitch all inner ways into one ring)
  const innerRings: Array<Array<[number, number]>> = [];
  if (innerWays.length > 0) {
    const inner = stitchWays(innerWays);
    if (inner) innerRings.push(inner);
  }

  const geometry: GeoJSONPolygon | GeoJSONMultiPolygon =
    outerRings.length === 1
      ? { type: 'Polygon', coordinates: [outerRings[0], ...innerRings] }
      : { type: 'MultiPolygon', coordinates: outerRings.map((o, i) => [o, ...(i === 0 ? innerRings : [])]) };

  // Collect all name-related tags
  const nameTags = Object.fromEntries(Object.entries(rel.tags).filter(([k]) => k.startsWith('name')));

  return {
    type: 'Feature',
    id: rel.id,
    properties: {
      osm_id: rel.id,
      name: rel.tags.name ?? `Region ${rel.id}`,
      name_en: rel.tags['name:en'] ?? rel.tags['name:latin'] ?? null,
      admin_level: parseInt(rel.tags.admin_level ?? '8', 10),
      ...nameTags,
    },
    geometry,
  };
}

function overpassToGeoJSON(elements: OverpassRelation[]): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = [];
  for (const el of elements) {
    if (el.type !== 'relation') continue;
    const f = relationToFeature(el);
    if (f) features.push(f);
  }
  return { type: 'FeatureCollection', features };
}

/**
 * Pick the admin level that gives the most useful number of sub-districts (3–50 features).
 * Prefers levels that produce a reasonable neighbourhood count.
 */
function selectBestAdminLevel(raw: GeoJSONFeatureCollection): GeoJSONFeatureCollection {
  if (raw.features.length === 0) return raw;

  const byLevel = new Map<number, GeoJSONFeature[]>();
  for (const f of raw.features) {
    const lvl = (f.properties.admin_level as number) ?? 8;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(f);
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  // Prefer the level with 3–50 features (city neighbourhood scale)
  for (const lvl of levels) {
    const features = byLevel.get(lvl)!;
    if (features.length >= 3 && features.length <= 50) {
      return { type: 'FeatureCollection', features };
    }
  }

  // Fall back to the most populated level
  let best = levels[0];
  for (const [lvl, features] of byLevel) {
    if (features.length > (byLevel.get(best)?.length ?? 0)) best = lvl;
  }
  return { type: 'FeatureCollection', features: byLevel.get(best) ?? [] };
}

// ── Nominatim + Overpass fetch ────────────────────────────────────────────────

async function getCityAreaId(city: string, country: string): Promise<number | null> {
  try {
    const res = await axios.get(`${NOMINATIM_URL}/search`, {
      params: { q: `${city}, ${country}`, format: 'json', limit: 3, featuretype: 'city' },
      headers: HTTP_HEADERS,
      timeout: 12000,
    });
    const results = res.data as Array<{ osm_type: string; osm_id: number; class: string; type: string }>;
    // Prefer administrative relations
    const best = results.find(r => r.osm_type === 'relation') ?? results[0];
    if (!best) return null;
    if (best.osm_type === 'relation') return best.osm_id + 3600000000;
    if (best.osm_type === 'way') return best.osm_id + 2400000000;
    return null;
  } catch (err) {
    apiLogger.warn(`Nominatim lookup failed for ${city}, ${country}:`, err);
    return null;
  }
}

async function fetchOverpassBoundaries(areaId: number): Promise<GeoJSONFeatureCollection> {
  const query = `[out:json][timeout:30];area(${areaId})->.city;(relation(area.city)["boundary"="administrative"]["admin_level"~"^(7|8|9|10)$"];);out body geom;`;
  const res = await axios.post(
    OVERPASS_URL,
    `data=${encodeURIComponent(query)}`,
    {
      timeout: 35000,
      headers: { ...HTTP_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  const elements: OverpassRelation[] = res.data?.elements ?? [];
  apiLogger.info(`Overpass returned ${elements.length} elements for area ${areaId}`);
  return overpassToGeoJSON(elements);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCityGeoData(
  city: string,
  country: string,
  forceRefresh = false
): Promise<GeoJSONFeatureCollection | null> {
  if (!forceRefresh) {
    try {
      const cached = await CityGeoData.findOne({ city, country }).lean();
      if (cached) {
        const ageMs = Date.now() - cached.lastUpdated.getTime();
        if (ageMs < GEO_CACHE_DAYS * 24 * 60 * 60 * 1000) {
          return cached.boundaries as unknown as GeoJSONFeatureCollection;
        }
      }
    } catch (err) {
      apiLogger.warn(`CityGeoData cache lookup failed for ${city}/${country}:`, err);
    }
  }

  try {
    const areaId = await getCityAreaId(city, country);
    if (!areaId) {
      apiLogger.warn(`No OSM area ID found for ${city}, ${country}`);
      return null;
    }

    await new Promise(r => setTimeout(r, 1000)); // rate-limit Nominatim

    const raw = await fetchOverpassBoundaries(areaId);
    const geojson = selectBestAdminLevel(raw);

    if (geojson.features.length === 0) {
      apiLogger.warn(`No boundaries found for ${city}, ${country}`);
      return null;
    }

    await CityGeoData.findOneAndUpdate(
      { city, country },
      {
        boundaries: geojson,
        adminLevel: (geojson.features[0]?.properties.admin_level as number) ?? 8,
        featureCount: geojson.features.length,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    apiLogger.info(`Cached ${geojson.features.length} boundaries for ${city}, ${country}`);
    return geojson;
  } catch (err) {
    apiLogger.error(`Failed to fetch geo data for ${city}, ${country}:`, err);
    return null;
  }
}
