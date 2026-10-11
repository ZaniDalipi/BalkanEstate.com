/**
 * A country buying guide.
 *
 * Figures that the page compares or sorts on (price, yield) are numbers, and
 * are formatted for the reader's language at render time. Long-form text
 * (highlights, legal steps) is English-only for now — the page says so when it
 * is shown in another language.
 */

/** How open a country's market is to buyers from outside the EU. */
export type ForeignOwnership = 'open' | 'conditional';

export interface NumericRange {
  min: number;
  max: number;
}

export interface CountryGuide {
  /** URL segment: `/guides/:slug`. Lowercase, hyphen-separated. */
  slug: string;
  /** English name — also the value the search filter expects. */
  country: string;
  /** Key under `common:countries.*` for the translated country name. */
  countryKey: string;
  flag: string;
  /** Typical asking price, € per m². */
  avgPricePerSqm: NumericRange;
  /** Typical gross rental yield, percent. */
  rentalYield: NumericRange;
  ownership: ForeignOwnership;
  foreignBuy: string;
  residency: string;
  tax: string;
  transferTax: string;
  topCities: string[];
  highlights: string[];
  legalProcess: string[];
}

export type GuideSort = 'name' | 'price-asc' | 'yield-desc';

export const GUIDE_SORTS: readonly GuideSort[] = ['name', 'price-asc', 'yield-desc'];
