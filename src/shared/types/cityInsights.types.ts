/**
 * City insights / historical data types
 * Shared between backend response shape and frontend consumption.
 */

export interface QuarterlyPricePoint {
  period: string; // "2024-Q3"
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

export interface EconomicIndicators {
  country: string;
  countryCode: string;
  gdpGrowthYoY: number | null;
  inflationCPI: number | null;
  populationTotal: number | null;
  gniPerCapitaUSD: number | null;
  lendingRate: number | null;
  unemploymentRate: number | null;
  lastUpdated: string;
  sourceUrl: string;
}
