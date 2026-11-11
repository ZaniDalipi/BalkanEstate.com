import { isPlausiblePlaceName } from './location';

export interface GeocodeHit { lat: number; lng: number }

export interface Geocoders {
  /** Structured search: street, city, country. */
  structured: (address: string | undefined, city: string, country: string) => Promise<GeocodeHit | null>;
  /** Free-text search, e.g. "Banjole, Croatia". */
  freeform: (query: string) => Promise<GeocodeHit | null>;
}

export interface ListingPlace {
  address?: string;
  city?: string;
  country?: string;
  title?: string;
}

/**
 * The place a title starts with — "Banjole , kuća+bazen-na moru",
 * "Medulin - Ševe, poljoprivredno zemljište" — when it reads like a place name.
 */
export const placeAtStartOfTitle = (title: string | undefined): string | undefined => {
  const first = title?.split(/\s*[,|–—:-]\s*/)[0]?.trim();
  return first && isPlausiblePlaceName(first) && first.split(/\s+/).length <= 3 ? first : undefined;
};

/**
 * A map position for a listing whose page gave none: the most precise query
 * that finds something wins — street + city, city, street + country, then
 * the place a title starts with. Null only when nothing at all is known or
 * found. Each query is tried at most once.
 */
export const geocodeListing = async (place: ListingPlace, geo: Geocoders): Promise<GeocodeHit | null> => {
  const { address, city, country } = place;
  const tried = new Set<string>();
  const attempt = async (key: string, run: () => Promise<GeocodeHit | null>) => {
    if (tried.has(key)) return null;
    tried.add(key);
    try {
      return await run();
    } catch {
      return null;
    }
  };

  if (city && country) {
    if (address) {
      const hit = await attempt(`s:${address}|${city}|${country}`, () => geo.structured(address, city, country));
      if (hit) return hit;
    }
    const hit = await attempt(`s:|${city}|${country}`, () => geo.structured(undefined, city, country));
    if (hit) return hit;
  }
  const freeQueries = [
    address && [address, city, country].filter(Boolean).join(', '),
    city && [city, country].filter(Boolean).join(', '),
    (() => {
      const p = placeAtStartOfTitle(place.title);
      return p && p !== city ? [p, country].filter(Boolean).join(', ') : undefined;
    })(),
  ].filter((q): q is string => !!q && q.length >= 3);
  for (const q of freeQueries) {
    const hit = await attempt(`f:${q}`, () => geo.freeform(q));
    if (hit) return hit;
  }
  return null;
};
