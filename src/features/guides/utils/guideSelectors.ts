/**
 * Pure lookups over the guide data — kept out of the components so the URL
 * validation, filtering and formatting can be tested without a DOM.
 */

import { validateSearchQuery, validateSlug } from '@/shared/utils/validation';
import { COUNTRY_GUIDES } from '../data/countryGuides';
import type { CountryGuide, PriceStat, Source } from '../types/guide.types';

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
    [guide.country, translateCountry(guide), ...guide.cities].some((field) =>
      normalizeForSearch(field).includes(query),
    ),
  );
}

/** Guides sorted by their name in the reader's language. */
export function sortByName(
  guides: readonly CountryGuide[],
  translateCountry: (guide: CountryGuide) => string = (g) => g.country,
): CountryGuide[] {
  return [...guides].sort((a, b) => translateCountry(a).localeCompare(translateCountry(b)));
}

/** Every distinct source a guide cites, in the order they appear on the page. */
export function guideSources(guide: CountryGuide): Source[] {
  const all: Source[] = [
    ...(guide.price ? [guide.price.source] : []),
    ...[guide.transferTax, guide.annualTax, guide.foreignOwnership, guide.residency].flatMap((fact) => fact?.sources ?? []),
  ];
  const seen = new Set<string>();
  return all.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
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

/**
 * The headline value of an official price statistic, exactly as published:
 * "€2,445" for an average, "+5.25%" for an index change. A BAM figure is shown
 * in KM with its fixed-rate EUR equivalent ("3,147 KM (≈ €1,609)").
 */
export function formatPriceStat(stat: PriceStat, locale: string): string {
  if (stat.kind === 'index-change') {
    const pct = numberFormat(locale, { style: 'percent', maximumFractionDigits: 2, signDisplay: 'exceptZero' });
    return pct.format(stat.changePct / 100);
  }
  if (stat.currency === 'EUR') {
    return numberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stat.amount);
  }
  const km = `${numberFormat(locale, { maximumFractionDigits: 0 }).format(stat.amount)} KM`;
  if (stat.eurAmount === undefined) return km;
  const eur = numberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stat.eurAmount);
  return `${km} (≈ ${eur})`;
}

/** Long-form date ("11 October 2026") for the last-reviewed note. */
export function formatReviewDate(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(date);
  }
}
