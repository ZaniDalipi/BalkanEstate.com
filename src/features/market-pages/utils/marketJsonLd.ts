/**
 * JSON-LD for a market landing page: the page as a CollectionPage whose main
 * entity is the list of listings on it, and its breadcrumb trail. Shared by
 * the React page and the crawler HTML (relative imports only).
 */
import type { MarketListingRow } from '../types';

export const MARKET_SITE_URL = 'https://balkanestateai.com';

/** hreflang / inLanguage value of a URL language ("me" is the Montenegro prefix, the tag is sr-ME). */
export const languageTag = (lang: string): string => (lang === 'me' ? 'sr-ME' : lang);

/** Absolute URL of a language-less app path. */
export const siteUrl = (lang: string, path: string): string => `${MARKET_SITE_URL}/${lang}${path === '/' ? '' : path}`;

export const listingPath = (listing: MarketListingRow): string | null => {
  const id = listing.id || listing._id;
  return id ? `/property/${encodeURIComponent(String(id))}` : null;
};

interface CollectionInput {
  lang: string;
  path: string;
  name: string;
  description: string;
  listings: readonly MarketListingRow[];
  total: number;
}

export const marketCollectionJsonLd = ({ lang, path, name, description, listings, total }: CollectionInput) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${siteUrl(lang, path)}#webpage`,
  url: siteUrl(lang, path),
  name,
  description,
  inLanguage: languageTag(lang),
  isPartOf: { '@id': `${MARKET_SITE_URL}/#website` },
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: total,
    itemListElement: listings
      .map((listing) => ({ listing, path: listingPath(listing) }))
      .filter((item): item is { listing: MarketListingRow; path: string } => item.path !== null)
      .map(({ listing, path: itemPath }, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: siteUrl(lang, itemPath),
        ...(listing.title ? { name: listing.title } : {}),
      })),
  },
});

export const marketBreadcrumbJsonLd = (lang: string, items: ReadonlyArray<{ name: string; path?: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    ...(item.path ? { item: siteUrl(lang, item.path) } : {}),
  })),
});
