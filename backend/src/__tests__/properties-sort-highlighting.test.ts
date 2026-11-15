/**
 * GET /api/properties — the visitor's sortBy must survive the promotion re-sort.
 * Promoted listings lead; within the standard tier the database order (price,
 * size) is kept instead of being reshuffled by lastRenewed.
 */

import request from 'supertest';
import express, { Express } from 'express';
import Property from '../models/Property';
import User from '../models/User';
import propertyRoutes from '../routes/propertyRoutes';
import { createMockUser } from './setup';

const DAY = 24 * 60 * 60 * 1000;

describe('GET /api/properties sort with highlighting', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/properties', propertyRoutes);
  });

  const seed = async () => {
    const seller = await User.create(createMockUser({
      email: 'sort-seller@example.com',
      phone: '+38344111222',
      role: 'private_seller',
    }));

    const listing = (overrides: Record<string, unknown>) => ({
      sellerId: seller._id,
      createdByName: 'Sort Seller',
      createdByEmail: 'sort-seller@example.com',
      status: 'active',
      address: 'Test Street 1',
      city: 'Pristina',
      country: 'Kosovo',
      beds: 2,
      baths: 1,
      livingRooms: 1,
      yearBuilt: 2020,
      parking: 1,
      description: 'Test property',
      imageUrl: 'https://example.com/image.jpg',
      images: [],
      lat: 42.6629,
      lng: 21.1655,
      propertyType: 'apartment',
      specialFeatures: [],
      materials: [],
      ...overrides,
    });

    const now = Date.now();
    // Newest-renewed order (200k, 100k, 300k) matches neither price nor size
    // order, so any lastRenewed re-sort would break every sortBy below.
    await Property.create([
      listing({ price: 300000, sqft: 60, lastRenewed: new Date(now - 3 * DAY) }),
      listing({ price: 100000, sqft: 120, lastRenewed: new Date(now - 2 * DAY) }),
      listing({ price: 200000, sqft: 90, lastRenewed: new Date(now - 1 * DAY) }),
      listing({
        price: 900000,
        sqft: 200,
        lastRenewed: new Date(now - 10 * DAY),
        isPromoted: true,
        promotionTier: 'premium',
        promotionEndDate: new Date(now + 7 * DAY),
      }),
    ]);
  };

  const prices = (body: { properties: Array<{ price: number }> }) =>
    body.properties.map((p) => p.price);
  const sqfts = (body: { properties: Array<{ sqft: number }> }) =>
    body.properties.map((p) => p.sqft);

  it('keeps ascending price for standard listings, promoted first (price-low)', async () => {
    await seed();
    const res = await request(app).get('/api/properties?sortBy=price-low');

    expect(res.status).toBe(200);
    expect(prices(res.body)).toEqual([900000, 100000, 200000, 300000]);
  });

  it('keeps descending price for standard listings (price-high)', async () => {
    await seed();
    const res = await request(app).get('/api/properties?sortBy=price-high');

    expect(res.status).toBe(200);
    expect(prices(res.body)).toEqual([900000, 300000, 200000, 100000]);
  });

  it('keeps ascending size for standard listings (sqft-low)', async () => {
    await seed();
    const res = await request(app).get('/api/properties?sortBy=sqft-low');

    expect(res.status).toBe(200);
    expect(sqfts(res.body)).toEqual([200, 60, 90, 120]);
  });

  it('falls back to newest-renewed first when no sortBy is given', async () => {
    await seed();
    const res = await request(app).get('/api/properties');

    expect(res.status).toBe(200);
    expect(prices(res.body)).toEqual([900000, 200000, 100000, 300000]);
  });
});
