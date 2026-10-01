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
    expect(body.neighbours[0]).toMatchObject({ status: 'sold', price: 140_000, pricePerSqm: 1400, value: 1400, closedPrice: 140_000 });
    expect(body.neighbours[0].closedAt).toBeDefined();
    expect(body.stats).toMatchObject({ activeCount: 6, closedCount: 2, medianClosedValue: 1450 });
    expect(body.subject).toMatchObject({ pricePerSqm: 1320, value: 1320 });
    expect(body.metric).toBe('perSqm');
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

  it('compares a monthly rental with monthly and weekly lets only, with their past rents', async () => {
    const rent = (extra: Record<string, any>) => home({ listingType: 'rent', price: 600, sqft: 60, ...extra });
    await Property.collection.insertMany([
      rent({ _id: subjectId, price: 720 }),
      ...Array.from({ length: 6 }, (_, i) => rent({ lat: LAT + 0.001 * (i + 1) })),
      // A weekly let counts as ~4.33 weeks a month
      rent({ lat: LAT + 0.0005, price: 150, rentPeriod: 'weekly' }),
      // Back on the market, let twice before; the tenant must never leak
      rent({
        lat: LAT + 0.0007,
        rentalHistory: [
          { startDate: new Date('2025-01-01T00:00:00Z'), endDate: new Date('2025-12-31T00:00:00Z'), monthlyRent: 540, tenantName: 'Secret Tenant', notes: 'private' },
        ],
      }),
      // A holiday let priced per night is another market altogether
      rent({ lat: LAT + 0.0003, price: 80, rentPeriod: 'daily' }),
    ]);

    const { status, body } = await call(String(subjectId));

    expect(status).toBe(200);
    expect(body).toMatchObject({ listingType: 'rent', rentUnit: 'month', metric: 'perSqm' });
    expect(body.subject.value).toBe(12);
    expect(body.neighbours).toHaveLength(8);
    expect(body.neighbours.find((n: any) => n.price === 80)).toBeUndefined();
    expect(body.neighbours.find((n: any) => n.price === 650)).toMatchObject({ value: 10.8 });
    expect(body.neighbours.find((n: any) => n.closedPrice === 540)).toMatchObject({ status: 'active', closedValue: 9 });
    expect(body.stats).toMatchObject({ closedCount: 1, medianClosedValue: 9 });
    expect(JSON.stringify(body)).not.toMatch(/Secret Tenant|private/);
  });

  it('compares a nightly let on its nightly price, with nightly lets only', async () => {
    const stay = (extra: Record<string, any>) => home({ listingType: 'rent', rentPeriod: 'daily', price: 70, ...extra });
    await Property.collection.insertMany([
      stay({ _id: subjectId, price: 90 }),
      ...Array.from({ length: 8 }, (_, i) => stay({ lat: LAT + 0.001 * (i + 1), price: 60 + i * 5 })),
      home({ listingType: 'rent', price: 600, lat: LAT + 0.0002 }),
    ]);

    const { body } = await call(String(subjectId));

    expect(body).toMatchObject({ rentUnit: 'night', metric: 'price' });
    expect(body.neighbours).toHaveLength(8);
    expect(body.subject.value).toBe(90);
    // Median of 60..95 is 77.5; 90 is 16.1% above it
    expect(body.stats.subjectVsMedianPct).toBe(16.1);
  });

  it('widens a luxury villa to villas, never to flats', async () => {
    await Property.collection.insertMany([
      home({ _id: subjectId, propertyType: 'luxury-villa', price: 900_000, sqft: 300 }),
      ...Array.from({ length: 3 }, () => home({ propertyType: 'luxury-villa', lat: LAT + 0.002, price: 800_000, sqft: 300 })),
      ...Array.from({ length: 3 }, () => home({ propertyType: 'villa', lat: LAT + 0.002, price: 500_000, sqft: 250 })),
      ...Array.from({ length: 10 }, () => home({ propertyType: 'apartment', lat: LAT + 0.002 })),
    ]);

    const { body } = await call(String(subjectId));

    expect(body.sameTypeOnly).toBe(false);
    expect(body.neighbours).toHaveLength(6);
    expect(body.neighbours.every((n: any) => ['luxury-villa', 'villa'].includes(n.propertyType))).toBe(true);
  });

  it('returns 404 for an unknown property', async () => {
    const { status } = await call(String(new mongoose.Types.ObjectId()));
    expect(status).toBe(404);
  });
});
