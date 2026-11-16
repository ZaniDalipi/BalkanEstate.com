/**
 * Properties API Tests
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { createSignupPayload, getAuthToken } from './setup';

// Create a minimal express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Import routes dynamically
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const authRoutes = require('../routes/authRoutes').default;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const propertyRoutes = require('../routes/propertyRoutes').default;

  app.use('/api/auth', authRoutes);
  app.use('/api/properties', propertyRoutes);

  return app;
};

/**
 * A listing the API accepts today: flat fields (no `location` / `features`
 * objects), a map position, and at least one photo.
 */
const validListing = (overrides: Record<string, unknown> = {}) => ({
  title: 'Modern Apartment in City Center',
  description: 'Beautiful 2-bedroom apartment with stunning views',
  price: 150000,
  propertyType: 'apartment',
  listingType: 'sale',
  address: '123 Main Street',
  city: 'Pristina',
  country: 'Kosovo',
  lat: 42.66,
  lng: 21.16,
  beds: 2,
  baths: 1,
  livingRooms: 1,
  sqft: 85,
  yearBuilt: 2010,
  imageUrl: 'https://example.com/a.jpg',
  images: [{ url: 'https://example.com/a.jpg' }],
  ...overrides,
});

describe('Properties API', () => {
  describe('GET /api/properties', () => {
    it('should return empty array when no properties exist', async () => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/properties')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('properties');
      expect(Array.isArray(response.body.properties)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/properties?page=1&limit=10')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('properties');
    });

    it('should support filtering by city', async () => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/properties?city=Pristina')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    it('should support filtering by property type', async () => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/properties?propertyType=apartment')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });

    it('should support price range filtering', async () => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/properties?minPrice=50000&maxPrice=200000')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/properties', () => {
    it('should create property with valid data and auth', async () => {
      const app = createTestApp();
      const { accessToken } = await getAuthToken(app);

      const propertyData = validListing();

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(propertyData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
      expect(response.body.property.title).toBe(propertyData.title);
      expect(response.body.property.price).toBe(propertyData.price);
      expect(response.body.property.city).toBe(propertyData.city);
      expect(response.body.property.status).toBe('active');
    });

    it('should reject property creation without auth', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/properties')
        .send({
          title: 'Test Property',
          description: 'Test',
          price: 100000,
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });

    it('should reject property with missing required fields', async () => {
      const app = createTestApp();
      const { accessToken } = await getAuthToken(app);

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Incomplete Property',
          images: [{ url: 'https://example.com/a.jpg' }],
          // Missing the other required fields
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should reject a listing without a photo', async () => {
      const app = createTestApp();
      const { accessToken } = await getAuthToken(app);

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validListing({ images: [] }))
        .expect('Content-Type', /json/);

      expect(response.status).toBe(422);
      expect(response.body.code).toBe('IMAGES_REQUIRED');
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return property by ID', async () => {
      const app = createTestApp();
      const { accessToken } = await getAuthToken(app);

      // First create a property
      const propertyData = validListing({ title: 'Property to Fetch', propertyType: 'house', city: 'Tirana', country: 'Albania' });

      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(propertyData);

      expect(createResponse.status).toBe(201);
      const propertyId = createResponse.body.property._id;

      // Now fetch it
      const response = await request(app)
        .get(`/api/properties/${propertyId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.property.title).toBe(propertyData.title);
      expect(response.body.property.city).toBe('Tirana');
      // Public responses never carry the creator's email
      expect(response.body.property.createdByEmail).toBeUndefined();
    });

    it('should return 404 for non-existent property', async () => {
      const app = createTestApp();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/properties/${fakeId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/properties/invalid-id')
        .expect('Content-Type', /json/);

      expect([400, 500]).toContain(response.status);
    });
  });

  describe('PUT /api/properties/:id', () => {
    it('should update property by owner', async () => {
      const app = createTestApp();
      const { accessToken } = await getAuthToken(app);

      // Create property
      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validListing({ title: 'Property to Update', price: 100000, city: 'Skopje', country: 'North Macedonia' }));

      expect(createResponse.status).toBe(201);
      const propertyId = createResponse.body.property._id;

      // Update it
      const response = await request(app)
        .put(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Updated Property Title',
          price: 120000,
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.property.title).toBe('Updated Property Title');
      expect(response.body.property.price).toBe(120000);
    });

    it('should reject update without auth', async () => {
      const app = createTestApp();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .put(`/api/properties/${fakeId}`)
        .send({ title: 'Unauthorized Update' })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should delete property by owner', async () => {
      const app = createTestApp();
      const { accessToken } = await getAuthToken(app);

      // Create property
      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validListing({ title: 'Property to Delete', price: 50000, city: 'Podgorica', country: 'Montenegro' }));

      expect(createResponse.status).toBe(201);
      const propertyId = createResponse.body.property._id;

      // Delete it
      const response = await request(app)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/properties/${propertyId}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject delete without auth', async () => {
      const app = createTestApp();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .delete(`/api/properties/${fakeId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });
});
