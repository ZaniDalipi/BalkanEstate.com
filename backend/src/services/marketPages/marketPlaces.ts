/**
 * Places for the "property for sale / for rent in …" landing pages: the ten
 * countries, the URL segment of a city, and the cities a country's listings
 * name — merged so "Tirana" and "Tiranë" are one page, and junk such as
 * "Load more" never becomes one.
 *
 * Pure functions only, so they are unit-tested without a database.
 */
import { canonicalCity, isPlausiblePlaceName } from '../listingAttributes/location';

export type MarketDeal = 'sale' | 'rent';
export const MARKET_DEALS: readonly MarketDeal[] = ['sale', 'rent'];

export interface MarketCountry {
  /** URL segment: /property-for-sale/{slug}. */
  slug: string;
  /** How listings store the country, and the English display name. */
  name: string;
  /** ISO 3166-1 alpha-2 (XK for Kosovo, as used across the site). */
  code: string;
  /** Other spellings found on stored listings, matched case-insensitively. */
  aliases: readonly string[];
}

export const MARKET_COUNTRIES: readonly MarketCountry[] = [
  { slug: 'albania', name: 'Albania', code: 'AL', aliases: ['Shqipëri', 'Shqiperia'] },
  { slug: 'bosnia-and-herzegovina', name: 'Bosnia and Herzegovina', code: 'BA', aliases: ['Bosnia & Herzegovina', 'Bosnia', 'BiH', 'Bosna i Hercegovina'] },
  { slug: 'bulgaria', name: 'Bulgaria', code: 'BG', aliases: ['България'] },
  { slug: 'croatia', name: 'Croatia', code: 'HR', aliases: ['Hrvatska'] },
  { slug: 'greece', name: 'Greece', code: 'GR', aliases: ['Ελλάδα', 'Hellas'] },
  { slug: 'kosovo', name: 'Kosovo', code: 'XK', aliases: ['Kosova'] },
  { slug: 'montenegro', name: 'Montenegro', code: 'ME', aliases: ['Crna Gora'] },
  { slug: 'north-macedonia', name: 'North Macedonia', code: 'MK', aliases: ['Macedonia', 'Republic of North Macedonia', 'Северна Македонија'] },
  { slug: 'romania', name: 'Romania', code: 'RO', aliases: ['România'] },
  { slug: 'serbia', name: 'Serbia', code: 'RS', aliases: ['Srbija', 'Србија'] },
];

/** First path segment of each deal's pages (after the language prefix). */
export const MARKET_PATH_SEGMENT: Record<MarketDeal, string> = {
  sale: 'property-for-sale',
  rent: 'property-for-rent',
};

/** Language-less site path: "/property-for-sale", "/property-for-sale/albania/tirana". */
export const marketPagePath = (deal: MarketDeal, country?: string, city?: string): string =>
  `/${[MARKET_PATH_SEGMENT[deal], country, country ? city : undefined]
    .filter((s): s is string => !!s)
    .map(encodeURIComponent)
    .join('/')}`;

/** Every stored spelling of a country, for a case-insensitive `$in` match. */
export const countrySpellings = (country: MarketCountry): string[] => [country.name, ...country.aliases];

export const countryBySlug = (slug: string): MarketCountry | undefined =>
  MARKET_COUNTRIES.find((c) => c.slug === slug);

/** The market country a stored country value belongs to, whatever its case or spelling. */
export const countryByStoredName = (stored: string): MarketCountry | undefined => {
  const key = stored.trim().toLowerCase();
  return MARKET_COUNTRIES.find((c) => countrySpellings(c).some((s) => s.toLowerCase() === key));
};

/** Letters NFD does not split into base + accent. */
const SPECIAL_LETTERS: Record<string, string> = { đ: 'dj', ł: 'l', ß: 'ss', ø: 'o', æ: 'ae', ı: 'i', þ: 'th' };

/**
 * URL segment for a place name: accents removed, lower case, words joined by
 * hyphens. "Novi Sad" → "novi-sad", "Durrës" → "durres", "Đakovica" →
 * "djakovica". Cyrillic and Greek letters are kept (the browser encodes them).
 */
export const placeSlug = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[đłßøæıþ]/g, (ch) => SPECIAL_LETTERS[ch] ?? ch)
    .replace(/[^\p{L}\d]+/gu, '-')
    .replace(/^-+|-+$/g, '');

export const MAX_PLACE_SLUG_LENGTH = 80;
const PLACE_SLUG_RE = /^[\p{Ll}\p{Lo}\d]+(?:-[\p{Ll}\p{Lo}\d]+)*$/u;

export const isPlaceSlug = (value: string): boolean =>
  value.length > 0 && value.length <= MAX_PLACE_SLUG_LENGTH && PLACE_SLUG_RE.test(value);

export type MarketParams = { deal: MarketDeal; country?: string; city?: string };
export type MarketParamsResult = { ok: true; value: MarketParams } | { ok: false; error: string };

/**
 * Validate the route parameters of a market page request. Only the shape is
 * checked here; whether the country and city exist is the service's question.
 */
export const parseMarketParams = (raw: { deal?: unknown; country?: unknown; city?: unknown }): MarketParamsResult => {
  if (raw.deal !== 'sale' && raw.deal !== 'rent') return { ok: false, error: 'deal must be "sale" or "rent"' };
  const country = typeof raw.country === 'string' ? raw.country.trim().toLowerCase() : undefined;
  const city = typeof raw.city === 'string' ? raw.city.trim().toLowerCase() : undefined;
  if (raw.country !== undefined && (!country || !isPlaceSlug(country))) return { ok: false, error: 'Invalid country' };
  if (raw.city !== undefined && (!city || !isPlaceSlug(city))) return { ok: false, error: 'Invalid city' };
  if (city && !country) return { ok: false, error: 'A city needs a country' };
  return { ok: true, value: { deal: raw.deal, ...(country ? { country } : {}), ...(city ? { city } : {}) } };
};

/** One row of "listings per stored city spelling" from the database. */
export interface CityCountRow {
  city: string;
  count: number;
  /** Listings Google may index (our own, with a description). */
  indexableCount: number;
}

export interface MarketCity {
  slug: string;
  name: string;
  /** The stored spellings this page gathers, for the listing query. */
  spellings: string[];
  count: number;
  indexableCount: number;
}

/**
 * Merge a country's per-spelling counts into one entry per city page.
 *
 * Spellings that name the same city ("Tiranë", "tirana", "TIRANA") share a
 * slug and add up; the page is named after the canonical spelling when one is
 * known, otherwise after the spelling most listings use. Values that are not a
 * place name (button text, addresses, numbers) are left out.
 */
export const groupCities = (rows: readonly CityCountRow[]): MarketCity[] => {
  type NameVote = { name: string; canonical: boolean; count: number };
  type Group = Omit<MarketCity, 'name'> & { votes: Map<string, NameVote> };
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const stored = typeof row.city === 'string' ? row.city.trim() : '';
    if (!stored || !isPlausiblePlaceName(stored) || row.count <= 0) continue;
    const canonical = canonicalCity(stored);
    const slug = placeSlug(canonical ?? stored);
    if (!isPlaceSlug(slug)) continue;

    const group: Group = groups.get(slug) ?? { slug, spellings: [], count: 0, indexableCount: 0, votes: new Map() };
    group.spellings.push(row.city);
    group.count += row.count;
    group.indexableCount += row.indexableCount;
    const name = canonical ?? stored;
    const vote = group.votes.get(name) ?? { name, canonical: !!canonical, count: 0 };
    vote.count += row.count;
    group.votes.set(name, vote);
    groups.set(slug, group);
  }

  // A canonical spelling wins over free-typed ones, then the most used.
  const bestName = (votes: Map<string, NameVote>): string =>
    [...votes.values()].sort(
      (a, b) => Number(b.canonical) - Number(a.canonical) || b.count - a.count || a.name.localeCompare(b.name),
    )[0].name;

  return [...groups.values()]
    .map(({ votes, ...city }) => ({ ...city, name: bestName(votes) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};
