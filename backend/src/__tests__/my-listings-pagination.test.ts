/**
 * My Listings loads in chunks: `GET /properties/my/listings?limit=` returns one
 * page, filtered and ordered on the server, so an agent with hundreds of
 * listings sees the first 20 at once instead of waiting for all of them.
 */

import mongoose from 'mongoose';
import Property from '../models/Property';
import User from '../models/User';
import { getMyListings } from '../controllers/propertyController';

const sellerId = new mongoose.Types.ObjectId();
const otherSellerId = new mongoose.Types.ObjectId();

const call = async (query: Record<string, string>) => {
  const req: any = { user: { _id: sellerId, id: String(sellerId) }, query };
  let body: any;
  let status = 200;
  const res: any = {
    status: (code: number) => { status = code; return res; },
    json: (data: any) => { body = data; return res; },
  };
  await getMyListings(req, res);
  return { status, body };
};

const base = (i: number, extra: Record<string, any> = {}) => ({
  sellerId,
  title: `Listing ${i}`,
  propertyId: `BE-${1000 + i}`,
  address: `Street ${i}`,
  city: i % 2 ? 'Tirana' : 'Durres',
  country: 'Albania',
  price: 1000 * i,
  status: 'active',
  listingType: 'sale',
  createdAsRole: 'agent',
  createdAt: new Date(2026, 0, 1 + i),
  ...extra,
});

beforeEach(async () => {
  await User.collection.insertOne({ _id: sellerId, name: 'Agent', email: 'a@example.com', role: 'agent' });
  const docs = [
    ...Array.from({ length: 45 }, (_, i) => base(i)),
    base(100, { status: 'sold', title: 'Sold one' }),
    base(101, { status: 'draft', listingType: 'rent', createdAsRole: 'private_seller' }),
    base(102, { status: 'pending', listingType: undefined }),
    { ...base(103), sellerId: otherSellerId },
  ];
  await Property.collection.insertMany(docs);
});

describe('getMyListings pagination', () => {
  it('returns the first chunk with totals and counts', async () => {
    const { status, body } = await call({ offset: '0', limit: '20' });
    expect(status).toBe(200);
    expect(body.properties).toHaveLength(20);
    expect(body.pagination).toMatchObject({ total: 48, hasMore: true });
    expect(body.counts).toEqual({ all: 48, sale: 47, rent: 1, private_seller: 1, agent: 47 });
    // Newest active listing first
    expect(body.properties[0].title).toBe('Listing 44');
  });

  it('walks through every listing exactly once, in status order', async () => {
    const seen: any[] = [];
    let offset = 0;
    for (;;) {
      const { body } = await call({ offset: String(offset), limit: '20' });
      seen.push(...body.properties);
      offset += body.properties.length;
      if (offset > 0) expect(body.counts === undefined).toBe(offset > 20);
      if (!body.pagination.hasMore) break;
    }
    expect(seen).toHaveLength(48);
    expect(new Set(seen.map(p => p.id)).size).toBe(48);
    expect(seen.slice(-3).map(p => p.status)).toEqual(['pending', 'draft', 'sold']);
  });

  it('filters by status, listing type, role and search on the server', async () => {
    expect((await call({ limit: '20', status: 'sold' })).body.properties.map((p: any) => p.title)).toEqual(['Sold one']);
    expect((await call({ limit: '20', listingType: 'rent' })).body.pagination.total).toBe(1);
    // Legacy listings without a listingType count as sales
    expect((await call({ limit: '20', listingType: 'sale' })).body.pagination.total).toBe(47);
    expect((await call({ limit: '20', role: 'private_seller' })).body.pagination.total).toBe(1);
    expect((await call({ limit: '20', search: 'be-1044' })).body.properties.map((p: any) => p.title)).toEqual(['Listing 44']);
    // Regex characters in the search are taken literally
    expect((await call({ limit: '20', search: '.*' })).body.pagination.total).toBe(0);
  });

  it('still returns every listing when no limit is given', async () => {
    const { body } = await call({});
    expect(body.properties).toHaveLength(48);
    expect(body.pagination).toBeUndefined();
  });
});
