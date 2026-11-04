/**
 * One route from A to B with Google's Directions service (the Maps script is
 * already loaded on the map). Never throws: the result says what happened, so
 * the UI can always offer the next best thing (a straight-line distance and an
 * "Open in Google Maps" link) instead of an error.
 */
import type { LatLng, TravelMode } from './spotlightUtils';

export type RouteResult =
  | { ok: true; meters: number; seconds: number; path: LatLng[] }
  /** No route for this mode (e.g. no public transport), or the service refused. */
  | { ok: false; reason: 'no-route' | 'unavailable' };

const MODE: Record<TravelMode, string> = { driving: 'DRIVING', walking: 'WALKING', transit: 'TRANSIT' };

export async function fetchRoute(origin: LatLng, destination: LatLng, mode: TravelMode): Promise<RouteResult> {
  const maps = typeof google !== 'undefined' ? google.maps : undefined;
  if (!maps?.DirectionsService) return { ok: false, reason: 'unavailable' };
  try {
    const response = await new maps.DirectionsService().route({
      origin,
      destination,
      travelMode: MODE[mode] as google.maps.TravelMode,
    });
    const route = response.routes?.[0];
    const legs = route?.legs ?? [];
    if (!route || legs.length === 0) return { ok: false, reason: 'no-route' };
    const meters = legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0);
    const seconds = legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0);
    const path = (route.overview_path ?? []).map((p) => ({ lat: p.lat(), lng: p.lng() }));
    return { ok: true, meters, seconds, path };
  } catch (error) {
    // ZERO_RESULTS / NOT_FOUND: nothing for this mode. Anything else (the key
    // has no Directions API, quota, network): the service is not available.
    const code = (error as { code?: string })?.code ?? String(error);
    return { ok: false, reason: /ZERO_RESULTS|NOT_FOUND/.test(code) ? 'no-route' : 'unavailable' };
  }
}
