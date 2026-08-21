/**
 * City Showcase API Tests
 * Tests: the public list endpoint that feeds the home-page elastic gallery.
 */

import request from 'supertest';
import express from 'express';
import CityShowcase from '../models/CityShowcase';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  const cityShowcaseRoutes = require('../routes/cityShowcaseRoutes').default;
  app.use('/api/city-showcase', cityShowcaseRoutes);
  return app;
};

const createPanel = (overrides: Record<string, unknown> = {}) =>
  CityShowcase.create({
    city: 'Belgrade',
    country: 'Serbia',
    searchQuery: 'Belgrade',
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/belgrade.jpg',
    displayOrder: 0,
    isActive: true,
    ...overrides,
  });

describe('City Showcase API', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/city-showcase', () => {
    it('returns an empty list when nothing is curated', async () => {
      const res = await request(app).get('/api/city-showcase');

      // Empty rather than an error: the gallery's only source of truth is this
      // collection, so "nothing curated" means "no section", not "failure".
      expect(res.status).toBe(200);
      expect(res.body.cities).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('returns active panels in display order', async () => {
      await createPanel({ city: 'Split', searchQuery: 'Split', displayOrder: 2 });
      await createPanel({ city: 'Ohrid', searchQuery: 'Ohrid', displayOrder: 1 });

      const res = await request(app).get('/api/city-showcase');

      expect(res.status).toBe(200);
      expect(res.body.cities.map((c: { city: string }) => c.city)).toEqual(['Ohrid', 'Split']);
    });

    it('omits hidden panels', async () => {
      await createPanel({ city: 'Kotor', searchQuery: 'Kotor', isActive: false });
      await createPanel({ city: 'Budva', searchQuery: 'Budva' });

      const res = await request(app).get('/api/city-showcase');

      expect(res.body.cities).toHaveLength(1);
      expect(res.body.cities[0].city).toBe('Budva');
    });

    it('exposes only the fields the gallery renders', async () => {
      await createPanel({ imagePublicId: 'cities/belgrade' });

      const res = await request(app).get('/api/city-showcase');

      const [panel] = res.body.cities;
      expect(panel).toMatchObject({
        city: 'Belgrade',
        country: 'Serbia',
        searchQuery: 'Belgrade',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/belgrade.jpg',
      });
      // Internal bookkeeping stays server-side.
      expect(panel.imagePublicId).toBeUndefined();
      expect(panel.displayOrder).toBeUndefined();
    });
  });

  describe('CityShowcase model', () => {
    it('rejects a panel without a photo', async () => {
      // The gallery has no stand-in image, so a row that cannot be drawn must
      // not be storable in the first place.
      await expect(
        CityShowcase.create({
          city: 'Tirana',
          country: 'Albania',
          searchQuery: 'Tirana',
        })
      ).rejects.toThrow();
    });
  });
});
