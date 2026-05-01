import type { IListingSource, ListingAdapterType } from '../../models/ListingSource';
import { RssFeedAdapter } from './RssFeedAdapter';
import { JsonFeedAdapter } from './JsonFeedAdapter';
import { XmlFeedAdapter } from './XmlFeedAdapter';
import { JsonLdAdapter } from './JsonLdAdapter';
import { HtmlScrapeAdapter } from './HtmlScrapeAdapter';
import { CustomApiAdapter } from './CustomApiAdapter';
import type { SourceAdapter } from './types';

const adapters: Record<ListingAdapterType, SourceAdapter> = {
  rss: new RssFeedAdapter(),
  jsonFeed: new JsonFeedAdapter(),
  xmlFeed: new XmlFeedAdapter(),
  jsonLd: new JsonLdAdapter(),
  htmlScrape: new HtmlScrapeAdapter(),
  customApi: new CustomApiAdapter(),
};

export const getAdapter = (source: Pick<IListingSource, 'adapterType' | 'slug'>): SourceAdapter => {
  const adapter = adapters[source.adapterType];
  if (!adapter) throw new Error(`Unknown adapter type "${source.adapterType}" for source ${source.slug}`);
  return adapter;
};

export type { RawListing, SourceAdapter, FetchOptions } from './types';
