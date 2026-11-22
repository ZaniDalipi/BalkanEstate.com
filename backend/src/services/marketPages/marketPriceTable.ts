/**
 * The "Property prices in the Balkans" table: for every country and its
 * cities, the median asking price, price per m² and monthly rent of the live
 * listings. Meant to be read, quoted and cited, so a figure is only given
 * when enough listings back it.
 *
 * Pure functions over plain rows; the database read is in marketPriceService.
 */
import { MARKET_COUNTRIES, countryByStoredName, groupCities, type MarketDeal } from './marketPlaces';
import { buildMarketStats, type MarketStatsRow } from './marketStats';

/** Listings a median needs before the table shows it. Fewer, and one odd listing moves it. */
export const PRICE_TABLE_MIN_SAMPLE = 10;

/** Cities with at least this many live listings (sale and rent together) get a row. */
export const PRICE_TABLE_MIN_CITY_LISTINGS = PRICE_TABLE_MIN_SAMPLE;

export interface PriceFigures {
  listingCount: number;
  pricedCount: number;
  /** Median asking price (sale) or monthly rent (rent); null below the sample size. */
  priceMedian: number | null;
  pricePerSqmMedian: number | null;
  pricePerSqmCount: number;
}

export interface PriceTableRow {
  slug: string;
  name: string;
  sale: PriceFigures;
  rent: PriceFigures;
}

export interface PriceTableCountry extends PriceTableRow {
  code: string;
  cities: PriceTableRow[];
}

export interface PriceTable {
  generatedAt: string;
  minSample: number;
  countries: PriceTableCountry[];
}

export interface PriceRow extends MarketStatsRow {
  deal: MarketDeal;
  country: string;
  city: string;
}

/** The figures of one place and deal, with medians only from enough listings. */
export const priceFigures = (rows: readonly MarketStatsRow[], deal: MarketDeal): PriceFigures => {
  const stats = buildMarketStats(rows, deal);
  return {
    listingCount: stats.listingCount,
    pricedCount: stats.pricedCount,
    priceMedian: stats.pricedCount >= PRICE_TABLE_MIN_SAMPLE ? stats.priceMedian : null,
    pricePerSqmMedian: stats.pricePerSqmCount >= PRICE_TABLE_MIN_SAMPLE ? stats.pricePerSqmMedian : null,
    pricePerSqmCount: stats.pricePerSqmCount,
  };
};

const placeRow = (slug: string, name: string, rows: readonly PriceRow[]): PriceTableRow => ({
  slug,
  name,
  sale: priceFigures(rows.filter((r) => r.deal === 'sale'), 'sale'),
  rent: priceFigures(rows.filter((r) => r.deal === 'rent'), 'rent'),
});

/**
 * Group live listings by country and city page (the same merged city pages
 * as the market pages, so a row links to an existing page). Every country
 * gets a row; a city gets one from PRICE_TABLE_MIN_CITY_LISTINGS listings.
 * Countries and cities are ordered busiest first.
 */
export const buildPriceTable = (rows: readonly PriceRow[], now: Date = new Date()): PriceTable => {
  const byCountry = new Map<string, PriceRow[]>();
  for (const row of rows) {
    const country = countryByStoredName(row.country);
    if (!country) continue;
    const list = byCountry.get(country.slug) ?? [];
    list.push(row);
    byCountry.set(country.slug, list);
  }

  const countries = MARKET_COUNTRIES.map((country) => {
    const countryRows = byCountry.get(country.slug) ?? [];
    const spellingCounts = new Map<string, number>();
    for (const row of countryRows) spellingCounts.set(row.city, (spellingCounts.get(row.city) ?? 0) + 1);
    const cityPages = groupCities([...spellingCounts].map(([city, count]) => ({ city, count, indexableCount: 0 })));

    const cities = cityPages
      .filter((city) => city.count >= PRICE_TABLE_MIN_CITY_LISTINGS)
      .map((city) => {
        const spellings = new Set(city.spellings);
        return placeRow(city.slug, city.name, countryRows.filter((r) => spellings.has(r.city)));
      });

    return { ...placeRow(country.slug, country.name, countryRows), code: country.code, cities };
  }).sort((a, b) => b.sale.listingCount + b.rent.listingCount - (a.sale.listingCount + a.rent.listingCount)
    || a.name.localeCompare(b.name));

  return { generatedAt: now.toISOString(), minSample: PRICE_TABLE_MIN_SAMPLE, countries };
};

const csvCell = (value: string | number | null): string => {
  if (value === null) return '';
  const text = String(value);
  // Quote anything with a delimiter, quote or line break; neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const PRICE_TABLE_CSV_HEADER = [
  'country', 'city', 'as_of',
  'sale_listings', 'sale_median_price_eur', 'sale_median_price_per_sqm_eur',
  'rent_listings', 'rent_median_monthly_eur', 'rent_median_monthly_per_sqm_eur',
];

/** The table as CSV: one row per country (city empty) followed by its cities. */
export const priceTableCsv = (table: PriceTable): string => {
  const asOf = table.generatedAt.slice(0, 10);
  const line = (country: string, city: string, row: PriceTableRow) => [
    country, city, asOf,
    row.sale.listingCount, row.sale.priceMedian, row.sale.pricePerSqmMedian,
    row.rent.listingCount, row.rent.priceMedian, row.rent.pricePerSqmMedian,
  ].map(csvCell).join(',');

  const lines = [PRICE_TABLE_CSV_HEADER.join(',')];
  for (const country of table.countries) {
    lines.push(line(country.name, '', country));
    for (const city of country.cities) lines.push(line(country.name, city.name, city));
  }
  return `${lines.join('\n')}\n`;
};
