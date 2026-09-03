/**
 * How a place is written on screen.
 *
 * One shape, everywhere in the app, and it is the one Google Maps uses:
 *
 *     <place>, <city>, <country>
 *
 *     Himarë, Vlorë, Albania
 *     Krani, Resen, North Macedonia
 *     Bečići, Budva, Montenegro
 *
 * Three parts at most, never four. The levels a geocoder is fond of — county,
 * district, region, state, postcode — are dropped outright: "Himarë, Vlorë
 * County, 9425, Albania" is the same place written the way a database writes
 * it, not the way a person does.
 *
 * Two rules make it work:
 *
 *   1. **The city is the city the user chose**, not the administrative parent
 *      the geocoder reports. Someone listing in Vlorë who drops a pin on
 *      Himarë — 45km down the coast, but inside Vlorë's area — gets
 *      "Himarë, Vlorë, Albania", because that listing's city *is* Vlorë and
 *      the address has to agree with it. Callers pass what they know as
 *      `context`; it wins.
 *
 *   2. **A place is written the way it is written locally.** The app stores
 *      ASCII ("Vlore", "Becici") because that is what listings and URLs
 *      carry, and search folds both spellings to one key, so the diacritics
 *      cost nothing and are what makes the list look like it was written by
 *      someone who lives there.
 */

import { normalizePlaceName } from './normalize';
import { BALKAN_LOCALITIES } from './localities';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import CITY_SPELLING_DATA from './placeSpellings.json';

/**
 * Local spellings of the cities the app stores in ASCII, in
 * `placeSpellings.json`.
 *
 * Data rather than code because it is not only this app that needs it: the
 * address migration (`backend/src/scripts/migratePropertyAddresses.ts`) reads
 * the same file, and a table that lived in two places would eventually spell
 * one city two ways.
 *
 * Only diacritics are restored — never a different name. "Belgrade" stays
 * "Belgrade" and "Tirana" stays "Tirana", because swapping in "Beograd" or
 * "Tiranë" would be translating rather than spelling, and the app's own i18n
 * layer is what decides which language a user reads. A test holds the file to
 * that rule.
 */
const CITY_SPELLINGS: Record<string, string> = CITY_SPELLING_DATA;

/**
 * Every name the app knows how to spell, keyed by its folded form: the city
 * spellings above, plus every locality in the gazetteer (which is already
 * written locally) and every country.
 */
const SPELLING_BY_KEY = new Map<string, string>();

for (const country of BALKAN_LOCATIONS) {
  SPELLING_BY_KEY.set(normalizePlaceName(country.name), country.name);
  for (const city of country.cities) {
    SPELLING_BY_KEY.set(normalizePlaceName(city.name), CITY_SPELLINGS[city.name] ?? city.name);
  }
}

for (const locality of BALKAN_LOCALITIES) {
  const key = normalizePlaceName(locality.name);
  // A gazetteer name never overwrites a city's — "Bar" the Montenegrin city
  // outranks any village of the same name.
  if (!SPELLING_BY_KEY.has(key)) SPELLING_BY_KEY.set(key, locality.name);
  for (const alias of locality.aliases ?? []) {
    const aliasKey = normalizePlaceName(alias);
    if (!SPELLING_BY_KEY.has(aliasKey)) SPELLING_BY_KEY.set(aliasKey, locality.name);
  }
}

/**
 * Administrative dressing that wraps a name without adding to it: Nominatim
 * returns Himarë's municipality as "Bashkia Himarë" and Budva's as "Opština
 * Budva". Stripped from both the label and the key, so the wrapper never
 * reaches the screen and never hides the fact that it is a repeat.
 */
const ADMIN_PREFIXES =
  /^(?:bashkia|komuna|opstina|opština|општина|община|obshtina|obshtina|grad|gradska\s+opcina|gradska\s+općina|municipality\s+of|municipiul|orașul|orasul|comuna|city\s+of|dimos|δήμος)\s+/i;

const ADMIN_SUFFIXES =
  /\s+(?:municipality|opstina|opština|општина|komuna|bashkia|city|town|village)$/i;

/**
 * Levels between a city and its country — county, district, region and their
 * local names. A structured address lets these be skipped by key; a bare
 * `display_name` only offers the words, so they are recognised and dropped
 * here.
 */
const ADMIN_LEVELS =
  /\b(?:county|district|region|prefecture|province|state|okrug|oblast|qark(?:u)?|rreth(?:i)?|jude[țt](?:ul)?|voivodeship|regional\s+unit|administrative)\b/i;

/** One address component, cleaned down to the bare place name. */
const cleanComponent = (part?: string | null): string => {
  const trimmed = part?.trim();
  if (!trimmed) return '';

  // Postcodes, plus codes and bare numbers are never a place name.
  if (/^[\d\s-]+$/.test(trimmed)) return '';
  if (/^[A-Z0-9]{4}\+[A-Z0-9]{2,}$/i.test(trimmed)) return '';

  const stripped = trimmed.replace(ADMIN_PREFIXES, '').replace(ADMIN_SUFFIXES, '').trim();
  return canonicalPlaceName(stripped || trimmed);
};

/**
 * The local spelling of `name`, or `name` itself when the app holds no
 * spelling for it.
 *
 * Aliases resolve to the canonical name, so a listing filed under "Becici"
 * and one filed under "Bečići" are shown identically.
 */
export const canonicalPlaceName = (name?: string | null): string => {
  const trimmed = name?.trim();
  if (!trimmed) return '';
  return SPELLING_BY_KEY.get(normalizePlaceName(trimmed)) ?? trimmed;
};

/** True when both strings name the same place, whatever the spelling. */
export const isSamePlace = (a?: string | null, b?: string | null): boolean => {
  const left = normalizePlaceName(a ?? '');
  const right = normalizePlaceName(b ?? '');
  return left.length > 0 && left === right;
};

export interface PlaceLabel {
  /** The specific name — the bold first line of a suggestion. */
  primary: string;
  /** `city, country`; either half may be absent. */
  secondary: string;
  /** `<place>, <city>, <country>` — the address, and what a search box holds. */
  full: string;
}

/** The three levels a place is written with. */
export interface PlaceParts {
  /** The specific place: a village, suburb, street, or the city itself. */
  name?: string | null;
  city?: string | null;
  country?: string | null;
}

/**
 * The city and country the caller already knows the place belongs to —
 * typically the ones chosen on the form the user is filling in.
 *
 * These win over anything a geocoder reports, so a listing's address always
 * agrees with the city the listing is filed under.
 */
export interface PlaceContext {
  city?: string | null;
  country?: string | null;
}

export interface PlaceLabelOptions {
  context?: PlaceContext;
}

const EMPTY_LABEL: PlaceLabel = { primary: '', secondary: '', full: '' };

/**
 * Write a place as `<place>, <city>, <country>`.
 *
 * A level that repeats the one before it is dropped rather than said twice,
 * so a city writes itself as "Budva, Montenegro" and a country as
 * "Montenegro".
 */
export const formatPlaceLabel = (
  parts: PlaceParts,
  { context }: PlaceLabelOptions = {}
): PlaceLabel => {
  const name = cleanComponent(parts.name);
  const city = cleanComponent(context?.city ?? parts.city);
  const country = cleanComponent(context?.country ?? parts.country);

  const primary = name || city || country;
  if (!primary) return EMPTY_LABEL;

  const rest = [city, country].filter(
    (part, index, all) =>
      part &&
      !isSamePlace(part, primary) &&
      all.findIndex((other) => isSamePlace(other, part)) === index
  );

  const secondary = rest.join(', ');
  return { primary, secondary, full: [primary, secondary].filter(Boolean).join(', ') };
};

/** Label for a place the app holds structurally: a locality, city or country. */
export const formatPlace = (place: PlaceParts, options?: PlaceLabelOptions): PlaceLabel =>
  formatPlaceLabel(place, options);

/** A city, written for display: `"Budva, Montenegro"`. */
export const formatCityPlace = (city?: string | null, country?: string | null): PlaceLabel =>
  formatPlaceLabel({ city, country });

/** Label for a listing: its address, then the city and country it is filed under. */
export const formatPropertyPlace = (property: {
  address?: string | null;
  city?: string | null;
  country?: string | null;
}): PlaceLabel =>
  formatPlaceLabel({ name: property.address, city: property.city, country: property.country });

/**
 * Address components a geocoder returns, in the shape Nominatim uses.
 * Everything above the city — county, state, region — is deliberately absent:
 * this format has no room for it.
 */
export interface GeocodedAddress {
  road?: string;
  street?: string;
  suburb?: string;
  neighbourhood?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export interface GeocodedPlace {
  display_name?: string;
  name?: string;
  address?: GeocodedAddress | null;
}

/**
 * Most specific first. The first of these that the geocoder filled in is the
 * place; the first *settlement* below it that is a different place is the
 * city.
 */
const NAME_LADDER: (keyof GeocodedAddress)[] = [
  'road', 'street', 'neighbourhood', 'suburb', 'hamlet', 'village', 'town', 'city',
];

const CITY_LADDER: (keyof GeocodedAddress)[] = ['city', 'town', 'municipality', 'village'];

/**
 * Write a geocoder result as `<place>, <city>, <country>`.
 *
 * The structured address is used when there is one, because each level is
 * named and the ones this format has no room for can be left out by name
 * rather than guessed at by counting commas. Without it, `display_name` is
 * read as "most specific, …, country" and the middle is discarded.
 *
 * Krani, a village in Resen municipality, comes back from Nominatim as
 * `village: "Krani", municipality: "Resen", county: "Resen Municipality",
 * country: "North Macedonia"` and is written "Krani, Resen, North Macedonia".
 */
export const formatGeocodedPlace = (
  result: GeocodedPlace,
  { context }: PlaceLabelOptions = {}
): PlaceLabel => {
  const address = result.address;

  if (address) {
    const name = result.name?.trim() || NAME_LADDER.map((key) => address[key]).find(Boolean) || '';

    const city = CITY_LADDER.map((key) => address[key]).find(
      (value) => value && !isSamePlace(cleanComponent(value), cleanComponent(name))
    );

    return formatPlaceLabel({ name, city, country: address.country }, { context });
  }

  // No structured address. `display_name` runs most-specific to country, so
  // the first component is the place and the last is the country; between
  // them sit the levels this format has no room for, which are dropped by
  // name before the nearest surviving one is taken as the city.
  const components = (result.display_name ?? result.name ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !ADMIN_LEVELS.test(part) && cleanComponent(part));

  if (components.length === 0) return EMPTY_LABEL;

  const [name, ...rest] = components;
  const country = rest.length > 0 ? rest[rest.length - 1] : undefined;
  // The component directly above the place is its nearest parent, which is
  // the city; a repeat of the place's own name is dropped by the formatter.
  const city = rest.length > 1 ? rest[0] : undefined;

  return formatPlaceLabel({ name, city, country }, { context });
};

/**
 * What goes into a search box, an address field, or a listing's address when
 * a suggestion is picked: the whole label, because the whole label *is* the
 * address. One format everywhere means the text a user is left looking at is
 * the text the app searched and the text it will store.
 */
export const placeSearchValue = (label: PlaceLabel): string => label.full;
