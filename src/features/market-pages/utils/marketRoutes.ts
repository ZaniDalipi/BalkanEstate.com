/**
 * URLs of the market landing pages, without the language prefix:
 *
 *   /property-for-sale                    every country
 *   /property-for-sale/albania            one country
 *   /property-for-sale/albania/tirana     one city
 *   /property-for-rent/…                  the same for rentals
 *
 * Relative imports only: the Pages Function in /functions imports this file
 * and does not know the app's `@/` alias. Mirrors
 * backend/src/services/marketPages/marketPlaces.ts.
 */
import type { MarketDeal } from '../types';
import { MARKET_COUNTRY_SLUGS, marketCountrySlug } from './marketCountries.js';

export const MARKET_SEGMENT: Record<MarketDeal, string> = {
  sale: 'property-for-sale',
  rent: 'property-for-rent',
};

export const otherDeal = (deal: MarketDeal): MarketDeal => (deal === 'sale' ? 'rent' : 'sale');

/** Language-less path of a market page; a city is only used with its country. */
export const marketPath = (deal: MarketDeal, country?: string, city?: string): string =>
  `/${[MARKET_SEGMENT[deal], country, country ? city : undefined]
    .filter((segment): segment is string => !!segment)
    .map(encodeURIComponent)
    .join('/')}`;

export { marketCountrySlug, MARKET_COUNTRY_SLUGS };

export const isMarketCountrySlug = (slug: string): boolean => MARKET_COUNTRY_SLUGS.includes(slug);

/** The `common:countries.*` key of a market country slug (they differ for one country). */
export const countryNameKey = (slug: string): string =>
  slug === 'bosnia-and-herzegovina' ? 'bosnia-herzegovina' : slug;

/**
 * Same shape the API accepts: lower-case letters (any script), digits and
 * single hyphens, at most 80 characters. Anything else is not a page.
 */
export const isMarketSlug = (value: string | undefined): value is string =>
  !!value && value.length <= 80 && /^[\p{Ll}\p{Lo}\d]+(?:-[\p{Ll}\p{Lo}\d]+)*$/u.test(value);
