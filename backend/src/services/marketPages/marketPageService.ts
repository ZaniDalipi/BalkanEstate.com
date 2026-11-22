/**
 * Data for the "property for sale / for rent in {country | city}" landing
 * pages: the overview of all countries, and one page per country and city
 * with its live listings, price figures and the other cities to look at.
 *
 * The same response feeds the React page visitors see and the HTML the Pages
 * Function serves to crawlers, so both always show the same listings and
 * figures.
 */
import Property from '../../models/Property';
import { MEASURED_ATTRIBUTES, type TypeAttribute } from '../../config/typeAttributes';
import { resolveTotalArea } from '../../config/propertyArea';
import { sanitizeProperty } from '../../utils/responseSanitizer';
import { INDEXABLE_LISTING_EXPR, INDEXABLE_LISTING_FILTER } from '../../utils/indexableListing';
import {
  PROPERTY_LIST_PROJECTION,
  PROPERTY_LIST_SELLER_FIELDS,
  attachAgencyLogos,
} from '../propertyListing/propertyListQuery';
import {
  MARKET_COUNTRIES,
  countryBySlug,
  countryByStoredName,
  countrySpellings,
  groupCities,
  type CityCountRow,
  type MarketCity,
  type MarketCountry,
  type MarketDeal,
  type MarketParams,
} from './marketPlaces';
import { buildMarketStats, isIndexable, type MarketStats, type MarketStatsRow } from './marketStats';

/** Country and city values are matched whatever their case. */
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

/** Listing cards on one page. */
export const MARKET_LISTING_LIMIT = 24;
/** Rows read for the price figures; far above any city's live listings. */
const STATS_ROW_LIMIT = 20_000;
/** Cities shown per country on the overview page. */
export const HUB_CITY_LIMIT = 12;
/** Cities linked from a country page. */
export const COUNTRY_CITY_LIMIT = 60;
/** Other cities linked from a city page. */
export const OTHER_CITY_LIMIT = 12;

/** The listings a market page counts: live, of the page's deal, not hidden. */
export const dealFilter = (deal: MarketDeal) => ({
  status: 'active',
  listingType: deal,
  // Villas wait for an admin; pending and rejected ones are hidden everywhere.
  villaApprovalStatus: { $nin: ['pending', 'rejected'] },
  // Nightly stays live in the villas section, not among homes to rent.
  ...(deal === 'rent' ? { rentPeriod: { $ne: 'daily' } } : {}),
});

export interface MarketPlaceSummary {
  slug: string;
  name: string;
  count: number;
  indexableCount: number;
  /** Enough of our own listings for search engines to index the page. */
  indexable: boolean;
}

export interface MarketCountryRef {
  slug: string;
  name: string;
  code: string;
}

export interface MarketCountrySummary extends MarketPlaceSummary {
  code: string;
  cities: MarketPlaceSummary[];
}

export interface MarketHub {
  deal: MarketDeal;
  countries: MarketCountrySummary[];
  generatedAt: string;
}

export interface MarketPage {
  deal: MarketDeal;
  country: MarketCountryRef;
  city: { slug: string; name: string } | null;
  stats: MarketStats;
  indexable: boolean;
  /** Country page: its cities. City page: the country's other cities. */
  cities: MarketPlaceSummary[];
  /** Listing cards, in the same shape as search results. */
  listings: unknown[];
  generatedAt: string;
}

export type MarketPageResult =
  | { ok: true; page: MarketPage }
  | { ok: false; error: 'unknown-country' }
  | { ok: false; error: 'unknown-city'; country: MarketCountryRef };

interface CountryTree {
  country: MarketCountry;
  cities: MarketCity[];
  /** Every live listing in the country, including ones whose city is not a usable place name. */
  count: number;
  indexableCount: number;
}

const countryRef = (c: MarketCountry): MarketCountryRef => ({ slug: c.slug, name: c.name, code: c.code });

const summary = (place: { slug: string; name: string; count: number; indexableCount: number }): MarketPlaceSummary => ({
  slug: place.slug,
  name: place.name,
  count: place.count,
  indexableCount: place.indexableCount,
  indexable: isIndexable(place.indexableCount),
});

/** Live listings per country and stored city spelling, grouped into city pages. */
async function loadTrees(deal: MarketDeal, countries: readonly MarketCountry[]): Promise<CountryTree[]> {
  type Row = { _id: { country: string; city: string }; count: number; indexableCount: number };
  const rows = await Property.aggregate<Row>([
    { $match: { ...dealFilter(deal), country: { $in: countries.flatMap(countrySpellings) } } },
    {
      $group: {
        _id: { country: '$country', city: '$city' },
        count: { $sum: 1 },
        indexableCount: { $sum: { $cond: [INDEXABLE_LISTING_EXPR, 1, 0] } },
      },
    },
  ]).collation(CASE_INSENSITIVE);

  const byCountry = new Map<string, CityCountRow[]>();
  for (const row of rows) {
    const country = typeof row._id.country === 'string' ? countryByStoredName(row._id.country) : undefined;
    if (!country) continue;
    const list = byCountry.get(country.slug) ?? [];
    list.push({ city: String(row._id.city ?? ''), count: row.count, indexableCount: row.indexableCount });
    byCountry.set(country.slug, list);
  }

  return countries.map((country) => {
    const cityRows = byCountry.get(country.slug) ?? [];
    return {
      country,
      cities: groupCities(cityRows),
      count: cityRows.reduce((sum, r) => sum + r.count, 0),
      indexableCount: cityRows.reduce((sum, r) => sum + r.indexableCount, 0),
    };
  });
}

/** Every country with every city page, for the sitemap and llms.txt. */
export const loadMarketTree = (deal: MarketDeal): Promise<CountryTree[]> => loadTrees(deal, MARKET_COUNTRIES);

/** The overview page: every country with its biggest cities. */
export async function getMarketHub(deal: MarketDeal): Promise<MarketHub> {
  const trees = await loadMarketTree(deal);
  return {
    deal,
    countries: trees.map((tree) => ({
      ...summary({ ...tree.country, count: tree.count, indexableCount: tree.indexableCount }),
      code: tree.country.code,
      cities: tree.cities.slice(0, HUB_CITY_LIMIT).map(summary),
    })),
    generatedAt: new Date().toISOString(),
  };
}

/** Price, area and type of every listing in the area, for the figures. */
async function loadStatsRows(filter: Record<string, unknown>): Promise<MarketStatsRow[]> {
  const areaFields = Object.fromEntries([...MEASURED_ATTRIBUTES].map((field) => [field, 1]));
  type Row = {
    price?: unknown;
    sqft?: unknown;
    propertyType?: unknown;
    rentPeriod?: unknown;
    isNegotiable?: unknown;
    indexable?: unknown;
  } & Partial<Record<TypeAttribute, unknown>>;
  const rows = await Property.aggregate<Row>([
    { $match: filter },
    { $limit: STATS_ROW_LIMIT },
    {
      $project: {
        _id: 0,
        price: 1,
        sqft: 1,
        propertyType: 1,
        rentPeriod: 1,
        isNegotiable: 1,
        ...areaFields,
        indexable: INDEXABLE_LISTING_EXPR,
      },
    },
  ]).collation(CASE_INSENSITIVE);

  return rows.map((row) => ({
    price: typeof row.price === 'number' ? row.price : null,
    area: resolveTotalArea(row.propertyType, row),
    propertyType: typeof row.propertyType === 'string' ? row.propertyType : null,
    rentPeriod: typeof row.rentPeriod === 'string' ? row.rentPeriod : null,
    isNegotiable: row.isNegotiable === true,
    indexable: row.indexable === true,
  }));
}

/** Newest listings in the area, our own (indexable) ones first, as list rows. */
async function loadListings(filter: Record<string, unknown>): Promise<unknown[]> {
  const find = (query: Record<string, unknown>, limit: number) =>
    Property.find(query)
      .select(PROPERTY_LIST_PROJECTION)
      .populate('sellerId', PROPERTY_LIST_SELLER_FIELDS)
      .collation(CASE_INSENSITIVE)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();

  const own = await find({ ...filter, ...INDEXABLE_LISTING_FILTER }, MARKET_LISTING_LIMIT);
  const rest = own.length < MARKET_LISTING_LIMIT
    ? await find({ ...filter, _id: { $nin: own.map((p) => p._id) } }, MARKET_LISTING_LIMIT - own.length)
    : [];
  const listings = [...own, ...rest];
  await attachAgencyLogos(listings);
  return listings.map((p) => sanitizeProperty(p, 'list'));
}

/** One country or city page, or why there is none. */
export async function getMarketPage(params: MarketParams): Promise<MarketPageResult> {
  const country = params.country ? countryBySlug(params.country) : undefined;
  if (!country) return { ok: false, error: 'unknown-country' };

  const [tree] = await loadTrees(params.deal, [country]);
  const city = params.city ? tree.cities.find((c) => c.slug === params.city) : undefined;
  if (params.city && !city) return { ok: false, error: 'unknown-city', country: countryRef(country) };

  const filter = {
    ...dealFilter(params.deal),
    country: { $in: countrySpellings(country) },
    ...(city ? { city: { $in: city.spellings } } : {}),
  };
  const [statsRows, listings] = await Promise.all([loadStatsRows(filter), loadListings(filter)]);

  // Counts come from the grouped totals (exact); the rows only feed the price figures.
  const place = city ?? tree;
  const stats = { ...buildMarketStats(statsRows, params.deal), listingCount: place.count, indexableCount: place.indexableCount };
  const cities = city
    ? tree.cities.filter((c) => c.slug !== city.slug).slice(0, OTHER_CITY_LIMIT)
    : tree.cities.slice(0, COUNTRY_CITY_LIMIT);

  return {
    ok: true,
    page: {
      deal: params.deal,
      country: countryRef(country),
      city: city ? { slug: city.slug, name: city.name } : null,
      stats,
      indexable: isIndexable(place.indexableCount),
      cities: cities.map(summary),
      listings,
      generatedAt: new Date().toISOString(),
    },
  };
}
