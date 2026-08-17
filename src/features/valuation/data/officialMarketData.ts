/**
 * officialMarketData — curated official residential price benchmarks per country.
 *
 * Powers the "Official statistics" side of the market-source toggle. The live
 * marketplace side is served by the backend (CityMarketData.listingAvgPricePerSqm);
 * this module provides the official / national-statistics benchmark plus a source
 * attribution so the two can be compared side by side, and acts as an offline
 * fallback whenever the API has no official figure for a location.
 *
 * Values are indicative average residential asking/transaction prices in EUR per
 * m² for 2025, compiled from national statistics offices and cross-checked
 * against Global Property Guide / Eurostat aggregates. Property across the region
 * is conventionally quoted in EUR/m² regardless of local currency, so benchmarks
 * are expressed in EUR. Figures are reference points, not appraisals.
 */

export interface OfficialSource {
  /** Human-readable source name (national statistics office / index). */
  name: string;
  /** Canonical source URL. */
  url: string;
}

export interface CityBenchmark {
  city: string;
  /** Indicative city-centre residential price, EUR/m². */
  centerPerSqm: number;
}

export interface CountryMarketReference {
  code: string;
  name: string;
  /** Indicative national average residential price, EUR/m² (2025). */
  countryAvgPerSqm: number;
  /** Capital / primary city benchmark. */
  capital: CityBenchmark;
  /** Additional notable cities, if available. */
  cities?: CityBenchmark[];
  source: OfficialSource;
  /** Reference period for the figures. */
  period: string;
}

/** Every benchmark below is EUR/m², reference year 2025. */
export const COUNTRY_MARKET_REFERENCES: Record<string, CountryMarketReference> = {
  MK: {
    code: 'MK', name: 'North Macedonia', countryAvgPerSqm: 1300,
    capital: { city: 'Skopje', centerPerSqm: 1850 },
    cities: [{ city: 'Ohrid', centerPerSqm: 1400 }, { city: 'Bitola', centerPerSqm: 1000 }],
    source: { name: 'State Statistical Office (MAKStat)', url: 'https://www.stat.gov.mk/' },
    period: '2025',
  },
  AL: {
    code: 'AL', name: 'Albania', countryAvgPerSqm: 1300,
    capital: { city: 'Tirana', centerPerSqm: 2600 },
    cities: [{ city: 'Durrës', centerPerSqm: 1300 }, { city: 'Vlorë', centerPerSqm: 1400 }],
    source: { name: 'INSTAT — Institute of Statistics', url: 'https://www.instat.gov.al/' },
    period: '2025',
  },
  RS: {
    code: 'RS', name: 'Serbia', countryAvgPerSqm: 1600,
    capital: { city: 'Belgrade', centerPerSqm: 2500 },
    cities: [{ city: 'Novi Sad', centerPerSqm: 2250 }, { city: 'Niš', centerPerSqm: 1200 }],
    source: { name: 'Statistical Office of the Republic of Serbia', url: 'https://www.stat.gov.rs/en-us/' },
    period: '2025',
  },
  XK: {
    code: 'XK', name: 'Kosovo', countryAvgPerSqm: 1200,
    capital: { city: 'Pristina', centerPerSqm: 2000 },
    source: { name: 'Kosovo Agency of Statistics', url: 'https://ask.rks-gov.net/en/' },
    period: '2025',
  },
  ME: {
    code: 'ME', name: 'Montenegro', countryAvgPerSqm: 2000,
    capital: { city: 'Podgorica', centerPerSqm: 2150 },
    cities: [{ city: 'Budva', centerPerSqm: 3200 }, { city: 'Kotor', centerPerSqm: 3000 }],
    source: { name: 'MONSTAT — Statistical Office of Montenegro', url: 'https://www.monstat.org/en/' },
    period: '2025',
  },
  BA: {
    code: 'BA', name: 'Bosnia and Herzegovina', countryAvgPerSqm: 1500,
    capital: { city: 'Sarajevo', centerPerSqm: 1900 },
    cities: [{ city: 'Banja Luka', centerPerSqm: 1500 }, { city: 'Mostar', centerPerSqm: 1500 }],
    source: { name: 'Agency for Statistics of Bosnia and Herzegovina', url: 'https://bhas.gov.ba/?lang=en' },
    period: '2025',
  },
  HR: {
    code: 'HR', name: 'Croatia', countryAvgPerSqm: 2600,
    capital: { city: 'Zagreb', centerPerSqm: 3780 },
    cities: [{ city: 'Split', centerPerSqm: 4000 }, { city: 'Dubrovnik', centerPerSqm: 5000 }],
    source: { name: 'Croatian Bureau of Statistics (DZS)', url: 'https://dzs.gov.hr/en' },
    period: '2025',
  },
  SI: {
    code: 'SI', name: 'Slovenia', countryAvgPerSqm: 3200,
    capital: { city: 'Ljubljana', centerPerSqm: 4500 },
    cities: [{ city: 'Maribor', centerPerSqm: 2400 }, { city: 'Koper', centerPerSqm: 3600 }],
    source: { name: 'Statistical Office of Slovenia (SURS)', url: 'https://www.stat.si/StatWeb/en' },
    period: '2025',
  },
  BG: {
    code: 'BG', name: 'Bulgaria', countryAvgPerSqm: 1500,
    capital: { city: 'Sofia', centerPerSqm: 2370 },
    cities: [{ city: 'Plovdiv', centerPerSqm: 1400 }, { city: 'Varna', centerPerSqm: 1500 }],
    source: { name: 'National Statistical Institute (NSI)', url: 'https://www.nsi.bg/en' },
    period: '2025',
  },
  GR: {
    code: 'GR', name: 'Greece', countryAvgPerSqm: 2000,
    capital: { city: 'Athens', centerPerSqm: 2500 },
    cities: [{ city: 'Thessaloniki', centerPerSqm: 2100 }],
    source: { name: 'Bank of Greece / ELSTAT', url: 'https://www.bankofgreece.gr/en/statistics' },
    period: '2025',
  },
  RO: {
    code: 'RO', name: 'Romania', countryAvgPerSqm: 1700,
    capital: { city: 'Bucharest', centerPerSqm: 2300 },
    cities: [{ city: 'Cluj-Napoca', centerPerSqm: 2900 }, { city: 'Timișoara', centerPerSqm: 1900 }],
    source: { name: 'National Institute of Statistics (INS)', url: 'https://insse.ro/cms/en' },
    period: '2025',
  },
};

/** Ordered list for dropdowns (mirrors the mortgage calculator ordering). */
export const MARKET_REFERENCE_COUNTRIES: CountryMarketReference[] = [
  'MK', 'AL', 'RS', 'XK', 'ME', 'BA', 'HR', 'SI', 'BG', 'GR', 'RO',
].map((code) => COUNTRY_MARKET_REFERENCES[code]);

export const DEFAULT_MARKET_REFERENCE = COUNTRY_MARKET_REFERENCES.MK;

/** The reference year surfaced in the UI. */
export const MARKET_DATA_YEAR = 2025;

/** Resolve a country's reference by ISO code, with a safe fallback. */
export function getMarketReference(countryCode: string): CountryMarketReference {
  return COUNTRY_MARKET_REFERENCES[countryCode] ?? DEFAULT_MARKET_REFERENCE;
}

/** Match a free-text country name (e.g. from a valuation) to a reference code. */
export function findReferenceByCountryName(country: string): CountryMarketReference | undefined {
  const normalized = country.trim().toLowerCase();
  return MARKET_REFERENCE_COUNTRIES.find(
    (c) => c.name.toLowerCase() === normalized || c.code.toLowerCase() === normalized,
  ) ?? (normalized.includes('macedonia') ? COUNTRY_MARKET_REFERENCES.MK : undefined);
}

/** Format a EUR/m² benchmark for display. */
export function formatEurPerSqm(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0, minimumFractionDigits: 0,
  }).format(Math.round(value));
}
