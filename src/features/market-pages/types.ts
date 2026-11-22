/**
 * The "property for sale / for rent in {country | city}" landing pages, as
 * the API returns them (GET /api/market-pages/:deal[/:country[/:city]]).
 *
 * Plain types with no imports: the Pages Function that renders these pages
 * for crawlers (functions/_market-pages.ts) uses them too.
 */

export type MarketDeal = 'sale' | 'rent';

export interface MarketStats {
  listingCount: number;
  /** Our own listings with a description: what search engines may index. */
  indexableCount: number;
  pricedCount: number;
  /** 10th percentile of asking prices (monthly rents for `rent`). */
  priceLow: number | null;
  priceMedian: number | null;
  /** 90th percentile. */
  priceHigh: number | null;
  pricePerSqmMedian: number | null;
  pricePerSqmCount: number;
  typeCounts: Array<{ type: string; count: number }>;
}

export interface MarketPlaceSummary {
  slug: string;
  name: string;
  count: number;
  indexableCount: number;
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

/** A listing card row, sanitised by the API exactly like a search result. */
export interface MarketListingRow {
  id?: string;
  _id?: string;
  title?: string;
  price?: number;
  isNegotiable?: boolean;
  sqft?: number;
  beds?: number;
  baths?: number;
  address?: string;
  city?: string;
  country?: string;
  propertyType?: string;
  listingType?: string;
  rentPeriod?: string;
  images?: Array<{ url: string; tag?: string }>;
  imageUrl?: string;
  source?: string;
  [field: string]: unknown;
}

export interface MarketPageData {
  deal: MarketDeal;
  country: MarketCountryRef;
  city: { slug: string; name: string } | null;
  stats: MarketStats;
  /** Enough of our own listings to ask search engines to index the page. */
  indexable: boolean;
  /** Country page: its cities. City page: the country's other cities. */
  cities: MarketPlaceSummary[];
  listings: MarketListingRow[];
  generatedAt: string;
}

/** A page, or why there is none (the API's 404 answers). */
export type MarketPageResult =
  | { status: 'found'; page: MarketPageData }
  | { status: 'unknown-country' }
  | { status: 'unknown-city'; country: MarketCountryRef };
