/**
 * `GET /properties/:id/area-prices` — the homes around a listing, what they
 * ask and what they sold for. Sold listings older than a day must still count:
 * they are the price history of the street.
 */

import mongoose from 'mongoose';
import Property from '../models/Property';
import { getAreaPrices } from '../controllers/propertyController';

const sellerId = new mongoose.Types.ObjectId();
const subjectId = new mongoose.Types.ObjectId();

// Prishtina centre; 0.001° of latitude is ~111 m
const LAT = 42.6629;
const LNG = 21.1655;

const call = async (id: string) => {
  const req: any = { params: { id }, query: {} };
  let body: any;
  let status = 200;
  const res: any = {
    status: (code: number) => { status = code; return res; },
    json: (data: any) => { body = data; return res; },
  };
  await getAreaPrices(req, res);
  return { status, body };
};

let n = 0;
const home = (extra: Record<string, any> = {}) => ({
  sellerId,
  title: `Home ${++n}`,
  propertyId: `BE-${5000 + n}`,
  address: `Street ${n}`,
  city: 'Prishtina',
  country: 'Kosovo',
  price: 100_000,
  sqft: 100,
  propertyType: 'apartment',
  status: 'active',
  listingType: 'sale',
  lat: LAT,
  lng: LNG,
  createdAt: new Date(),
  ...extra,
});

describe('getAreaPrices', () => {
  it('lists nearby homes, sold ones included, nearest first', async () => {
    const longAgo = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    await Property.collection.insertMany([
      home({ _id: subjectId, price: 132_000 }),
      ...Array.from({ length: 6 }, (_, i) => home({ lat: LAT + 0.001 * (i + 1), price: 110_000 + i * 2_000 })),
      home({ lat: LAT + 0.0005, price: 140_000, status: 'sold', soldAt: longAgo }),
      home({ lat: LAT + 0.002, price: 150_000, status: 'sold', soldAt: longAgo }),
      // Excluded: a draft, a rental, and a home 30 km away
      home({ status: 'draft' }),
      home({ listingType: 'rent', price: 500 }),
      home({ lat: LAT + 0.27 }),
    ]);

    const { status, body } = await call(String(subjectId));

    expect(status).toBe(200);
    expect(body.radiusKm).toBe(1);
    expect(body.sameTypeOnly).toBe(true);
    expect(body.neighbours).toHaveLength(8);
    expect(body.neighbours.map((x: any) => x.id)).not.toContain(String(subjectId));
    // Nearest first: the sold home 55 m away
    expect(body.neighbours[0]).toMatchObject({ status: 'sold', price: 140_000, pricePerSqm: 1400 });
    expect(body.neighbours[0].closedAt).toBeDefined();
    expect(body.stats).toMatchObject({ activeCount: 6, closedCount: 2, medianClosedPricePerSqm: 1450 });
    expect(body.subject.pricePerSqm).toBe(1320);
    expect(body.trend.some((t: any) => t.closedCount > 0)).toBe(true);
  });

  it('widens the radius, then the property types, when the area is sparse', async () => {
    await Property.collection.insertMany([
      home({ _id: subjectId }),
      // 3 km away: past 1 and 2 km, inside 4 km
      ...Array.from({ length: 4 }, () => home({ lat: LAT + 0.027 })),
      ...Array.from({ length: 5 }, () => home({ lat: LAT + 0.027, propertyType: 'house' })),
    ]);

    const { body } = await call(String(subjectId));

    expect(body.radiusKm).toBe(8);
    expect(body.sameTypeOnly).toBe(false);
    expect(body.neighbours).toHaveLength(9);
  });

  it('returns 404 for an unknown property', async () => {
    const { status } = await call(String(new mongoose.Types.ObjectId()));
    expect(status).toBe(404);
  });
});
