/**
 * City Price History Service
 *
 * Provides 8 years of quarterly historical price data per city.
 * Tries BIS (Bank for International Settlements) data first with a hard timeout,
 * then falls back to deterministic synthetic history anchored to the city's price.
 */

import axios from 'axios';
import { apiLogger } from '../utils/logger';
import CityMarketData from '../models/CityMarketData';

export interface QuarterlyPricePoint {
  period: string;
  year: number;
  quarter: number;
  pricePerSqm: number;
  indexValue: number;
  transactionVolume?: number;
}

export interface CityPriceHistory {
  city: string;
  country: string;
  countryCode: string;
  history: QuarterlyPricePoint[];
  dataSource: 'bis' | 'estimated';
  bisSeriesId: string | null;
  fredUrl: string | null;
  lastUpdated: string;
}

/** ISO3 codes used by BIS for residential property prices */
const COUNTRY_BIS_CODE: Record<string, string> = {
  'North Macedonia': 'MKD',
  Serbia: 'SRB',
  Croatia: 'HRV',
  'Bosnia and Herzegovina': 'BIH',
  Greece: 'GRC',
  Bulgaria: 'BGR',
  Romania: 'ROU',
  Albania: 'ALB',
  Montenegro: 'MNE',
};

/** FRED URLs for user-facing citations */
const FRED_URL_BY_COUNTRY: Record<string, string> = {
  'North Macedonia': 'https://fred.stlouisfed.org/series/QMKN628BIS',
  Serbia: 'https://fred.stlouisfed.org/series/QRSD628BIS',
  Croatia: 'https://fred.stlouisfed.org/series/QHRD628BIS',
  'Bosnia and Herzegovina': 'https://fred.stlouisfed.org/series/QBAD628BIS',
  Greece: 'https://fred.stlouisfed.org/series/QGRD628BIS',
  Bulgaria: 'https://fred.stlouisfed.org/series/QBGD628BIS',
  Romania: 'https://fred.stlouisfed.org/series/QROD628BIS',
  Albania: 'https://fred.stlouisfed.org/series/QABD628BIS',
  Montenegro: 'https://fred.stlouisfed.org/series/QMND628BIS',
};

/** Baseline prices (EUR/m²) when DB lookup fails */
const FALLBACK_PRICE_BY_COUNTRY: Record<string, number> = {
  Kosovo: 900,
  Albania: 1200,
  'North Macedonia': 800,
  Serbia: 1200,
  'Bosnia and Herzegovina': 900,
  Croatia: 2000,
  Montenegro: 1500,
  Greece: 1800,
  Bulgaria: 1000,
  Romania: 1300,
};

/** Hard deadline for the BIS HTTP call — prevents gateway timeouts */
const BIS_TIMEOUT_MS = 5_000;

/**
 * Fetch BIS quarterly residential property price index.
 * Race against a hard deadline so slow/blocked networks don't stall the response.
 */
async function fetchBISHistory(
  countryISO3: string
): Promise<Array<{ period: string; value: number }>> {
  const url = `https://stats.bis.org/api/v1/data/WS_SPP/Q:${countryISO3}:N:628:A?format=jsondata&startPeriod=2016-Q1`;

  const fetchPromise = axios
    .get(url, {
      timeout: BIS_TIMEOUT_MS,
      // BIS SDMX REST API: format is already declared via ?format=jsondata in the URL.
      // Sending Accept: application/json causes 406 because the endpoint expects the
      // SDMX-specific content type. Using */* lets the server honour its own format param.
      headers: { 'User-Agent': 'BalkanEstate Research Bot/1.0', Accept: '*/*' },
    })
    .then((response) => {
      const dataSet = response.data?.dataSets?.[0];
      const timeDim =
        response.data?.structure?.dimensions?.observation?.[0]?.values ?? [];

      if (!dataSet?.observations || timeDim.length === 0) return [];

      const observations = dataSet.observations as Record<string, [number]>;
      const entries = Object.entries(observations)
        .map(([key, val]) => {
          const idx = parseInt(key.split(':').pop() ?? '0', 10);
          return { idx, value: Number(val[0]) };
        })
        .filter((e) => Number.isFinite(e.value))
        .sort((a, b) => a.idx - b.idx);

      return entries.map((e) => ({
        period: timeDim[e.idx]?.id ?? `idx-${e.idx}`,
        value: e.value,
      }));
    });

  const deadlinePromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`BIS timeout after ${BIS_TIMEOUT_MS}ms`)), BIS_TIMEOUT_MS)
  );

  return Promise.race([fetchPromise, deadlinePromise]);
}

/**
 * Generate synthetic quarterly history anchored to currentPrice.
 * Deterministic, instant, no external API calls.
 */
function generateSyntheticHistory(
  currentPrice: number,
  yearsBack = 8
): Array<{ period: string; value: number }> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const totalPoints = yearsBack * 4;
  const avgAnnualGrowth = 0.055;

  const out: Array<{ period: string; value: number }> = [];

  for (let i = 0; i < totalPoints; i++) {
    const yearsFromStart = i / 4;
    const trendValue = 100 * Math.pow(1 + avgAnnualGrowth, yearsFromStart);
    const noise = (Math.sin(i * 0.9) + Math.cos(i * 0.4) * 0.5) * 2;
    const value = trendValue + noise;

    let q = currentQuarter - (totalPoints - 1 - i);
    let y = currentYear;
    while (q <= 0) {
      q += 4;
      y -= 1;
    }
    out.push({ period: `${y}-Q${q}`, value: parseFloat(value.toFixed(2)) });
  }
  return out;
}

function buildHistoryPoints(
  indexHistory: Array<{ period: string; value: number }>,
  currentPrice: number
): QuarterlyPricePoint[] {
  const trimmed = indexHistory.slice(-32);
  const latestIdx = trimmed[trimmed.length - 1]?.value ?? 100;
  const scale = latestIdx > 0 ? currentPrice / latestIdx : currentPrice / 100;

  return trimmed.map((pt) => {
    const [yearStr, qStr] = pt.period.split('-Q');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const quarter = parseInt(qStr, 10) || 1;
    return {
      period: pt.period,
      year,
      quarter,
      pricePerSqm: Math.round(pt.value * scale),
      indexValue: parseFloat(pt.value.toFixed(2)),
      transactionVolume: Math.round(80 + Math.sin(quarter * 1.5 + year) * 40 + Math.random() * 60),
    };
  });
}

/**
 * Get 8 years of quarterly price history for a city.
 * Tries BIS official data first (5s deadline), then falls back to synthetic.
 * Always returns data — never throws.
 */
export async function getCityPriceHistory(city: string, country: string): Promise<CityPriceHistory> {
  let currentPrice = FALLBACK_PRICE_BY_COUNTRY[country] ?? 1000;
  let countryCode = 'XK';

  try {
    const cityDoc = await CityMarketData.findOne({ city, country }).lean();
    if (cityDoc) {
      if (cityDoc.avgPricePerSqm > 0) currentPrice = cityDoc.avgPricePerSqm;
      countryCode = cityDoc.countryCode;
    }
  } catch (err) {
    apiLogger.warn(`getCityPriceHistory: DB lookup failed for ${city}/${country}`, err);
  }

  const bisCode = COUNTRY_BIS_CODE[country];
  let indexHistory: Array<{ period: string; value: number }> = [];
  let dataSource: 'bis' | 'estimated' = 'estimated';

  if (bisCode) {
    try {
      const bisData = await fetchBISHistory(bisCode);
      if (bisData.length >= 8) {
        indexHistory = bisData;
        dataSource = 'bis';
      }
    } catch (err) {
      apiLogger.warn(`BIS fetch failed for ${country} (${bisCode}), using synthetic history`, err);
    }
  }

  if (indexHistory.length === 0) {
    indexHistory = generateSyntheticHistory(currentPrice, 8);
  }

  const history = buildHistoryPoints(indexHistory, currentPrice);

  return {
    city,
    country,
    countryCode,
    history,
    dataSource,
    bisSeriesId: bisCode ? `Q:${bisCode}:N:628:A` : null,
    fredUrl: FRED_URL_BY_COUNTRY[country] ?? null,
    lastUpdated: new Date().toISOString(),
  };
}
