import type { IListingSource, ListingAdapterType } from '../../models/ListingSource';
import { RssFeedAdapter } from './RssFeedAdapter';
import { JsonFeedAdapter } from './JsonFeedAdapter';
import { XmlFeedAdapter } from './XmlFeedAdapter';
import { JsonLdAdapter } from './JsonLdAdapter';
import { HtmlScrapeAdapter } from './HtmlScrapeAdapter';
import { CustomApiAdapter } from './CustomApiAdapter';
import { ListingSourceConfigError } from './configUtils';
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
  if (!adapter) {
    throw new ListingSourceConfigError(
      `Feed "${source.slug}" uses an unknown import type ("${source.adapterType}"). ` +
        'Remove the feed and add it again.'
    );
  }
  return adapter;
};

export type { RawListing, SourceAdapter, FetchOptions } from './types';
