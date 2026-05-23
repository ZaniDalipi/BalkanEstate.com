/** Options for fetching a listing page — choose between plain HTTP or a headless browser. */
export interface FetchOptions {
  useBrowser?: boolean;
  timeoutMs?: number;
  waitForSelector?: string;
  headers?: Record<string, string>;
}

/** Raw data captured from a single scraped property listing. */
export interface RawListing {
  id: string;
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
  readonly name: string;
  fetchListings(sourceUrl: string, options?: FetchOptions): Promise<AdapterResult>;
}

/** @deprecated Use SourceAdapter */
export type IListingAdapter = SourceAdapter;
