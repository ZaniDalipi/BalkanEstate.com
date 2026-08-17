/**
 * mortgageMarketData — per-country residential mortgage market reference data.
 *
 * Single source of truth for the mortgage calculator. Each entry captures the
 * indicative market conditions a buyer faces in that country so the calculator
 * pre-fills realistic, location-specific defaults instead of one flat 3.5% rate.
 *
 * Figures are indicative market averages for new residential mortgages compiled
 * from central-bank statistics and commercial-bank offers (2024–2025). They are
 * NOT a quote — actual rates depend on the bank, the borrower's profile, whether
 * the loan is local-currency or euro-indexed, and fixed vs. variable terms. The
 * `rateRange` conveys that spread; the UI shows it alongside the default.
 *
 * Sources (indicative): national central banks (NBRM, Bank of Albania, NBS, CBK,
 * CBCG, CBBH, HNB, Banka e Sllovenisë, BNB, Bank of Greece, BNR) lending-rate
 * statistics and published commercial-bank housing-loan offers.
 */

export interface CountryMortgageProfile {
  /** ISO 3166-1 alpha-2 country code. */
  code: string;
  /** English country name. */
  name: string;
  /** ISO 4217 currency the mortgage is denominated in. */
  currency: string;
  /**
   * BCP-47 locale used to format that currency's amounts. Balkan currencies
   * conventionally use dot thousands separators, so most use `de-DE`.
   */
  locale: string;
  /** Whether the domestic mortgage market is predominantly euro-indexed. */
  euroIndexed: boolean;
  /** Indicative default annual interest rate (%) pre-filled in the calculator. */
  typicalRate: number;
  /** Indicative low–high spread of market rates (%), for context. */
  rateRange: { min: number; max: number };
  /** Typical minimum down payment (%) — reflects prevailing max LTV. */
  minDownPaymentPercent: number;
  /** Sensible default down payment (%) pre-filled in the calculator. */
  defaultDownPaymentPercent: number;
  /** Default loan term (years) pre-filled in the calculator. */
  defaultTermYears: number;
  /** Longest term typically offered (years). */
  maxTermYears: number;
}

/**
 * Keyed by country code. Rates are indicative averages for new housing loans.
 * Where a market is largely euro-indexed the rate reflects the euro-indexed
 * offer even if the display currency is the local one.
 */
export const COUNTRY_MORTGAGE_PROFILES: Record<string, CountryMortgageProfile> = {
  MK: {
    code: 'MK', name: 'North Macedonia', currency: 'MKD', locale: 'mk-MK',
    euroIndexed: false, typicalRate: 5.2, rateRange: { min: 4.5, max: 6.2 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 20,
    defaultTermYears: 30, maxTermYears: 30,
  },
  AL: {
    code: 'AL', name: 'Albania', currency: 'ALL', locale: 'sq-AL',
    euroIndexed: false, typicalRate: 3.6, rateRange: { min: 2.5, max: 5.0 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 25,
    defaultTermYears: 25, maxTermYears: 30,
  },
  RS: {
    code: 'RS', name: 'Serbia', currency: 'RSD', locale: 'sr-RS',
    euroIndexed: true, typicalRate: 6.5, rateRange: { min: 5.5, max: 8.0 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 20,
    defaultTermYears: 25, maxTermYears: 30,
  },
  XK: {
    code: 'XK', name: 'Kosovo', currency: 'EUR', locale: 'de-DE',
    euroIndexed: true, typicalRate: 5.5, rateRange: { min: 4.5, max: 6.8 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 25,
    defaultTermYears: 20, maxTermYears: 25,
  },
  ME: {
    code: 'ME', name: 'Montenegro', currency: 'EUR', locale: 'de-DE',
    euroIndexed: true, typicalRate: 5.0, rateRange: { min: 4.0, max: 6.5 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 25,
    defaultTermYears: 20, maxTermYears: 30,
  },
  BA: {
    code: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM', locale: 'bs-BA',
    euroIndexed: false, typicalRate: 5.0, rateRange: { min: 4.0, max: 6.5 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 20,
    defaultTermYears: 25, maxTermYears: 30,
  },
  HR: {
    code: 'HR', name: 'Croatia', currency: 'EUR', locale: 'hr-HR',
    euroIndexed: false, typicalRate: 3.8, rateRange: { min: 3.0, max: 4.8 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 20,
    defaultTermYears: 30, maxTermYears: 30,
  },
  SI: {
    code: 'SI', name: 'Slovenia', currency: 'EUR', locale: 'sl-SI',
    euroIndexed: false, typicalRate: 3.7, rateRange: { min: 3.0, max: 4.5 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 20,
    defaultTermYears: 25, maxTermYears: 30,
  },
  BG: {
    code: 'BG', name: 'Bulgaria', currency: 'BGN', locale: 'bg-BG',
    euroIndexed: false, typicalRate: 2.8, rateRange: { min: 2.4, max: 3.6 },
    minDownPaymentPercent: 15, defaultDownPaymentPercent: 20,
    defaultTermYears: 30, maxTermYears: 35,
  },
  GR: {
    code: 'GR', name: 'Greece', currency: 'EUR', locale: 'el-GR',
    euroIndexed: false, typicalRate: 4.0, rateRange: { min: 3.3, max: 5.0 },
    minDownPaymentPercent: 20, defaultDownPaymentPercent: 20,
    defaultTermYears: 25, maxTermYears: 30,
  },
  RO: {
    code: 'RO', name: 'Romania', currency: 'RON', locale: 'ro-RO',
    euroIndexed: false, typicalRate: 6.9, rateRange: { min: 5.8, max: 8.2 },
    minDownPaymentPercent: 15, defaultDownPaymentPercent: 15,
    defaultTermYears: 30, maxTermYears: 30,
  },
};

/** Ordered list for dropdowns (matches the previous page ordering). */
export const MORTGAGE_COUNTRIES: CountryMortgageProfile[] = [
  'MK', 'AL', 'RS', 'XK', 'ME', 'BA', 'HR', 'SI', 'BG', 'GR', 'RO',
].map((code) => COUNTRY_MORTGAGE_PROFILES[code]);

/** Fallback profile used when an unknown country code is supplied. */
export const DEFAULT_MORTGAGE_PROFILE: CountryMortgageProfile = COUNTRY_MORTGAGE_PROFILES.MK;

/** Year the reference figures were last reviewed — surfaced in the UI. */
export const MORTGAGE_DATA_YEAR = 2025;

/**
 * Look up a country's mortgage profile by ISO code ('MK') OR full country name
 * ('North Macedonia', 'Serbia', …). Property records store the country as a
 * name, so name resolution is what keeps the embedded calculator tied to the
 * country the property is actually in — not the default.
 */
export function getMortgageProfile(country: string): CountryMortgageProfile {
  if (!country) return DEFAULT_MORTGAGE_PROFILE;

  // Exact ISO code, case-insensitive (e.g. 'mk' → MK).
  const byCode = COUNTRY_MORTGAGE_PROFILES[country.toUpperCase()];
  if (byCode) return byCode;

  // Exact country name / code, case-insensitive.
  const norm = country.trim().toLowerCase();
  const exact = MORTGAGE_COUNTRIES.find(
    (c) => c.name.toLowerCase() === norm || c.code.toLowerCase() === norm,
  );
  if (exact) return exact;

  // Common names, native names and partial matches.
  const includes = (...needles: string[]) => needles.some((n) => norm.includes(n));
  if (includes('macedon')) return COUNTRY_MORTGAGE_PROFILES.MK;
  if (includes('albania', 'shqip')) return COUNTRY_MORTGAGE_PROFILES.AL;
  if (includes('serbia', 'srbij')) return COUNTRY_MORTGAGE_PROFILES.RS;
  if (includes('kosov')) return COUNTRY_MORTGAGE_PROFILES.XK;
  if (includes('montenegro', 'crna gora')) return COUNTRY_MORTGAGE_PROFILES.ME;
  if (includes('bosnia', 'herzegov', 'bosna')) return COUNTRY_MORTGAGE_PROFILES.BA;
  if (includes('croat', 'hrvat')) return COUNTRY_MORTGAGE_PROFILES.HR;
  if (includes('sloven')) return COUNTRY_MORTGAGE_PROFILES.SI;
  if (includes('bulgar', 'българ')) return COUNTRY_MORTGAGE_PROFILES.BG;
  if (includes('greece', 'hellen', 'ελλ')) return COUNTRY_MORTGAGE_PROFILES.GR;
  if (includes('romania', 'român', 'roman')) return COUNTRY_MORTGAGE_PROFILES.RO;

  return DEFAULT_MORTGAGE_PROFILE;
}

/** Locale used when displaying amounts in euros. */
export const EUR_LOCALE = 'de-DE';

/** Format an amount in an explicit currency + locale. */
export function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

/** Format an amount in euros — the single currency used across the calculator. */
export function formatEur(amount: number): string {
  return formatMoney(amount, 'EUR', EUR_LOCALE);
}
