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

/** Look up a country's mortgage profile by code, falling back to a default. */
export function getMortgageProfile(countryCode: string): CountryMortgageProfile {
  return COUNTRY_MORTGAGE_PROFILES[countryCode] ?? DEFAULT_MORTGAGE_PROFILE;
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

/**
 * Format an amount in a country's mortgage currency. Unlike the shared
 * `formatPrice` helper (which is keyed by country name and collapses every
 * Balkan country to EUR), this respects each country's actual currency — and,
 * when `useEur` is set, lets the user view any market's figures in euros.
 */
export function formatLocalCurrency(amount: number, countryCode: string, useEur = false): string {
  const profile = getMortgageProfile(countryCode);
  return useEur
    ? formatMoney(amount, 'EUR', EUR_LOCALE)
    : formatMoney(amount, profile.currency, profile.locale);
}

/** Currency symbol (or code) for a country's mortgage currency (or EUR). */
export function getLocalCurrencySymbol(countryCode: string, useEur = false): string {
  const profile = getMortgageProfile(countryCode);
  const currency = useEur ? 'EUR' : profile.currency;
  const locale = useEur ? EUR_LOCALE : profile.locale;
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(1);
  return parts.find((p) => p.type === 'currency')?.value ?? currency;
}

/** Whether a country uses a non-euro local currency (so the EUR toggle is useful). */
export function hasLocalCurrencyOption(countryCode: string): boolean {
  return getMortgageProfile(countryCode).currency !== 'EUR';
}
