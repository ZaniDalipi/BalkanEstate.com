/**
 * The market pages controller and service with the database mocked: input
 * validation, the error answers, our own listings first, exact counts and the
 * "unknown city" answer that offers the country page.
 *
 * market-pages-api.test.ts runs the same flow against a real (in-memory)
 * MongoDB; this suite runs anywhere.
 */
process.env.SKIP_TEST_DB = 'true';

import Property from '../models/Property';
import { getMarketHubController, getMarketPageController } from '../controllers/marketPageController';
import { MIN_INDEXABLE_LISTINGS } from '../services/marketPages/marketStats';

jest.mock('../models/Agency', () => ({
  __esModule: true,
  default: { find: jest.fn(() => ({ lean: () => Promise.resolve([]) })) },
}));

type Handler = typeof getMarketPageController;

const call = async (handler: Handler, params: Record<string, string | undefined>) => {
  const req = { params, query: {} } as unknown as Parameters<Handler>[0];
  let body: any;
  let status = 200;
  const res: any = {
    status: (code: number) => { status = code; return res; },
    json: (data: unknown) => { body = data; return res; },
  };
  await handler(req, res);
  return { status, body };
};

/** `Property.aggregate([...]).collation()` resolving to `rows`. */
const aggregateResult = (rows: unknown[]) => ({ collation: () => Promise.resolve(rows) }) as never;

/** `Property.find().select().populate().collation().sort().limit().lean()` resolving to `rows`. */
const findResult = (rows: unknown[]) => {
  const chain: Record<string, unknown> = {};
  for (const step of ['select', 'populate', 'collation', 'sort', 'limit']) chain[step] = () => chain;
  chain.lean = () => Promise.resolve(rows);
  return chain as never;
};

const cityRows = [
  { _id: { country: 'Albania', city: 'Tirana' }, count: 7, indexableCount: 6 },
  { _id: { country: 'albania', city: 'Tiranë' }, count: 2, indexableCount: 0 },
  { _id: { country: 'Albania', city: 'Durrës' }, count: 3, indexableCount: 1 },
  { _id: { country: 'Albania', city: 'Show more' }, count: 4, indexableCount: 0 },
  { _id: { country: 'Kosovo', city: 'Prishtina' }, count: 2, indexableCount: 2 },
];

const statsRows = [100_000, 120_000, 140_000].map((price) => ({ price, sqft: 100, propertyType: 'apartment', indexable: true }));

const listingRow = (id: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  title: 'Flat in Tirana',
  price: 100_000,
  sqft: 80,
  city: 'Tirana',
  country: 'Albania',
  sellerId: { name: 'Agent', email: 'agent@example.com', phone: '+355 1' },
  ...extra,
});

afterEach(() => jest.restoreAllMocks());

describe('market page controller', () => {
  it('rejects malformed parameters with 400 before any query', async () => {
    const aggregate = jest.spyOn(Property, 'aggregate');
    for (const params of [
      { deal: 'buy' },
      { deal: 'sale', country: '{"$gt":""}' },
      { deal: 'sale', country: 'albania', city: '../x' },
      { deal: 'sale', country: 'albania', city: 'x'.repeat(200) },
    ]) {
      const { status, body } = await call(getMarketPageController, params);
      expect(status).toBe(400);
      expect(typeof body.message).toBe('string');
    }
    expect((await call(getMarketHubController, { deal: 'everything' })).status).toBe(400);
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('answers an unknown country with 404 without a query', async () => {
    const aggregate = jest.spyOn(Property, 'aggregate');
    const { status, body } = await call(getMarketPageController, { deal: 'sale', country: 'atlantis' });
    expect(status).toBe(404);
    expect(body.error).toBe('unknown-country');
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('answers a city with no listings with 404 and the country to offer instead', async () => {
    jest.spyOn(Property, 'aggregate').mockReturnValue(aggregateResult(cityRows));
    const { status, body } = await call(getMarketPageController, { deal: 'sale', country: 'albania', city: 'berat' });
    expect(status).toBe(404);
    expect(body).toMatchObject({ error: 'unknown-city', country: { slug: 'albania', name: 'Albania', code: 'AL' } });
  });

  it('builds a city page: merged spellings, exact counts, own listings first, sanitised rows', async () => {
    jest.spyOn(Property, 'aggregate')
      .mockReturnValueOnce(aggregateResult(cityRows))
      .mockReturnValueOnce(aggregateResult(statsRows));
    const find = jest.spyOn(Property, 'find')
      .mockReturnValueOnce(findResult([listingRow('64b000000000000000000001')]))
      .mockReturnValueOnce(findResult([listingRow('64b000000000000000000002', { source: 'other.al' })]));

    const { status, body } = await call(getMarketPageController, { deal: 'sale', country: 'albania', city: 'tirana' });
    expect(status).toBe(200);
    expect(body.city).toEqual({ slug: 'tirana', name: 'Tirana' });
    expect(body.stats).toMatchObject({ listingCount: 9, indexableCount: 6, priceMedian: 120_000, pricePerSqmMedian: 1200 });
    expect(body.indexable).toBe(6 >= MIN_INDEXABLE_LISTINGS);
    expect(body.cities.map((c: { slug: string }) => c.slug)).toEqual(['durres']);

    // First query asks for our own listings, the second fills up with the rest.
    const ownQuery = (find.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(ownQuery).toMatchObject({ status: 'active', listingType: 'sale', description: { $exists: true, $ne: '' } });
    expect(ownQuery.city).toEqual({ $in: expect.arrayContaining(['Tirana', 'Tiranë']) });
    const restQuery = (find.mock.calls[1] as unknown[])[0] as Record<string, unknown>;
    expect(restQuery._id).toEqual({ $nin: ['64b000000000000000000001'] });

    expect(body.listings).toHaveLength(2);
    expect(body.listings[1].source).toBe('other.al');
    // Sanitised like search results: no raw ids, no seller contact details
    expect(JSON.stringify(body.listings)).not.toContain('64b000000000000000000001');
    expect(JSON.stringify(body.listings)).not.toContain('agent@example.com');
  });

  it('only fills up with imported listings when our own do not fill the page', async () => {
    jest.spyOn(Property, 'aggregate')
      .mockReturnValueOnce(aggregateResult(cityRows))
      .mockReturnValueOnce(aggregateResult([]));
    const ownRows = Array.from({ length: 24 }, (_, i) => listingRow(`64b0000000000000000001${String(i).padStart(2, '0')}`));
    const find = jest.spyOn(Property, 'find').mockReturnValueOnce(findResult(ownRows));

    const { body } = await call(getMarketPageController, { deal: 'sale', country: 'albania' });
    expect(find).toHaveBeenCalledTimes(1);
    expect(body.listings).toHaveLength(24);
    // Country page: every usable city, junk city names left out
    expect(body.cities.map((c: { slug: string }) => c.slug)).toEqual(['tirana', 'durres']);
    expect(body.stats.listingCount).toBe(16);
  });

  it('answers 500 with a readable message when the database fails', async () => {
    jest.spyOn(Property, 'aggregate').mockImplementation(() => {
      throw new Error('connection lost');
    });
    const page = await call(getMarketPageController, { deal: 'rent', country: 'albania' });
    expect(page.status).toBe(500);
    expect(page.body.message).toMatch(/try again/i);
    expect(JSON.stringify(page.body)).not.toContain('connection lost');

    const hub = await call(getMarketHubController, { deal: 'sale' });
    expect(hub.status).toBe(500);
  });

  it('lists all ten countries on the overview, with counts and cities', async () => {
    jest.spyOn(Property, 'aggregate').mockReturnValue(aggregateResult(cityRows));
    const { status, body } = await call(getMarketHubController, { deal: 'sale' });
    expect(status).toBe(200);
    expect(body.countries).toHaveLength(10);
    expect(body.countries.find((c: { slug: string }) => c.slug === 'albania')).toMatchObject({
      count: 16,
      indexableCount: 7,
      indexable: true,
      cities: [expect.objectContaining({ slug: 'tirana', count: 9 }), expect.objectContaining({ slug: 'durres' })],
    });
    expect(body.countries.find((c: { slug: string }) => c.slug === 'greece')).toMatchObject({ count: 0, indexable: false, cities: [] });
  });
});
