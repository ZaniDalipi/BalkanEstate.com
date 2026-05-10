import type { IListingSource, ListingAdapterType } from '../../models/ListingSource';

/**
 * Universal raw-listing shape returned by every adapter.
 * `id` is the source-side identifier used to dedupe via the
 * `(source, sourceListingId)` unique index on Property.
 * `raw` is the full, un-normalized payload — the normalizer
 * applies `source.fieldMap` to it.
 */
export interface RawListing {
  id: string;
  url?: string;
  raw: Record<string, unknown>;
}

export interface FetchOptions {
  since?: Date;
  /** Max number of listings to return in a single run (safety cap). */
  limit?: number;
  /**
   * Called during long-running fetches so the ingest service can emit
   * intermediate socket progress events. `discovered` = total URLs found so
   * far; `detailsFetched` = how many detail pages have been downloaded.
   */
  onProgress?: (discovered: number, detailsFetched: number) => void;
}

export interface SourceAdapter {
  readonly type: ListingAdapterType;
  fetchListings(source: IListingSource, options?: FetchOptions): Promise<RawListing[]>;
  fetchListing?(id: string, source: IListingSource): Promise<RawListing | null>;
}

export type AdapterFactory = (source: IListingSource) => SourceAdapter;
