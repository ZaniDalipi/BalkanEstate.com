/**
 * A country buying guide.
 *
 * Every fact the page states carries the official source it was taken from,
 * and is shown with a link to it. A fact with no official source is left out
 * entirely — the page says "not yet verified" rather than estimating. The test
 * suite enforces that every source URL is on an official domain.
 */

/** An official publication a fact was taken from. */
export interface Source {
  /** The institution that published it, e.g. "MONSTAT". */
  publisher: string;
  /** The publication or page title. */
  title: string;
  /** HTTPS link to the publication. Must be on an official domain (see tests). */
  url: string;
}

/** A statement of fact and the official source(s) backing it. */
export interface SourcedFact {
  text: string;
  sources: Source[];
}

/**
 * The official price statistic for a country. Statistics offices publish
 * either an average price per m² or only a price index; we show whichever
 * exists, exactly as published, and never convert one into the other.
 */
export type PriceStat =
  | {
      kind: 'avg-per-sqm';
      /** Value as published, in `currency`. */
      amount: number;
      currency: 'EUR' | 'BAM';
      /** EUR equivalent at an official fixed rate, when `currency` is not EUR. */
      eurAmount?: number;
      /** What was measured, e.g. "Average price of new dwellings sold". */
      measure: string;
      /** Reference period, e.g. "Q1 2026". */
      period: string;
      source: Source;
    }
  | {
      kind: 'index-change';
      /** Year-on-year change of the official house price index, in percent. */
      changePct: number;
      measure: string;
      period: string;
      source: Source;
    };

export interface CountryGuide {
  /** URL segment: `/guides/:slug`. Lowercase, hyphen-separated. */
  slug: string;
  /** English name — also the value the search filter expects. */
  country: string;
  /** Key under `common:countries.*` for the translated country name. */
  countryKey: string;
  flag: string;
  /** Cities linked into search. A navigation aid, not a ranking. */
  cities: string[];
  price?: PriceStat;
  transferTax?: SourcedFact;
  annualTax?: SourcedFact;
  foreignOwnership?: SourcedFact;
  residency?: SourcedFact;
}

/** The sourced facts a guide can state, in display order. */
export const GUIDE_FACT_KEYS = ['transferTax', 'annualTax', 'foreignOwnership', 'residency'] as const;
export type GuideFactKey = (typeof GUIDE_FACT_KEYS)[number];
