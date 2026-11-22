/**
 * Checks on what the market pages API returns, at the point it enters the
 * app: a page with the fields the screen reads, or the 404 answer that says
 * which place is unknown. Anything else is an error the page offers to retry.
 */
import type { MarketCountryRef, MarketHub, MarketPageData, MarketPageResult } from '../types';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isCountryRef = (value: unknown): value is MarketCountryRef =>
  isObject(value) && typeof value.slug === 'string' && typeof value.name === 'string' && typeof value.code === 'string';

const isStats = (value: unknown): boolean =>
  isObject(value) && typeof value.listingCount === 'number' && Array.isArray(value.typeCounts);

export const isMarketPageData = (value: unknown): value is MarketPageData =>
  isObject(value)
  && (value.deal === 'sale' || value.deal === 'rent')
  && isCountryRef(value.country)
  && (value.city === null || (isObject(value.city) && typeof value.city.slug === 'string' && typeof value.city.name === 'string'))
  && isStats(value.stats)
  && typeof value.indexable === 'boolean'
  && Array.isArray(value.cities)
  && Array.isArray(value.listings);

export const isMarketHub = (value: unknown): value is MarketHub =>
  isObject(value) && (value.deal === 'sale' || value.deal === 'rent') && Array.isArray(value.countries)
  && value.countries.every((c: unknown) => isCountryRef(c) && isObject(c) && Array.isArray(c.cities));

/**
 * The page result for an API error, when it is a 404 the screen can explain
 * ("no listings in this city" with its country, or "unknown country");
 * null for any other error.
 */
export const notFoundResult = (error: unknown): Exclude<MarketPageResult, { status: 'found' }> | null => {
  if (!isObject(error) || error.statusCode !== 404) return null;
  const details = isObject(error.details) ? error.details : {};
  if (details.error === 'unknown-city' && isCountryRef(details.country)) {
    return { status: 'unknown-city', country: details.country };
  }
  return { status: 'unknown-country' };
};

/** HTTP status of an API error, if it has one. */
export const errorStatus = (error: unknown): number | undefined =>
  isObject(error) && typeof error.statusCode === 'number' ? error.statusCode : undefined;

/** Retry network and server errors (twice), never a request the API rejected. */
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  const status = errorStatus(error);
  return failureCount < 2 && (status === undefined || status >= 500);
};
