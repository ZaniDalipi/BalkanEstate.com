/**
 * Google Places adapter for the listing location picker.
 *
 * The app already loads the Maps JS API with the `places` library (see
 * `useGoogleMapLoader`), so autocomplete costs no extra key or script. Google
 * indexes the small riviera villages and resort settlements sellers actually
 * list in — Palasë, Dhërmi, Sveti Stefan, Sunny Beach — which Nominatim ranks
 * far below same-named streets elsewhere in the Balkans.
 *
 * Two generations of the Places API are in the wild and which one a given key
 * gets depends on the loaded Maps version, so both are supported:
 *   - `AutocompleteSuggestion` / `Place` (Places API New)
 *   - `AutocompleteService` / `PlacesService` (legacy)
 * When neither is present the caller falls back to the gazetteer + Nominatim.
 */
import type { Coordinates } from '@/shared/geo';

export interface PlacePrediction {
  placeId: string;
  /** Primary line — usually the settlement or street name. */
  title: string;
  /** Secondary line — the administrative context. */
  subtitle: string;
  /** Only present when an `origin` was supplied. */
  distanceKm?: number;
}

export interface ResolvedPlace {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface PlacePredictionOptions {
  /** ISO 3166-1 alpha-2, restricts results to one country. */
  countryCode?: string;
  /** Biases results towards this point and yields `distanceKm`. */
  origin?: Coordinates | null;
  /** Radius (km) of the bias circle around `origin`. */
  biasRadiusKm?: number;
  /** Groups billing of keystrokes into one session with the follow-up detail call. */
  sessionToken?: unknown;
}

/** Google caps an autocomplete bias circle at 50km. */
const MAX_BIAS_RADIUS_METERS = 50_000;

type MapsNamespace = typeof google.maps | undefined;

const getMaps = (): MapsNamespace =>
  typeof window !== 'undefined' ? (window as any).google?.maps : undefined;

/** True when a Places implementation this module can drive is loaded. */
export const isPlacesAvailable = (): boolean => {
  const places = getMaps()?.places as any;
  return Boolean(places?.AutocompleteSuggestion || places?.AutocompleteService);
};

/**
 * A token that ties a run of keystrokes to the detail lookup that follows, so
 * Google bills one session rather than one request per character. Returns
 * `undefined` when Places is not loaded; callers pass it straight back in.
 */
export const createSessionToken = (): unknown => {
  const places = getMaps()?.places as any;
  try {
    if (places?.AutocompleteSessionToken) return new places.AutocompleteSessionToken();
  } catch {
    // Token creation is an optimisation — never fail the search over it.
  }
  return undefined;
};

const metersToKm = (meters: unknown): number | undefined =>
  typeof meters === 'number' && Number.isFinite(meters) ? meters / 1000 : undefined;

const biasRadiusMeters = (radiusKm?: number): number =>
  Math.min(Math.max((radiusKm ?? 25) * 1000, 1000), MAX_BIAS_RADIUS_METERS);

const fetchWithNewApi = async (
  query: string,
  { countryCode, origin, biasRadiusKm, sessionToken }: PlacePredictionOptions
): Promise<PlacePrediction[]> => {
  const places = getMaps()!.places as any;

  const request: Record<string, unknown> = { input: query, sessionToken };
  if (countryCode) request.includedRegionCodes = [countryCode.toLowerCase()];
  if (origin) {
    request.origin = { lat: origin.lat, lng: origin.lng };
    request.locationBias = {
      center: { lat: origin.lat, lng: origin.lng },
      radius: biasRadiusMeters(biasRadiusKm),
    };
  }

  const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

  return (suggestions ?? [])
    .map((suggestion: any) => suggestion?.placePrediction)
    .filter(Boolean)
    .map((prediction: any) => ({
      placeId: prediction.placeId,
      title: prediction.mainText?.toString?.() ?? prediction.text?.toString?.() ?? '',
      subtitle: prediction.secondaryText?.toString?.() ?? '',
      distanceKm: metersToKm(prediction.distanceMeters),
    }))
    .filter((prediction: PlacePrediction) => prediction.placeId && prediction.title);
};

const fetchWithLegacyApi = (
  query: string,
  { countryCode, origin, biasRadiusKm, sessionToken }: PlacePredictionOptions
): Promise<PlacePrediction[]> => {
  const maps = getMaps()!;
  const places = maps.places as any;
  const service = new places.AutocompleteService();

  const request: Record<string, unknown> = { input: query, sessionToken };
  if (countryCode) request.componentRestrictions = { country: countryCode.toLowerCase() };
  if (origin) {
    const center = new maps.LatLng(origin.lat, origin.lng);
    request.origin = center;
    request.locationBias = new maps.Circle({ center, radius: biasRadiusMeters(biasRadiusKm) });
  }

  return new Promise((resolve) => {
    service.getPlacePredictions(request, (predictions: any[] | null, status: string) => {
      // ZERO_RESULTS is a normal outcome, not an error worth surfacing.
      if (status !== places.PlacesServiceStatus.OK || !predictions) {
        resolve([]);
        return;
      }
      resolve(
        predictions.map((prediction) => ({
          placeId: prediction.place_id,
          title: prediction.structured_formatting?.main_text ?? prediction.description ?? '',
          subtitle: prediction.structured_formatting?.secondary_text ?? '',
          distanceKm: metersToKm(prediction.distance_meters),
        }))
      );
    });
  });
};

/**
 * Autocomplete predictions for `query`. Resolves to `[]` — never rejects — when
 * Places is unavailable or the request fails, so the caller can fall through to
 * its other sources without a try/catch at every call site.
 */
export const fetchPlacePredictions = async (
  query: string,
  options: PlacePredictionOptions = {}
): Promise<PlacePrediction[]> => {
  const places = getMaps()?.places as any;
  if (!places || !query.trim()) return [];

  try {
    if (places.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
      return await fetchWithNewApi(query, options);
    }
    if (places.AutocompleteService) {
      return await fetchWithLegacyApi(query, options);
    }
  } catch {
    // Quota, network or an API shape we don't drive — fall through to `[]`.
  }
  return [];
};

const resolveWithNewApi = async (placeId: string, sessionToken?: unknown): Promise<ResolvedPlace | null> => {
  const places = getMaps()!.places as any;
  const place = new places.Place({ id: placeId });
  await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'], sessionToken });

  const lat = place.location?.lat?.();
  const lng = place.location?.lng?.();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    formattedAddress: place.formattedAddress || place.displayName || '',
  };
};

const resolveWithLegacyApi = (placeId: string, sessionToken?: unknown): Promise<ResolvedPlace | null> => {
  const maps = getMaps()!;
  const places = maps.places as any;
  // PlacesService needs a DOM node purely to host the "powered by Google" logo.
  const service = new places.PlacesService(document.createElement('div'));

  return new Promise((resolve) => {
    service.getDetails(
      { placeId, fields: ['geometry', 'formatted_address', 'name'], sessionToken },
      (place: any, status: string) => {
        const lat = place?.geometry?.location?.lat?.();
        const lng = place?.geometry?.location?.lng?.();
        if (status !== places.PlacesServiceStatus.OK || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          resolve(null);
          return;
        }
        resolve({ lat, lng, formattedAddress: place.formatted_address || place.name || '' });
      }
    );
  });
};

/**
 * Coordinates and formatted address for a prediction.
 * Resolves to `null` — never rejects — when the lookup fails.
 */
export const resolvePlaceDetails = async (
  placeId: string,
  sessionToken?: unknown
): Promise<ResolvedPlace | null> => {
  const places = getMaps()?.places as any;
  if (!places || !placeId) return null;

  try {
    if (places.Place) return await resolveWithNewApi(placeId, sessionToken);
    if (places.PlacesService) return await resolveWithLegacyApi(placeId, sessionToken);
  } catch {
    // Fall through — the caller keeps whatever coordinates it already had.
  }
  return null;
};
