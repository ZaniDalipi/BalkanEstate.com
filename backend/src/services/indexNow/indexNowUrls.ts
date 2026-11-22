/**
 * Which URLs to announce when a listing changes: the listing's page in every
 * language, and the country and city landing pages whose counts and prices
 * it feeds. Pure, so it is tested without a database or network.
 */
import { SUPPORTED_LANG_CODES } from '../../config/ogConstants';
import { canonicalCity } from '../listingAttributes/location';
import { countryByStoredName, isPlaceSlug, marketPagePath, placeSlug, type MarketDeal } from '../marketPages/marketPlaces';

export interface ChangedListing {
  /** The encoded id the site uses in URLs. */
  encodedId: string;
  listingType?: string | null;
  country?: string | null;
  city?: string | null;
}

/** A page path (`/agents/x`) in every language: /{lang}/agents/x. */
export const pageUrls = (path: string, baseUrl: string): string[] =>
  SUPPORTED_LANG_CODES.map((lang) => `${baseUrl}/${lang}${path}`);

/** /{lang}/property/{id} in every language. */
export const listingUrls = (encodedId: string, baseUrl: string): string[] =>
  pageUrls(`/property/${encodeURIComponent(encodedId)}`, baseUrl);

/** An agency's page; its slug is `country/name`, each segment encoded (as in the sitemap). */
export const agencyPagePath = (slug: string): string =>
  `/agencies/${slug.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;

/** An agent's page, by the public agent id the app links to. */
export const agentPagePath = (agentId: string): string => `/agents/${encodeURIComponent(agentId)}`;

/** A residence (development) page, by its slug. */
export const developmentPagePath = (slug: string): string => `/developments/${encodeURIComponent(slug)}`;

/** The country and city market pages (English) a listing appears on, if it is in one of our countries. */
export const marketUrlsFor = (listing: Omit<ChangedListing, 'encodedId'>, baseUrl: string): string[] => {
  const country = listing.country ? countryByStoredName(listing.country) : undefined;
  if (!country) return [];
  const deal: MarketDeal = listing.listingType === 'rent' ? 'rent' : 'sale';
  const urls = [`${baseUrl}/en${marketPagePath(deal, country.slug)}`];
  const cityName = listing.city?.trim();
  if (cityName) {
    const slug = placeSlug(canonicalCity(cityName) ?? cityName);
    if (isPlaceSlug(slug)) urls.push(`${baseUrl}/en${marketPagePath(deal, country.slug, slug)}`);
  }
  return urls;
};

export const urlsForChangedListing = (listing: ChangedListing, baseUrl: string): string[] => [
  ...listingUrls(listing.encodedId, baseUrl),
  ...marketUrlsFor(listing, baseUrl),
];
