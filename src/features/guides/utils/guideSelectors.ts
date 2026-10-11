/**
 * Pure lookups over the guide data — kept out of the components so the URL
 * validation, filtering and sorting can be tested without a DOM.
 */

import { validateSearchQuery, validateSlug } from '@/shared/utils/validation';
import { COUNTRY_GUIDES } from '../data/countryGuides';
import { GUIDE_SORTS, type CountryGuide, type GuideSort, type NumericRange } from '../types/guide.types';

export type GuideLookup =
  | { status: 'found'; guide: CountryGuide; index: number }
  /** The segment is well-formed but no guide has that slug. */
  | { status: 'not-found'; slug: string }
  /** The segment is not a slug at all; it is never echoed back to the page. */
  | { status: 'invalid'; error: string };

/** Resolve the `:slug` URL segment to a guide, validating it first. */
export function findGuide(rawSlug: string | undefined, guides: readonly CountryGuide[] = COUNTRY_GUIDES): GuideLookup {
  const slug = rawSlug?.trim().toLowerCase();
  const validation = validateSlug(slug);
  if (!validation.isValid || !slug) {
    return { status: 'invalid', error: validation.error ?? 'Invalid slug' };
  }
  const index = guides.findIndex((g) => g.slug === slug);
  return index === -1 ? { status: 'not-found', slug } : { status: 'found', guide: guides[index], index };
}

/** Lowercase and strip accents, so "nis" finds "Niš" and "timisoara" finds "Timișoara". */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Guides whose country (English or translated) or one of whose cities matches
 * the query. The query is sanitised through `validateSearchQuery` first.
 */
export function filterGuides(
  guides: readonly CountryGuide[],
  rawQuery: string,
  translateCountry: (guide: CountryGuide) => string = (g) => g.country,
): CountryGuide[] {
  const { sanitized } = validateSearchQuery(rawQuery);
  const query = normalizeForSearch(sanitized);
  if (!query) return [...guides];
  return guides.filter((guide) =>
    [guide.country, translateCountry(guide), ...guide.topCities].some((field) =>
      normalizeForSearch(field).includes(query),
    ),
  );
}

const midpoint = (range: NumericRange) => (range.min + range.max) / 2;

/** A new array in the requested order; ties fall back to the English name. */
export function sortGuides(
  guides: readonly CountryGuide[],
  sort: GuideSort,
  translateCountry: (guide: CountryGuide) => string = (g) => g.country,
): CountryGuide[] {
  const byName = (a: CountryGuide, b: CountryGuide) => translateCountry(a).localeCompare(translateCountry(b));
  const sorted = [...guides];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => midpoint(a.avgPricePerSqm) - midpoint(b.avgPricePerSqm) || byName(a, b));
    case 'yield-desc':
      return sorted.sort((a, b) => midpoint(b.rentalYield) - midpoint(a.rentalYield) || byName(a, b));
    case 'name':
    default:
      return sorted.sort(byName);
  }
}

/** Narrow an untrusted value (a `<select>` change) to a known sort. */
export function parseGuideSort(value: unknown): GuideSort {
  return GUIDE_SORTS.includes(value as GuideSort) ? (value as GuideSort) : 'name';
}

/**
 * `Intl.NumberFormat` for the reader's language. A locale the runtime does not
 * know (`me` is not in every ICU build) falls back to English instead of
 * throwing in the middle of a render.
 */
function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat('en', options);
  }
}

/** "€600" in the reader's number format. */
export function formatEuro(value: number, locale: string): string {
  return numberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

/** "9%" in the reader's number format. */
export function formatPercent(value: number, locale: string): string {
  return numberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value / 100);
}

/** "€1,800–3,500" in the reader's number format. */
export function formatEuroRange(range: NumericRange, locale: string): string {
  const fmt = numberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const plain = numberFormat(locale, { maximumFractionDigits: 0 });
  return `${fmt.format(range.min)}–${plain.format(range.max)}`;
}

/** "5–8%" in the reader's number format. */
export function formatPercentRange(range: NumericRange, locale: string): string {
  const fmt = numberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  const plain = numberFormat(locale, { maximumFractionDigits: 1 });
  return `${plain.format(range.min)}–${fmt.format(range.max / 100)}`;
}

/** Long-form date ("1 October 2026") for the last-reviewed note. */
export function formatReviewDate(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  }
}
