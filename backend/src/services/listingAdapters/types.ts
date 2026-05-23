import type { IListingSource } from '../../models/ListingSource';

/** Options for fetching a listing page — choose between plain HTTP or a headless browser. */
export interface FetchOptions {
  useBrowser?: boolean;
  timeoutMs?: number;
  waitForSelector?: string;
  headers?: Record<string, string>;
  /** Maximum number of listings to fetch in one run. */
  limit?: number;
  /** Called after each listing is fetched, with the running total and the listing itself. */
  onProgress?: (count: number, listing?: RawListing) => void;
}

/** Raw data captured from a single scraped property listing. */
export interface RawListing {
  id: string;
  /** Canonical URL used by the normalizer (same as sourceUrl). */
  url?: string;
  sourceUrl: string;
  sourceName: string;
  title: string;
  price?: number;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  imageUrls: string[];
  beds?: number;
  baths?: number;
  sqft?: number;
  lat?: number;
  lng?: number;
  /**
   * Raw payload from the detail page — may be an HTML string or a parsed JSON object
   * depending on the adapter. Use `unknown` so adapters can store either form.
   */
  raw?: unknown;
  /** @deprecated Use raw */
  rawHtml?: string;
  scrapedAt: Date;
}

/** @deprecated Use RawListing */
export type ScrapedListing = RawListing;

/** Result returned by an adapter after processing a source URL. */
export interface AdapterResult {
  listings: RawListing[];
  nextPageUrl?: string;
  totalFound?: number;
  errors: string[];
}

/** Contract that every listing source adapter must implement. */
export interface SourceAdapter {
  /** Adapter identifier — does not have to be readonly. */
  name: string;
  /** Fetch listings for the given source configuration. Returns the raw listing array. */
  fetchListings(source: IListingSource, options?: FetchOptions): Promise<RawListing[]>;
}

/** @deprecated Use SourceAdapter */
export type IListingAdapter = SourceAdapter;
