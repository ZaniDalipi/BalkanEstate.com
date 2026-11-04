/**
 * Travel routes between two points (visitor → business), via an OSRM server.
 *
 * Defaults to the FOSSGIS servers behind openstreetmap.org's own directions
 * (car, foot and bike profiles); set ROUTING_BASE_URL to a self-hosted OSRM
 * with the same `/routed-{profile}` layout to move off them. Calls go through
 * the backend so the browser never talks to the router directly, results are
 * cached briefly, and visitor coordinates are never logged or stored.
 */

export const TRAVEL_MODES = ['car', 'foot', 'bike'] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteRequest {
  from: LatLng;
  to: LatLng;
  mode: TravelMode;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  /** [lat, lng] pairs along the route, simplified for drawing. */
  path: Array<[number, number]>;
}

export type Validation<T> = { isValid: true; value: T } | { isValid: false; error: string };

/** Longest straight-line trip we route: past this a road route makes little sense for a local service. */
export const MAX_ROUTE_KM = 1500;

const parsePoint = (raw: unknown): LatLng | null => {
  if (typeof raw !== 'string' || raw.length > 60) return null;
  const parts = raw.split(',');
  if (parts.length !== 2) return null;
  const [lat, lng] = parts.map((p) => Number(p.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Check `?from=lat,lng&to=lat,lng&mode=car|foot|bike`. */
export function validateRouteQuery(query: Record<string, unknown>): Validation<RouteRequest> {
  const from = parsePoint(query.from);
  const to = parsePoint(query.to);
  if (!from || !to) return { isValid: false, error: 'from and to must be "lat,lng" coordinates' };
  const mode = (query.mode ?? 'car') as TravelMode;
  if (!TRAVEL_MODES.includes(mode)) return { isValid: false, error: 'mode must be car, foot or bike' };
  if (haversineKm(from, to) > MAX_ROUTE_KM) return { isValid: false, error: 'Points are too far apart to route' };
  return { isValid: true, value: { from, to, mode } };
}

/** Same trip to ~10 m → same cache entry (and the visitor's exact spot isn't kept). */
export const routeCacheKey = ({ from, to, mode }: RouteRequest): string =>
  [mode, from.lat.toFixed(4), from.lng.toFixed(4), to.lat.toFixed(4), to.lng.toFixed(4)].join(':');

/** The router URL for a request. */
export function osrmRouteUrl(base: string, { from, to, mode }: RouteRequest): string {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  return `${base.replace(/\/+$/, '')}/routed-${mode}/route/v1/driving/${coords}?overview=simplified&geometries=geojson&alternatives=false&steps=false`;
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{ distance?: number; duration?: number; geometry?: { coordinates?: Array<[number, number]> } }>;
}

/** Turn an OSRM answer into a RouteResult, or null when it found no route. */
export function parseOsrmResponse(body: unknown): RouteResult | null {
  const data = body as OsrmResponse;
  const route = data?.code === 'Ok' ? data.routes?.[0] : undefined;
  if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') return null;
  const coords = route.geometry?.coordinates ?? [];
  return {
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    path: coords.filter((c) => Array.isArray(c) && c.length >= 2).map(([lng, lat]) => [lat, lng] as [number, number]),
  };
}

// ── Small in-memory cache ────────────────────────────────────────────────────
const TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { at: number; value: RouteResult | null }>();

const remember = (key: string, value: RouteResult | null) => {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), value });
};

export class RoutingUnavailableError extends Error {}

/**
 * Fetch a route. Resolves null when the router says there is none (an island,
 * no road); throws RoutingUnavailableError when the router can't be reached.
 */
export async function getRoute(req: RouteRequest, fetchImpl: typeof fetch = fetch): Promise<RouteResult | null> {
  const key = routeCacheKey(req);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const base = process.env.ROUTING_BASE_URL || 'https://routing.openstreetmap.de';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetchImpl(osrmRouteUrl(base, req), {
      signal: controller.signal,
      headers: { 'User-Agent': 'BalkanEstate/1.0 (+https://balkanestateai.com)', Accept: 'application/json' },
    });
    // OSRM answers 400 with code NoRoute / NoSegment when there simply is no route.
    if (!res.ok && res.status !== 400) throw new RoutingUnavailableError(`Router answered ${res.status}`);
    const value = parseOsrmResponse(await res.json());
    remember(key, value);
    return value;
  } catch (error) {
    if (error instanceof RoutingUnavailableError) throw error;
    throw new RoutingUnavailableError(error instanceof Error ? error.message : 'Router unreachable');
  } finally {
    clearTimeout(timer);
  }
}

/** Test hook. */
export const clearRouteCache = (): void => cache.clear();
