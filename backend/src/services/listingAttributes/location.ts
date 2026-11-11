import { CITY_SLUG_MAP, COUNTRY_SLUG_MAP } from '../locationLookup';

/**
 * Location helpers for imported listings: recognise a known city or country
 * however a site spells it ("Vlorë", "Vlore", "VLORA", "vlore-city"), find
 * one inside a title or URL, and repair swapped coordinates.
 */

/** Lower-case, accents removed, only letters and digits: "Durrës" → "durres", "Gold Coast" → "goldcoast". */
export const locationSlug = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\d]/gu, '');

const index = (map: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(map).map(([k, v]) => [locationSlug(k), v]));

const CITIES = index(CITY_SLUG_MAP);
const COUNTRIES = index(COUNTRY_SLUG_MAP);
/** Free text needs longer keys: "me" and "al" are words, not Montenegro and Albania. */
const MIN_TEXT_KEY = 4;
/** City names that are also everyday English words in listing titles ("Nice apartment"). */
const AMBIGUOUS_IN_TEXT = new Set(['nice', 'cork']);

export const canonicalCity = (name: string): string | undefined => CITIES.get(locationSlug(name));
export const canonicalCountry = (name: string): string | undefined => COUNTRIES.get(locationSlug(name));

export interface PlaceMatch { city?: string; country?: string }

/**
 * The first known city and country named in free text — a title like
 * "Apartments for sale in Radhime, Vlorë Albania", or a URL path like
 * "/en/properties/Vlore-ALVS1455/". Single words and word pairs are tried
 * ("Herceg Novi", "Gold Coast").
 */
export const findPlaceInText = (text: string): PlaceMatch => {
  const words = text.split(/[^\p{L}\d]+/u).filter(Boolean);
  const out: PlaceMatch = {};
  for (let i = 0; i < words.length && !(out.city && out.country); i++) {
    for (const span of [2, 1]) {
      if (i + span > words.length) continue;
      const slug = locationSlug(words.slice(i, i + span).join(''));
      if (slug.length < MIN_TEXT_KEY || AMBIGUOUS_IN_TEXT.has(slug)) continue;
      if (!out.city && CITIES.has(slug)) { out.city = CITIES.get(slug); break; }
      if (!out.country && COUNTRIES.has(slug)) { out.country = COUNTRIES.get(slug); break; }
    }
  }
  return out;
};

/** Rough box around the region we list in (Balkans, Greece, Italy's east coast, Romania, Bulgaria, Turkey's west). */
const REGION = { minLat: 34, maxLat: 49, minLng: 12, maxLng: 30 };
const inRegion = (lat: number, lng: number) =>
  lat >= REGION.minLat && lat <= REGION.maxLat && lng >= REGION.minLng && lng <= REGION.maxLng;

/**
 * Sites sometimes publish latitude and longitude the wrong way round
 * (latitude 19.48, longitude 40.35 for a flat in Vlorë). When the pair only
 * makes sense swapped, swap it; otherwise leave it as given.
 */
export const fixSwappedCoordinates = (lat: number, lng: number): { lat: number; lng: number } =>
  !inRegion(lat, lng) && inRegion(lng, lat) ? { lat: lng, lng: lat } : { lat, lng };

export interface ResolvedLocation {
  city?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

const text = (v: unknown): string | undefined => {
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t || undefined;
};

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n !== 0 ? n : undefined;
};

const urlPath = (url?: string): string => {
  try {
    return url ? decodeURIComponent(new URL(url).pathname) : '';
  } catch {
    return '';
  }
};

/**
 * City, country, street address and coordinates of a listing, from whatever
 * the site gave us. Prefers a city our app knows (so search and the map
 * find it): a known city in the city field, else in the address, the region,
 * the title, the URL or the description. A village or district the site
 * named that we don't know stays in the address rather than being lost.
 */
export const resolveLocation = (mapped: Record<string, unknown>, url?: string): ResolvedLocation => {
  const rawCity = text(mapped.city);
  const rawAddress = text(mapped.address);
  const rawCountry = text(mapped.country);

  // Where to look, most reliable first.
  const sources = [rawCity, rawAddress, text(mapped.region), text(mapped.title), urlPath(url), text(mapped.description)?.slice(0, 400)]
    .filter((s): s is string => !!s);

  let city = rawCity ? canonicalCity(rawCity) ?? (rawCity.includes(',') ? canonicalCity(rawCity.split(',').pop() as string) : undefined) : undefined;
  let country = rawCountry ? canonicalCountry(rawCountry) ?? rawCountry : undefined;
  for (const s of sources) {
    if (city && country) break;
    const found = findPlaceInText(s);
    city ??= found.city;
    country ??= found.country;
  }
  // Last resort: the site's own country (page language, domain, phone prefix).
  country ??= text(mapped.pageCountry);

  // Keep the site's own place name when we couldn't match it to a known city…
  let address = rawAddress;
  if (!city && rawCity && isPlausiblePlaceName(rawCity.split(',')[0])) city = rawCity.split(',')[0].trim();
  // …and when we could, keep the village / district it named in the address.
  else if (rawCity && city && locationSlug(rawCity) !== locationSlug(city)) {
    const place = rawCity.split(',')[0].trim();
    if (!address) address = place;
    else if (!locationSlug(address).includes(locationSlug(place))) address = `${address}, ${place}`;
  }

  const lat = num(mapped.lat);
  const lng = num(mapped.lng);
  const coords = lat !== undefined && lng !== undefined ? fixSwappedCoordinates(lat, lng) : { lat, lng };
  return { city, country, address, lat: coords.lat, lng: coords.lng };
};

/** Words of buttons and links, never part of a place name. */
const UI_WORDS_RE = /\b(load|more|less|show|hide|view|details?|contact|call|send|read|click|see|all|menu|search|filter|sort|share|print|save|favou?rites?|login|book|request|next|prev(ious)?|back|close|open|map|učitaj|ucitaj|više|vise|prikaži|prikazi|pogledaj|kontakt|pošalji|posalji|pretraga|ngarko|shiko|më|shumë|kerko|kërko|mehr|laden|weiter|plus|voir|altro)\b/i;

/** 1–4 words of letters (any script), spaces, hyphens, apostrophes or dots: "Banjole", "Herceg Novi", "Sv. Filip i Jakov". */
export const isPlausiblePlaceName = (text: string): boolean => {
  const t = text.trim();
  if (t.length < 2 || t.length > 40 || UI_WORDS_RE.test(t)) return false;
  if (!/^[\p{L}][\p{L}\s'’.-]*$/u.test(t)) return false;
  return t.split(/\s+/).length <= 4;
};

/** A street address: letters, at most a short line, not button text. */
const isPlausibleAddress = (text: string): boolean => {
  const t = text.trim();
  return t.length >= 3 && t.length <= 120 && /\p{L}/u.test(t) && !UI_WORDS_RE.test(t);
};

type Loc = { city?: unknown; country?: unknown; address?: unknown };
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/**
 * Keep the location guesses read from a page's layout only when they hold up.
 *
 * - `labelled`: text beside a "Location:" / "Lokacija:" label or in a
 *   city-named element — a city is kept when it is a known city or a
 *   plausible place name (villages like "Banjole" included).
 * - `chips`: any short text in a location-ish element or the page title — a
 *   city is kept only when it is a known city.
 *
 * Countries are kept only when recognised. Fields already set are untouched.
 */
export const acceptLocationGuesses = (target: Record<string, unknown>, labelled: Loc, chips: Loc): void => {
  const known = (v?: string) => (v ? canonicalCity(v) ?? findPlaceInText(v).city : undefined);
  if (!target.city) {
    const l = str(labelled.city);
    const c = str(chips.city);
    const city = known(l) ?? (l && isPlausiblePlaceName(l) ? l : undefined) ?? known(c);
    if (city) target.city = city;
  }
  if (!target.country) {
    const country = [labelled.country, chips.country]
      .map((v) => str(v))
      .map((v) => (v ? canonicalCountry(v) ?? findPlaceInText(v).country : undefined))
      .find(Boolean);
    if (country) target.country = country;
  }
  if (!target.address) {
    const address = [labelled.address, chips.address].map(str).find((v) => v && isPlausibleAddress(v));
    if (address) target.address = address;
  }
};

const LANG_COUNTRY: Record<string, string> = {
  hr: 'Croatia', sq: 'Albania', sr: 'Serbia', bs: 'Bosnia and Herzegovina', mk: 'North Macedonia', bg: 'Bulgaria',
  el: 'Greece', ro: 'Romania', cnr: 'Montenegro', sl: 'Slovenia', hu: 'Hungary', tr: 'Turkey',
};
const TLD_COUNTRY: Record<string, string> = {
  hr: 'Croatia', al: 'Albania', rs: 'Serbia', ba: 'Bosnia and Herzegovina', mk: 'North Macedonia', bg: 'Bulgaria',
  gr: 'Greece', ro: 'Romania', me: 'Montenegro', si: 'Slovenia', xk: 'Kosovo', hu: 'Hungary', cy: 'Cyprus',
};
const PHONE_COUNTRY: Record<string, string> = {
  '385': 'Croatia', '355': 'Albania', '381': 'Serbia', '382': 'Montenegro', '383': 'Kosovo', '386': 'Slovenia',
  '387': 'Bosnia and Herzegovina', '389': 'North Macedonia', '359': 'Bulgaria', '30': 'Greece', '40': 'Romania',
  '36': 'Hungary', '357': 'Cyprus', '90': 'Turkey',
};

/**
 * The country a site is in, from page-wide signals — used only when the
 * listing itself names none: the page language when it's a local one
 * (`lang="hr"`), the country domain (.hr, .al…), then the dialling code of
 * the phone numbers on the page (+385 → Croatia).
 */
export const countryFromPageSignals = (html: string, url?: string): string | undefined => {
  const lang = html.match(/<html[^>]*\slang=["']?([a-z]{2,3})(?:-([a-z]{2}))?/i);
  if (lang) {
    const region = lang[2] ? TLD_COUNTRY[lang[2].toLowerCase()] : undefined;
    const byLang = LANG_COUNTRY[lang[1].toLowerCase()];
    if (region && lang[1].toLowerCase() !== 'en') return region;
    if (byLang) return byLang;
  }
  try {
    const tld = url ? new URL(url).hostname.split('.').pop() : undefined;
    if (tld && TLD_COUNTRY[tld]) return TLD_COUNTRY[tld];
  } catch {
    // ignore bad URL
  }
  const codes = new Map<string, number>();
  for (const m of html.matchAll(/(?:tel:|\+|00)\s?(\d{2,3})[\s.\-/()]*\d/g)) {
    const code = PHONE_COUNTRY[m[1]] ? m[1] : PHONE_COUNTRY[m[1].slice(0, 2)] ? m[1].slice(0, 2) : undefined;
    if (code) codes.set(code, (codes.get(code) ?? 0) + 1);
  }
  const top = [...codes.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? PHONE_COUNTRY[top[0]] : undefined;
};
