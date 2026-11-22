/**
 * The figures on a "property for sale / for rent in …" page: how many
 * listings, the typical price range, the median price and price per m², and
 * whether the page has enough of our own listings to be worth indexing.
 *
 * Pure functions over plain rows, so they are unit-tested without a database.
 * Prices are asking prices from live listings, and the page says so.
 */
import { basisFor, median, normalizePrice, roundMoney } from '../areaPricesService';
import type { MarketDeal } from './marketPlaces';

/**
 * Our own listings (not imported, with a description) a page needs before
 * search engines are asked to index it. Below this the page still works for
 * visitors but is `noindex` and left out of the sitemap: a page with two
 * listings is the thin, templated content search engines demote.
 */
export const MIN_INDEXABLE_LISTINGS = 5;

/** Priced listings needed before a median or a range is shown at all. */
export const MIN_PRICE_SAMPLE = 3;

/** Smaller "areas" are parking spaces, storage rooms or typos, not homes. */
export const MIN_AREA_SQM = 15;

export interface MarketStatsRow {
  price?: number | null;
  /** Total area in m², already resolved from the type's breakdown. */
  area?: number | null;
  propertyType?: string | null;
  rentPeriod?: string | null;
  /** "Price on request": the price is a placeholder, not an asking price. */
  isNegotiable?: boolean | null;
  indexable: boolean;
}

export interface MarketStats {
  listingCount: number;
  indexableCount: number;
  /** Listings the price figures are based on. */
  pricedCount: number;
  /** 10th percentile: most listings cost more than this. */
  priceLow: number | null;
  priceMedian: number | null;
  /** 90th percentile: most listings cost less than this. */
  priceHigh: number | null;
  pricePerSqmMedian: number | null;
  /** Listings the price per m² is based on. */
  pricePerSqmCount: number;
  /** Listing count per property type, largest first. */
  typeCounts: Array<{ type: string; count: number }>;
}

/** Linear-interpolated percentile of an ascending list, or null when empty. */
export const percentile = (sorted: readonly number[], p: number): number | null => {
  if (sorted.length === 0) return null;
  const clamped = Math.min(1, Math.max(0, p));
  const rank = clamped * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (rank - lower);
};

const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** The row's asking price in the page's unit (a weekly rent becomes monthly), or null. */
export const askingPrice = (row: MarketStatsRow, deal: MarketDeal): number | null => {
  if (row.isNegotiable || !isPositive(row.price)) return null;
  if (deal === 'rent' && row.rentPeriod === 'daily') return null;
  return normalizePrice(row.price, row.rentPeriod ?? undefined, basisFor(deal));
};

const rounded = (value: number | null): number | null => (value === null ? null : roundMoney(value));

export const buildMarketStats = (rows: readonly MarketStatsRow[], deal: MarketDeal): MarketStats => {
  const prices: number[] = [];
  const perSqm: number[] = [];
  const types = new Map<string, number>();

  for (const row of rows) {
    const type = row.propertyType?.trim() || 'other';
    types.set(type, (types.get(type) ?? 0) + 1);

    const price = askingPrice(row, deal);
    if (price === null) continue;
    prices.push(price);
    if (isPositive(row.area) && row.area >= MIN_AREA_SQM) perSqm.push(price / row.area);
  }

  prices.sort((a, b) => a - b);
  const enoughPrices = prices.length >= MIN_PRICE_SAMPLE;
  const enoughAreas = perSqm.length >= MIN_PRICE_SAMPLE;

  return {
    listingCount: rows.length,
    indexableCount: rows.filter((r) => r.indexable).length,
    pricedCount: prices.length,
    priceLow: enoughPrices ? rounded(percentile(prices, 0.1)) : null,
    priceMedian: enoughPrices ? rounded(median(prices)) : null,
    priceHigh: enoughPrices ? rounded(percentile(prices, 0.9)) : null,
    pricePerSqmMedian: enoughAreas ? rounded(median(perSqm)) : null,
    pricePerSqmCount: perSqm.length,
    typeCounts: [...types.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
  };
};

export const isIndexable = (indexableCount: number): boolean => indexableCount >= MIN_INDEXABLE_LISTINGS;
