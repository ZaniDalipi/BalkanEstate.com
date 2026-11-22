/**
 * Reads the live listings behind the price table (marketPriceTable.ts).
 * One pass over every live listing in the ten countries, so the result is
 * kept for an hour: the figures are medians of thousands of listings and do
 * not move minute to minute.
 */
import Property from '../../models/Property';
import { MEASURED_ATTRIBUTES, type TypeAttribute } from '../../config/typeAttributes';
import { resolveTotalArea } from '../../config/propertyArea';
import { createPromiseCache } from '../../utils/promiseCache';
import { MARKET_COUNTRIES, countrySpellings } from './marketPlaces';
import { dealFilter } from './marketPageService';
import { buildPriceTable, type PriceRow, type PriceTable } from './marketPriceTable';

/** Far above today's live listings; a guard, not a sample. */
const MAX_ROWS = 200_000;
const CACHE_MS = 60 * 60 * 1000;
/** A failed read is retried by the next visitor after a minute, not on every request. */
const FAILURE_CACHE_MS = 60 * 1000;

const cache = createPromiseCache<PriceTable>(CACHE_MS, 1, FAILURE_CACHE_MS);

type Row = {
  listingType?: unknown;
  country?: unknown;
  city?: unknown;
  price?: unknown;
  sqft?: unknown;
  propertyType?: unknown;
  rentPeriod?: unknown;
  isNegotiable?: unknown;
} & Partial<Record<TypeAttribute, unknown>>;

async function loadPriceRows(): Promise<PriceRow[]> {
  const areaFields = Object.fromEntries([...MEASURED_ATTRIBUTES].map((field) => [field, 1]));
  const rows = await Property.aggregate<Row>([
    {
      $match: {
        country: { $in: MARKET_COUNTRIES.flatMap(countrySpellings) },
        $or: [dealFilter('sale'), dealFilter('rent')],
      },
    },
    { $limit: MAX_ROWS },
    {
      $project: {
        _id: 0, listingType: 1, country: 1, city: 1, price: 1, sqft: 1,
        propertyType: 1, rentPeriod: 1, isNegotiable: 1, ...areaFields,
      },
    },
  ]).collation({ locale: 'en', strength: 2 });

  return rows
    .filter((row) => (row.listingType === 'sale' || row.listingType === 'rent') && typeof row.country === 'string')
    .map((row) => ({
      deal: row.listingType as PriceRow['deal'],
      country: row.country as string,
      city: typeof row.city === 'string' ? row.city : '',
      price: typeof row.price === 'number' ? row.price : null,
      area: resolveTotalArea(row.propertyType, row),
      propertyType: typeof row.propertyType === 'string' ? row.propertyType : null,
      rentPeriod: typeof row.rentPeriod === 'string' ? row.rentPeriod : null,
      isNegotiable: row.isNegotiable === true,
      indexable: false,
    }));
}

export const getPriceTable = (): Promise<PriceTable> =>
  cache.get('table', async () => buildPriceTable(await loadPriceRows()));

/** For tests. */
export const clearPriceTableCache = (): void => cache.clear();
