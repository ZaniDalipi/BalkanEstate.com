/** Raw data captured from a single scraped property listing. */
export interface ScrapedListing {
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

/** Result returned by an adapter after processing a source URL. */
export interface AdapterResult {
  listings: ScrapedListing[];
  nextPageUrl?: string;
  totalFound?: number;
  errors: string[];
}

/** Contract that every listing adapter must implement. */
export interface IListingAdapter {
  readonly name: string;
  /** Fetch listings from the given source URL and return an AdapterResult. */
  fetchListings(sourceUrl: string): Promise<AdapterResult>;
}
