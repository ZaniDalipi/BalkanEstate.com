import catalogue from '../../data/placeCatalog.json';
import { CITY_SLUG_MAP } from '../locationLookup';

/**
 * The app's own place catalogue: the countries and cities a listing can be
 * filed under (what the listing form's city picker offers), and the villages
 * and resorts that belong to each city. Generated from the frontend lists
 * (`npm run sync:places`), so an imported listing lands on a city the app
 * knows — "Vlorë" and "Radhimë" both become the city "Vlore".
 */

interface CatalogueCity { name: string; lat: number; lng: number }
interface CatalogueCountry { name: string; code: string; cities: CatalogueCity[] }
interface CatalogueLocality {
  name: string;
  aliases?: string[];
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface CataloguePlace {
  /** City name exactly as the app lists it. */
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** The village / resort / neighbourhood named, when it wasn't the city itself. */
  locality?: string;
}

const COUNTRIES = (catalogue as { countries: CatalogueCountry[] }).countries;
const LOCALITIES = (catalogue as { localities: CatalogueLocality[] }).localities;

/** "Durrës" → "durres", "Gjiri i Lalzit" → "gjirilalzit". */
export const foldPlace = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\d]/gu, '');

const multiMap = <T>(entries: Array<[string, T]>): Map<string, T[]> => {
  const m = new Map<string, T[]>();
  for (const [k, v] of entries) {
    if (!k) continue;
    const list = m.get(k) ?? [];
    list.push(v);
    m.set(k, list);
  }
  return m;
};

const CITY_INDEX = multiMap<CataloguePlace>(
  COUNTRIES.flatMap((c) => c.cities.map((city): [string, CataloguePlace] => [
    foldPlace(city.name), { city: city.name, country: c.name, lat: city.lat, lng: city.lng },
  ]))
);

const LOCALITY_INDEX = multiMap<CataloguePlace>(
  LOCALITIES.flatMap((l) => [l.name, ...(l.aliases ?? [])].map((n): [string, CataloguePlace] => [
    foldPlace(n), { city: l.city, country: l.country, lat: l.lat, lng: l.lng, locality: l.name },
  ]))
);

/** Other spellings of catalogue cities from our older lookup table ("Saranda" → Sarande). */
const SPELLINGS = new Map<string, string>(
  Object.entries(CITY_SLUG_MAP).map(([k, v]) => [foldPlace(k), foldPlace(v)])
);

const COUNTRY_NAMES = new Map(COUNTRIES.map((c) => [foldPlace(c.name), c.name]));

/** The catalogue's spelling of a country ("albania" → "Albania"), when it lists it. */
export const catalogueCountry = (name?: string): string | undefined =>
  name ? COUNTRY_NAMES.get(foldPlace(name)) : undefined;

const pick = (hits: CataloguePlace[] | undefined, country?: string): CataloguePlace | undefined => {
  if (!hits?.length) return undefined;
  const inCountry = country ? hits.filter((h) => h.country === country) : hits;
  if (inCountry.length) return inCountry[0];
  // Without a country, a name is only trusted when it means one place.
  return !country && new Set(hits.map((h) => `${h.city}|${h.country}`)).size === 1 ? hits[0] : undefined;
};

/** The catalogue place a single name means: a city, or a village under its city. */
export const lookupCataloguePlace = (name: string, country?: string): CataloguePlace | undefined => {
  const key = foldPlace(name);
  if (key.length < 3) return undefined;
  const alt = SPELLINGS.get(key);
  return pick(CITY_INDEX.get(key), country)
    ?? (alt ? pick(CITY_INDEX.get(alt), country) : undefined)
    ?? pick(LOCALITY_INDEX.get(key), country);
};

/** Words that are cities somewhere but mostly something else in a listing text. */
const AMBIGUOUS = new Set(['bar', 'nice', 'center', 'centar', 'centre', 'more', 'sale', 'plaza', 'bay', 'park', 'port', 'polje', 'selo', 'grad']);

/**
 * The first catalogue city or village named in free text — a title such as
 * "Apartments for sale in Marea Coast Radhime, Vlore Albania", an address,
 * or a URL path like "/en/properties/Sarande-ALSS945/". Tries three-, two-
 * and one-word names, so "Gjiri i Lalzit" and "Herceg Novi" are found.
 */
export const findCataloguePlaceInText = (text: string, country?: string): CataloguePlace | undefined => {
  const words = text.split(/[^\p{L}\d]+/u).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    for (const span of [3, 2, 1]) {
      if (i + span > words.length) continue;
      const phrase = words.slice(i, i + span).join(' ');
      const key = foldPlace(phrase);
      // A short or everyday word ("Bar", "Polje") only counts as a place name
      // when the country is known and the word is written as a name.
      const asName = Boolean(country) && /^\p{Lu}/u.test(phrase);
      if ((key.length < 4 && !asName) || key.length < 3) continue;
      if (span === 1 && AMBIGUOUS.has(key) && !asName) continue;
      const hit = lookupCataloguePlace(phrase, country);
      if (hit) return hit;
    }
  }
  return undefined;
};

/** True when `text` already names `place` (its city, the village, or any alias of it). */
export const textMentionsPlace = (text: string, place: CataloguePlace): boolean => {
  const words = text.split(/[^\p{L}\d]+/u).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    for (const span of [3, 2, 1]) {
      if (i + span > words.length) continue;
      const hit = lookupCataloguePlace(words.slice(i, i + span).join(' '), place.country);
      if (hit && hit.city === place.city && hit.locality === place.locality) return true;
    }
  }
  return false;
};

const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

const LOCALITY_RADIUS_KM = 6;
const CITY_RADIUS_KM = 35;

/**
 * The catalogue city a map position belongs to: a village or resort within
 * a few km gives its city; otherwise the nearest city within ~35 km.
 */
export const nearestCataloguePlace = (lat: number, lng: number, country?: string): CataloguePlace | undefined => {
  const inCountry = (p: { country: string }) => !country || p.country === country;
  let best: { place: CataloguePlace; km: number } | undefined;
  for (const l of LOCALITIES) {
    if (!inCountry(l)) continue;
    const km = distanceKm(lat, lng, l.lat, l.lng);
    if (km <= LOCALITY_RADIUS_KM && (!best || km < best.km)) {
      best = { place: { city: l.city, country: l.country, lat: l.lat, lng: l.lng, locality: l.name }, km };
    }
  }
  if (best) return best.place;
  for (const c of COUNTRIES) {
    if (country && c.name !== country) continue;
    for (const city of c.cities) {
      const km = distanceKm(lat, lng, city.lat, city.lng);
      if (km <= CITY_RADIUS_KM && (!best || km < best.km)) {
        best = { place: { city: city.name, country: c.name, lat: city.lat, lng: city.lng }, km };
      }
    }
  }
  return best?.place;
};
