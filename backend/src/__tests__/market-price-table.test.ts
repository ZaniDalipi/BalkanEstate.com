/**
 * The "Property prices in the Balkans" table: medians only from enough
 * listings, cities merged like the market pages, busiest first, and a CSV
 * that a spreadsheet opens safely.
 */
process.env.SKIP_TEST_DB = 'true';

import Property from '../models/Property';
import {
  PRICE_TABLE_CSV_HEADER,
  PRICE_TABLE_MIN_SAMPLE,
  buildPriceTable,
  priceFigures,
  priceTableCsv,
  type PriceRow,
} from '../services/marketPages/marketPriceTable';
import { clearPriceTableCache } from '../services/marketPages/marketPriceService';
import { getPriceTableController, getPriceTableCsvController } from '../controllers/marketPageController';

const row = (overrides: Partial<PriceRow> = {}): PriceRow => ({
  deal: 'sale',
  country: 'Albania',
  city: 'Tirana',
  price: 100_000,
  area: 80,
  propertyType: 'apartment',
  rentPeriod: null,
  isNegotiable: false,
  indexable: false,
  ...overrides,
});
const many = (count: number, overrides: Partial<PriceRow> = {}) => Array.from({ length: count }, () => row(overrides));

describe('priceFigures', () => {
  it(`gives medians only from ${PRICE_TABLE_MIN_SAMPLE} priced listings`, () => {
    const enough = priceFigures(many(PRICE_TABLE_MIN_SAMPLE, { price: 120_000, area: 100 }), 'sale');
    expect(enough).toEqual({ listingCount: 10, pricedCount: 10, priceMedian: 120_000, pricePerSqmMedian: 1200, pricePerSqmCount: 10 });

    const few = priceFigures(many(PRICE_TABLE_MIN_SAMPLE - 1), 'sale');
    expect(few.priceMedian).toBeNull();
    expect(few.pricePerSqmMedian).toBeNull();
    expect(few.listingCount).toBe(PRICE_TABLE_MIN_SAMPLE - 1);
  });

  it('needs enough listings with an area for the price per m², separately from the price', () => {
    const figures = priceFigures([...many(8, { area: 90 }), ...many(4, { area: 0 })], 'sale');
    expect(figures.priceMedian).toBe(100_000);
    expect(figures.pricePerSqmMedian).toBeNull();
    expect(figures.pricePerSqmCount).toBe(8);
  });
});

describe('buildPriceTable', () => {
  const now = new Date('2026-11-22T10:00:00Z');

  it('has every country, busiest first, with merged city rows that link to market pages', () => {
    const table = buildPriceTable([
      ...many(8),
      ...many(4, { city: 'Tiranë', price: 140_000 }),
      ...many(10, { deal: 'rent', price: 500, area: 50, rentPeriod: 'monthly' }),
      ...many(3, { city: 'Berat' }),
      ...many(12, { country: 'Kosovo', city: 'Prishtina' }),
      ...many(5, { country: 'Italy', city: 'Rome' }),
    ], now);

    expect(table.generatedAt).toBe('2026-11-22T10:00:00.000Z');
    expect(table.countries).toHaveLength(10);
    expect(table.countries.map((c) => c.slug).slice(0, 2)).toEqual(['albania', 'kosovo']);

    const albania = table.countries[0];
    expect(albania.sale.listingCount).toBe(15);
    expect(albania.rent).toMatchObject({ listingCount: 10, priceMedian: 500, pricePerSqmMedian: 10 });
    // Tirana + Tiranë are one row; Berat has too few listings for a row
    expect(albania.cities).toHaveLength(1);
    expect(albania.cities[0]).toMatchObject({ slug: 'tirana', name: 'Tirana' });
    expect(albania.cities[0].sale).toMatchObject({ listingCount: 12, priceMedian: 100_000 });

    expect(table.countries.find((c) => c.slug === 'greece')).toMatchObject({
      sale: { listingCount: 0, priceMedian: null },
      cities: [],
    });
    expect(table.countries.some((c) => c.name === 'Italy')).toBe(false);
  });
});

describe('priceTableCsv', () => {
  it('writes a country row then its cities, with empty cells for missing figures', () => {
    const table = buildPriceTable([...many(10), ...many(10, { deal: 'rent', price: 600, area: 60, rentPeriod: 'monthly' })], new Date('2026-11-22T00:00:00Z'));
    const lines = priceTableCsv(table).trim().split('\n');
    expect(lines[0]).toBe(PRICE_TABLE_CSV_HEADER.join(','));
    expect(lines[1]).toBe('Albania,,2026-11-22,10,100000,1250,10,600,10');
    expect(lines[2]).toBe('Albania,Tirana,2026-11-22,10,100000,1250,10,600,10');
    expect(lines).toContain('Greece,,2026-11-22,0,,,0,,');
  });

  it('quotes delimiters and stops a city name from running as a spreadsheet formula', () => {
    const figures = priceFigures(many(10), 'sale');
    const empty = priceFigures([], 'rent');
    const csv = priceTableCsv({
      generatedAt: '2026-11-22T00:00:00.000Z',
      minSample: PRICE_TABLE_MIN_SAMPLE,
      countries: [{
        slug: 'croatia', name: 'Croatia', code: 'HR', sale: figures, rent: empty,
        cities: [
          { slug: 'sv-filip-i-jakov', name: 'Sv. Filip, i Jakov', sale: figures, rent: empty },
          { slug: 'x', name: '=HYPERLINK("x")', sale: figures, rent: empty },
        ],
      }],
    });
    expect(csv).toContain('Croatia,"Sv. Filip, i Jakov",2026-11-22,');
    expect(csv).toContain(`Croatia,"'=HYPERLINK(""x"")",`);
  });
});

describe('price table endpoints', () => {
  const call = async (handler: typeof getPriceTableController) => {
    const res: any = { statusCode: 200, headers: {} as Record<string, string> };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: unknown) => { res.body = data; return res; };
    res.set = (key: string, value: string) => { res.headers[key] = value; return res; };
    res.type = () => res;
    res.send = (data: unknown) => { res.body = data; return res; };
    await handler({} as never, res);
    return res;
  };
  const aggregateResult = (rows: unknown[]) => ({ collation: () => Promise.resolve(rows) }) as never;

  afterEach(() => {
    jest.restoreAllMocks();
    clearPriceTableCache();
  });

  it('serves the table as JSON and as a dated CSV download', async () => {
    jest.spyOn(Property, 'aggregate').mockReturnValue(aggregateResult(
      Array.from({ length: 10 }, () => ({ listingType: 'sale', country: 'Albania', city: 'Tirana', price: 90_000, sqft: 60, propertyType: 'apartment' })),
    ));
    const json = await call(getPriceTableController);
    expect(json.statusCode).toBe(200);
    expect(json.body.countries[0]).toMatchObject({ slug: 'albania', sale: { priceMedian: 90_000, pricePerSqmMedian: 1500 } });

    const csv = await call(getPriceTableCsvController);
    expect(csv.headers['Content-Type']).toBe('text/csv; charset=utf-8');
    expect(csv.headers['Content-Disposition']).toMatch(/balkan-property-prices-\d{4}-\d{2}-\d{2}\.csv/);
    expect(csv.body).toContain('Albania,Tirana,');
    // Both answers came from one database read (cached)
    expect(Property.aggregate).toHaveBeenCalledTimes(1);
  });

  it('answers 500 with a readable message when the database fails', async () => {
    jest.spyOn(Property, 'aggregate').mockImplementation(() => { throw new Error('connection lost'); });
    const res = await call(getPriceTableController);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toMatch(/try again/i);
  });
});
