/**
 * `GET /api/market-pages/:deal[/:country[/:city]]` — the data behind the
 * "property for sale / for rent in …" landing pages, read from real listings.
 */
import mongoose from 'mongoose';
import Property from '../models/Property';
import { getMarketHubController, getMarketPageController } from '../controllers/marketPageController';
import { MIN_INDEXABLE_LISTINGS } from '../services/marketPages/marketStats';
import { MARKET_LISTING_LIMIT } from '../services/marketPages/marketPageService';

const sellerId = new mongoose.Types.ObjectId();

const call = async (
  handler: typeof getMarketPageController,
  params: Record<string, string | undefined>,
) => {
  const req: any = { params, query: {} };
  let body: any;
  let status = 200;
  const res: any = {
    status: (code: number) => { status = code; return res; },
    json: (data: any) => { body = data; return res; },
  };
  await handler(req, res);
  return { status, body };
};

let n = 0;
const listing = (extra: Record<string, any> = {}) => ({
  sellerId,
  title: `Home ${++n}`,
  propertyId: `BE-${9000 + n}`,
  address: `Street ${n}`,
  city: 'Tirana',
  country: 'Albania',
  price: 100_000,
  sqft: 100,
  propertyType: 'apartment',
  status: 'active',
  listingType: 'sale',
  description: 'Bright flat near the centre.',
  lat: 41.33,
  lng: 19.82,
  createdAt: new Date(Date.now() - n * 1000),
  ...extra,
});

const own = (count: number, extra: Record<string, any> = {}) => Array.from({ length: count }, () => listing(extra));

describe('market pages API', () => {
  it('builds a city page from live listings, merging spellings of the city', async () => {
    await Property.collection.insertMany([
      ...own(MIN_INDEXABLE_LISTINGS, { price: 120_000, sqft: 80 }),
      listing({ city: 'Tiranë', price: 90_000, sqft: 60 }),
      // Imported: counted and shown, but not towards indexing
      listing({ source: 'other-site.al', price: 150_000 }),
      // Not on this page: sold, draft, a rental, another city
      listing({ status: 'sold' }),
      listing({ status: 'draft' }),
      listing({ listingType: 'rent', price: 500 }),
      listing({ city: 'Durrës' }),
    ]);

    const { status, body } = await call(getMarketPageController, { deal: 'sale', country: 'albania', city: 'tirana' });
    expect(status).toBe(200);
    expect(body.country).toEqual({ slug: 'albania', name: 'Albania', code: 'AL' });
    expect(body.city).toEqual({ slug: 'tirana', name: 'Tirana' });
    expect(body.stats.listingCount).toBe(MIN_INDEXABLE_LISTINGS + 2);
    expect(body.stats.indexableCount).toBe(MIN_INDEXABLE_LISTINGS + 1);
    expect(body.stats.priceMedian).toBe(120_000);
    expect(body.indexable).toBe(true);
    expect(body.listings).toHaveLength(MIN_INDEXABLE_LISTINGS + 2);
    // Our own listings come before the imported one
    expect(body.listings.at(-1).source).toBe('other-site.al');
    // List rows are sanitised like search results: encoded ids, no description
    expect(body.listings[0].description).toBeUndefined();
    expect(String(body.listings[0].id ?? body.listings[0]._id)).not.toMatch(/^[a-f0-9]{24}$/);
    expect(body.cities.map((c: any) => c.slug)).toEqual(['durres']);
  });

  it('marks a page with too few of our own listings as not indexable', async () => {
    await Property.collection.insertMany([
      ...own(MIN_INDEXABLE_LISTINGS - 1, { city: 'Berat' }),
      ...own(3, { city: 'Berat', description: '' }),
    ]);
    const { status, body } = await call(getMarketPageController, { deal: 'sale', country: 'albania', city: 'berat' });
    expect(status).toBe(200);
    expect(body.stats.listingCount).toBe(MIN_INDEXABLE_LISTINGS + 2);
    expect(body.indexable).toBe(false);
  });

  it('keeps nightly stays off the rent pages', async () => {
    await Property.collection.insertMany([
      ...own(3, { listingType: 'rent', price: 600, rentPeriod: 'monthly' }),
      listing({ listingType: 'rent', price: 90, rentPeriod: 'daily' }),
    ]);
    const { body } = await call(getMarketPageController, { deal: 'rent', country: 'albania' });
    expect(body.stats.listingCount).toBe(3);
    expect(body.stats.priceMedian).toBe(600);
    expect(body.stats.pricePerSqmMedian).toBe(6);
  });

  it('caps the listing cards', async () => {
    await Property.collection.insertMany(own(MARKET_LISTING_LIMIT + 3));
    const { body } = await call(getMarketPageController, { deal: 'sale', country: 'albania' });
    expect(body.listings).toHaveLength(MARKET_LISTING_LIMIT);
    expect(body.stats.listingCount).toBe(MARKET_LISTING_LIMIT + 3);
  });

  it('answers a country with no listings yet with an empty page, not an error', async () => {
    const { status, body } = await call(getMarketPageController, { deal: 'sale', country: 'greece' });
    expect(status).toBe(200);
    expect(body.stats.listingCount).toBe(0);
    expect(body.stats.priceMedian).toBeNull();
    expect(body.listings).toEqual([]);
    expect(body.indexable).toBe(false);
  });

  it('is 404 for an unknown country, and for a city with no listings — offering the country', async () => {
    const country = await call(getMarketPageController, { deal: 'sale', country: 'atlantis' });
    expect(country.status).toBe(404);
    expect(country.body.error).toBe('unknown-country');

    const city = await call(getMarketPageController, { deal: 'sale', country: 'albania', city: 'nowhere' });
    expect(city.status).toBe(404);
    expect(city.body).toMatchObject({ error: 'unknown-city', country: { slug: 'albania', name: 'Albania' } });
  });

  it('is 400 for malformed parameters, before touching the database', async () => {
    const find = jest.spyOn(Property, 'aggregate');
    expect((await call(getMarketPageController, { deal: 'buy', country: 'albania' })).status).toBe(400);
    expect((await call(getMarketPageController, { deal: 'sale', country: '{"$gt":""}' })).status).toBe(400);
    expect((await call(getMarketPageController, { deal: 'sale', country: 'albania', city: '../x' })).status).toBe(400);
    expect(find).not.toHaveBeenCalled();
    find.mockRestore();
  });

  it('is 500 with a readable message when the database fails', async () => {
    const find = jest.spyOn(Property, 'aggregate').mockImplementation(() => {
      throw new Error('connection lost');
    });
    const { status, body } = await call(getMarketPageController, { deal: 'sale', country: 'albania' });
    expect(status).toBe(500);
    expect(body.message).toMatch(/try again/i);
    find.mockRestore();
  });

  it('lists every country on the overview, with their cities', async () => {
    await Property.collection.insertMany([
      ...own(MIN_INDEXABLE_LISTINGS),
      ...own(2, { country: 'Kosovo', city: 'Prishtina' }),
      listing({ country: 'Italy', city: 'Rome' }),
    ]);
    const { status, body } = await call(getMarketHubController, { deal: 'sale' });
    expect(status).toBe(200);
    expect(body.countries).toHaveLength(10);
    const albania = body.countries.find((c: any) => c.slug === 'albania');
    expect(albania).toMatchObject({ count: MIN_INDEXABLE_LISTINGS, indexable: true });
    expect(albania.cities[0]).toMatchObject({ slug: 'tirana', count: MIN_INDEXABLE_LISTINGS });
    const kosovo = body.countries.find((c: any) => c.slug === 'kosovo');
    expect(kosovo).toMatchObject({ count: 2, indexable: false });
    expect(body.countries.some((c: any) => c.name === 'Italy')).toBe(false);
  });
});
