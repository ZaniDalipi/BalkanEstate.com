/**
 * Economic Indicators Service
 *
 * Fetches macroeconomic data from the World Bank API (free, no key required).
 * Used to show GDP growth, inflation, population, income and lending rates on
 * the CityDashboard.
 *
 * API docs: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
 */

import axios from 'axios';
import { apiLogger } from '../utils/logger';

export interface EconomicIndicators {
  country: string;
  countryCode: string; // ISO2
  gdpGrowthYoY: number | null;
  inflationCPI: number | null;
  populationTotal: number | null;
  gniPerCapitaUSD: number | null;
  lendingRate: number | null;
  unemploymentRate: number | null;
  lastUpdated: string;
  sourceUrl: string;
}

/** Country name → ISO2 for World Bank queries */
const COUNTRY_ISO2: Record<string, string> = {
  Kosovo: 'XK',
  Albania: 'AL',
  'North Macedonia': 'MK',
  Serbia: 'RS',
  'Bosnia and Herzegovina': 'BA',
  Croatia: 'HR',
  Montenegro: 'ME',
  Greece: 'GR',
  Bulgaria: 'BG',
  Romania: 'RO',
};

const INDICATORS = {
  gdpGrowth: 'NY.GDP.MKTP.KD.ZG',
  inflation: 'FP.CPI.TOTL.ZG',
  population: 'SP.POP.TOTL',
  gniPerCapita: 'NY.GNP.PCAP.CD',
  lendingRate: 'FR.INR.LEND',
  unemployment: 'SL.UEM.TOTL.ZS',
} as const;

/** In-memory cache (24h) to avoid hitting World Bank API repeatedly */
const cache = new Map<string, { data: EconomicIndicators; expires: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Fetch the most recent non-null value for an indicator from World Bank API.
 * Response shape: [{page,pages,...}, [{indicator, country, value, date}, ...]]
 */
async function fetchLatestIndicator(iso2: string, indicatorId: string): Promise<number | null> {
  const url = `https://api.worldbank.org/v2/country/${iso2}/indicator/${indicatorId}?format=json&per_page=10`;
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'BalkanEstate Research Bot/1.0', Accept: 'application/json' },
    });
    const rows = Array.isArray(response.data) ? response.data[1] : null;
    if (!Array.isArray(rows)) return null;
    for (const row of rows) {
      if (row?.value != null && Number.isFinite(Number(row.value))) {
        return parseFloat(Number(row.value).toFixed(2));
      }
    }
    return null;
  } catch (err) {
    apiLogger.warn(`World Bank API failed: ${indicatorId} for ${iso2}`, err);
    return null;
  }
}

/**
 * Get current economic indicators for a country.
 * Cached for 24 hours.
 */
export async function getEconomicIndicators(country: string): Promise<EconomicIndicators> {
  const iso2 = COUNTRY_ISO2[country];
  if (!iso2) {
    return {
      country,
      countryCode: '',
      gdpGrowthYoY: null,
      inflationCPI: null,
      populationTotal: null,
      gniPerCapitaUSD: null,
      lendingRate: null,
      unemploymentRate: null,
      lastUpdated: new Date().toISOString(),
      sourceUrl: 'https://data.worldbank.org/',
    };
  }

  const cached = cache.get(iso2);
  if (cached && cached.expires > Date.now()) return cached.data;

  const [gdpGrowthYoY, inflationCPI, populationTotal, gniPerCapitaUSD, lendingRate, unemploymentRate] =
    await Promise.all([
      fetchLatestIndicator(iso2, INDICATORS.gdpGrowth),
      fetchLatestIndicator(iso2, INDICATORS.inflation),
      fetchLatestIndicator(iso2, INDICATORS.population),
      fetchLatestIndicator(iso2, INDICATORS.gniPerCapita),
      fetchLatestIndicator(iso2, INDICATORS.lendingRate),
      fetchLatestIndicator(iso2, INDICATORS.unemployment),
    ]);

  const result: EconomicIndicators = {
    country,
    countryCode: iso2,
    gdpGrowthYoY,
    inflationCPI,
    populationTotal,
    gniPerCapitaUSD,
    lendingRate,
    unemploymentRate,
    lastUpdated: new Date().toISOString(),
    sourceUrl: `https://data.worldbank.org/country/${iso2}`,
  };

  cache.set(iso2, { data: result, expires: Date.now() + CACHE_TTL_MS });
  return result;
}
