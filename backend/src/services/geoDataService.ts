/**
 * geoDataService.ts
 *
 * Fetches real administrative boundary GeoJSON from OpenStreetMap's Overpass API.
 * Used to display actual municipality/neighborhood polygon shapes on the choropleth map.
 *
 * Flow:
 *   1. Check MongoDB cache (90-day TTL)
 *   2. Nominatim: resolve city → OSM area ID
 *   3. Overpass: fetch admin_level 7–10 relations AND mapped neighbourhood
 *      areas (place=neighbourhood/suburb/…, as relations and closed ways)
 *      within the city area
 *   4. Convert Overpass JSON → GeoJSON FeatureCollection
 *   5. Select ONE coherent set: admin subdivisions at a useful granularity,
 *      else the neighbourhood areas (many cities map neighbourhoods as places,
 *      not as administrative units)
 *   6. Cache in MongoDB and return, with the fetch time for the UI
 */

import axios from 'axios';
import { apiLogger } from '../utils/logger';
import CityGeoData, { CityBoundarySource } from '../models/CityGeoData';

// ── Constants ─────────────────────────────────────────────────────────────────

const GEO_CACHE_DAYS = 90;

/**
 * Bump this whenever the Overpass query or `selectBoundarySet` changes what a
 * city ends up with. Cached rows stamped with anything lower are refetched on
 * the next request, so a fix reaches cities already in the cache instead of
 * waiting out their 90 days.
 *
 * 1 — districts + nested neighbourhoods in one response; boundary ways and
 *     settlement places requested; relations with unroled member ways no
 *     longer dropped.
 */
const BOUNDARY_PIPELINE_VERSION = 1;
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

/** A closed way — how most neighbourhood areas are mapped. */
interface OverpassWay {
  type: 'way';
  id: number;
  tags?: Record<string, string>;
  geometry?: OSMNode[];
}

type OverpassElement = OverpassRelation | OverpassWay;

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
  // Every polygon on this map carries a permanent name label, so an unnamed
  // area has nothing to say — better omitted than labelled "Region 12345".
  const relName = rel.tags.name ?? rel.tags['name:en'] ?? rel.tags['name:latin'];
  if (!relName?.trim()) return null;

  const outerBuckets: Map<number, Array<[number, number]>> = new Map();
  const innerWays: Array<Array<[number, number]>> = [];

  let wayIndex = 0;
  for (const m of rel.members) {
    if (m.type !== 'way' || !m.geometry || m.geometry.length < 2) continue;
    const coords = m.geometry.map(toCoord);

    // An EMPTY role is the common case for a boundary relation's outer ways:
    // `outer` is only required to disambiguate a multipolygon that has holes,
    // so a great many simple boundaries tag their ways with no role at all.
    // Accepting only `outer` therefore dropped those relations whole — the
    // single largest reason a city drew a handful of districts instead of all
    // of them. Any other named role (`subarea`, `label`, `admin_centre`) is
    // not part of the ring and is still skipped.
    if (m.role === 'inner') {
      innerWays.push(coords);
    } else if (!m.role || m.role === 'outer') {
      outerBuckets.set(wayIndex++, coords);
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
      name: relName,
      name_en: rel.tags['name:en'] ?? rel.tags['name:latin'] ?? null,
      admin_level: parseInt(rel.tags.admin_level ?? '8', 10),
      ...nameTags,
    },
    geometry,
  };
}

/**
 * Convert one closed way to a Feature.
 *
 * Neighbourhoods are usually mapped as a single closed way rather than a
 * multipolygon relation, so skipping ways loses most of them.
 */
function wayToFeature(way: OverpassWay): GeoJSONFeature | null {
  if (!way.geometry || way.geometry.length < 4) return null;

  const tags = way.tags ?? {};
  const wayName = tags.name ?? tags['name:en'] ?? tags['name:latin'];
  if (!wayName?.trim()) return null;

  const ring = way.geometry.map(toCoord);
  const first = ring[0];
  const last = ring[ring.length - 1];
  // An unclosed way is a line, not an area — closing it would invent geometry.
  if (Math.abs(first[0] - last[0]) > 1e-9 || Math.abs(first[1] - last[1]) > 1e-9) return null;

  const nameTags = Object.fromEntries(Object.entries(tags).filter(([k]) => k.startsWith('name')));

  return {
    type: 'Feature',
    id: way.id,
    properties: {
      osm_id: way.id,
      name: wayName,
      name_en: tags['name:en'] ?? tags['name:latin'] ?? null,
      admin_level: tags.admin_level ? parseInt(tags.admin_level, 10) : null,
      place: tags.place ?? null,
      ...nameTags,
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

/** Exported for tests: what OSM sent in, and which shapes survive parsing. */
export function overpassToGeoJSON(elements: OverpassElement[]): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = [];
  for (const el of elements) {
    const f = el.type === 'relation'
      ? relationToFeature(el)
      : el.type === 'way'
        ? wayToFeature(el)
        : null;
    if (f) features.push(f);
  }
  return { type: 'FeatureCollection', features };
}

const MIN_DISTRICTS = 3;
/**
 * Cap on the *base partition* — the one set of shapes that tiles the city.
 * A real city's administrative subdivision does not exceed this, so a level
 * with more than 60 members is a finer grain than a city view wants; it is
 * not discarded, it becomes part of the nested layer below.
 */
const MAX_DISTRICTS = 60;
/**
 * Cap on the nested layer. Generous on purpose: this is the answer to "show
 * all the neighbourhoods", and a large city legitimately has hundreds of named
 * ones. Bounded only so a pathological Overpass response cannot ship megabytes
 * of geometry to a phone.
 */
const MAX_NEIGHBOURHOODS = 400;

/**
 * Which of the two layers a shape belongs to.
 *
 * `district` shapes tile the city — one coherent partition, drawn filled.
 * `neighbourhood` shapes sit *inside* those districts, drawn on top. The
 * distinction is what lets both be shown at once: they are a hierarchy, not
 * two rival partitions of the same ground.
 */
export type BoundaryLayer = 'district' | 'neighbourhood';

export interface BoundarySelection {
  /** Both layers in one collection; every feature carries `properties.layer`. */
  geojson: GeoJSONFeatureCollection;
  source: CityBoundarySource;
  adminLevel: number;
  districtCount: number;
  neighbourhoodCount: number;
  /** Shapes the caps discarded, so a truncation is never silent. */
  droppedCount: number;
}

const isPlaceFeature = (f: GeoJSONFeature): boolean =>
  typeof f.properties.place === 'string' && (f.properties.place as string).length > 0;

const featureLevel = (f: GeoJSONFeature): number =>
  typeof f.properties.admin_level === 'number' ? f.properties.admin_level : 8;

/** Tolerant identity for "the same area named twice". */
function normalizeName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const tagLayer = (f: GeoJSONFeature, layer: BoundaryLayer): GeoJSONFeature => ({
  ...f,
  properties: { ...f.properties, layer },
});

/**
 * Choose the base partition: the administrative level that tiles the city at a
 * granularity a reader can take in. Coarser levels first — level 9 districts
 * read better than level 10 blocks for a whole-city view, and whatever is
 * finer than the chosen level is not lost, it moves to the nested layer.
 */
function chooseDistrictLevel(
  byLevel: Map<number, GeoJSONFeature[]>,
  placeCount: number,
): number | null {
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  for (const lvl of levels) {
    const count = byLevel.get(lvl)!.length;
    if (count >= MIN_DISTRICTS && count <= MAX_DISTRICTS) return lvl;
  }

  // Nothing in the readable range. The most populated level is still a real
  // partition, and drawing it beats drawing nothing.
  let best: number | null = null;
  for (const [lvl, features] of byLevel) {
    if (best === null || features.length > byLevel.get(best)!.length) best = lvl;
  }
  if (best === null) return null;

  // …but one or two shapes are not a partition of anything. That case is
  // usually the city's own boundary and nothing below it, and drawing the city
  // outlined against itself while its named neighbourhoods sit unused is the
  // worst of both: the places become the base instead.
  if (byLevel.get(best)!.length < MIN_DISTRICTS && placeCount >= MIN_DISTRICTS) return null;

  return best;
}

/**
 * Split every shape OSM returned into the two layers the map draws.
 *
 * The previous version of this picked exactly one set and threw the other
 * away, on the reasoning that two partitions of the same ground cannot be
 * overlaid. That is true of two *rival* partitions — but a city's named
 * neighbourhoods sit inside its administrative districts, and so do any finer
 * admin levels. So they are drawn as a nested second layer instead of being
 * discarded, which is what makes a city show all of its neighbourhoods rather
 * than only whichever set happened to win.
 *
 * Concretely, for Tirana: the 24 `Njësia Bashkiake` become the districts, and
 * Blloku, Kombinat, Fresku and the rest become the layer on top. Before, one
 * of those two groups was invisible.
 */
export function selectBoundarySet(raw: GeoJSONFeatureCollection): BoundarySelection {
  const empty: BoundarySelection = {
    geojson: { type: 'FeatureCollection', features: [] },
    source: 'admin',
    adminLevel: 8,
    districtCount: 0,
    neighbourhoodCount: 0,
    droppedCount: 0,
  };
  if (raw.features.length === 0) return empty;

  const adminFeatures = raw.features.filter(f => !isPlaceFeature(f));
  const placeFeatures = raw.features.filter(isPlaceFeature);

  const byLevel = new Map<number, GeoJSONFeature[]>();
  for (const f of adminFeatures) {
    const lvl = featureLevel(f);
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl)!.push(f);
  }

  const districtLevel = chooseDistrictLevel(byLevel, placeFeatures.length);

  let districts: GeoJSONFeature[] = [];
  let nested: GeoJSONFeature[] = [];
  let adminLevel = 0;
  let source: CityBoundarySource;

  if (districtLevel !== null) {
    districts = byLevel.get(districtLevel)!;
    adminLevel = districtLevel;
    // Everything finer than the base partition is nested inside it. Coarser
    // levels — the city's own outline, its county — are dropped: an outline
    // drawn over itself tells a reader nothing.
    for (const [lvl, features] of byLevel) {
      if (lvl > districtLevel) nested.push(...features);
    }
    nested.push(...placeFeatures);
    source = nested.length > 0 ? 'mixed' : 'admin';
  } else {
    // No administrative subdivision at all. The `place` areas are then the
    // only partition there is, which is the case in cities where
    // neighbourhoods were never mapped as admin units.
    districts = placeFeatures;
    source = 'place';
  }

  // An area named once as an admin unit and again as a place is one area. The
  // district wins, so the base partition stays intact.
  const districtNames = new Set(districts.map(f => normalizeName(f.properties.name)));
  const seenNested = new Set<string>();
  nested = nested.filter(f => {
    const key = normalizeName(f.properties.name);
    if (!key || districtNames.has(key) || seenNested.has(key)) return false;
    seenNested.add(key);
    return true;
  });

  const keptDistricts = districts.slice(0, MAX_DISTRICTS);
  const keptNested = nested.slice(0, MAX_NEIGHBOURHOODS);
  const droppedCount =
    districts.length - keptDistricts.length + (nested.length - keptNested.length);

  if (droppedCount > 0) {
    apiLogger.warn(
      `Boundary selection dropped ${droppedCount} shape(s) over the display caps ` +
      `(${MAX_DISTRICTS} districts, ${MAX_NEIGHBOURHOODS} neighbourhoods)`,
    );
  }

  return {
    geojson: {
      type: 'FeatureCollection',
      features: [
        ...keptDistricts.map(f => tagLayer(f, 'district')),
        ...keptNested.map(f => tagLayer(f, 'neighbourhood')),
      ],
    },
    source,
    adminLevel,
    districtCount: keptDistricts.length,
    neighbourhoodCount: keptNested.length,
    droppedCount,
  };
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

/**
 * `place` values worth drawing.
 *
 * Includes `town|village|hamlet` because a Balkan municipality routinely
 * absorbs surrounding settlements — Tirana's boundary contains villages that
 * are every bit as much "a neighbourhood" to a reader as Blloku is, and
 * leaving them out left visible holes in the map.
 */
const PLACE_KINDS =
  'neighbourhood|suburb|quarter|borough|city_district|city_block|town|village|hamlet';

/** Administrative levels that subdivide a city rather than contain it. */
const ADMIN_LEVELS = '^(7|8|9|10|11)$';

async function fetchOverpassBoundaries(areaId: number): Promise<GeoJSONFeatureCollection> {
  // Four sets in one request. Both administrative boundaries and neighbourhood
  // areas turn up as relations *and* as single closed ways in OSM, and asking
  // only for relations is why whole districts went missing: a boundary drawn
  // as one closed way was never requested at all.
  const query = `[out:json][timeout:60];area(${areaId})->.city;(`
    + `relation(area.city)["boundary"="administrative"]["admin_level"~"${ADMIN_LEVELS}"];`
    + `way(area.city)["boundary"="administrative"]["admin_level"~"${ADMIN_LEVELS}"];`
    + `relation(area.city)["place"~"^(${PLACE_KINDS})$"];`
    + `way(area.city)["place"~"^(${PLACE_KINDS})$"];`
    + `);out body geom;`;

  const res = await axios.post(
    OVERPASS_URL,
    `data=${encodeURIComponent(query)}`,
    {
      // Comfortably past the 60s Overpass is allowed to spend, so a query that
      // runs long comes back with data rather than being cut off locally.
      timeout: 70000,
      headers: { ...HTTP_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  const elements: OverpassElement[] = res.data?.elements ?? [];
  apiLogger.info(`Overpass returned ${elements.length} elements for area ${areaId}`);
  return overpassToGeoJSON(elements);
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface CityGeoDataResult {
  boundaries: GeoJSONFeatureCollection;
  source: CityBoundarySource;
  /** When these shapes were fetched from OpenStreetMap — shown to the reader. */
  fetchedAt: Date;
}

export async function getCityGeoData(
  city: string,
  country: string,
  forceRefresh = false
): Promise<CityGeoDataResult | null> {
  if (!forceRefresh) {
    try {
      const cached = await CityGeoData.findOne({ city, country }).lean();
      if (cached) {
        const ageMs = Date.now() - cached.lastUpdated.getTime();
        const currentPipeline = (cached.pipelineVersion ?? 0) >= BOUNDARY_PIPELINE_VERSION;
        if (!currentPipeline) {
          apiLogger.info(
            `Refetching boundaries for ${city}, ${country}: cached by pipeline ` +
            `v${cached.pipelineVersion ?? 0}, now v${BOUNDARY_PIPELINE_VERSION}`,
          );
        }
        if (currentPipeline && ageMs < GEO_CACHE_DAYS * 24 * 60 * 60 * 1000) {
          return {
            boundaries: cached.boundaries as unknown as GeoJSONFeatureCollection,
            source: cached.boundarySource ?? 'admin',
            // The cached fetch time, not "now" — the reader is being told when
            // the data was pulled, not when they asked for it.
            fetchedAt: cached.lastUpdated,
          };
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
    const selection = selectBoundarySet(raw);

    if (selection.geojson.features.length === 0) {
      apiLogger.warn(`No boundaries found for ${city}, ${country}`);
      return null;
    }

    const fetchedAt = new Date();
    await CityGeoData.findOneAndUpdate(
      { city, country },
      {
        boundaries: selection.geojson,
        adminLevel: selection.adminLevel,
        boundarySource: selection.source,
        featureCount: selection.geojson.features.length,
        districtCount: selection.districtCount,
        neighbourhoodCount: selection.neighbourhoodCount,
        pipelineVersion: BOUNDARY_PIPELINE_VERSION,
        lastUpdated: fetchedAt,
      },
      { upsert: true, new: true }
    );

    apiLogger.info(
      `Cached boundaries for ${city}, ${country}: ${selection.districtCount} district(s) ` +
      `at admin level ${selection.adminLevel} + ${selection.neighbourhoodCount} neighbourhood(s) ` +
      `[${selection.source}]`,
    );
    return { boundaries: selection.geojson, source: selection.source, fetchedAt };
  } catch (err) {
    apiLogger.error(`Failed to fetch geo data for ${city}, ${country}:`, err);
    return null;
  }
}
