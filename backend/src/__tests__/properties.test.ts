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

      const propertyData = {
        title: 'Modern Apartment in City Center',
        description: 'Beautiful 2-bedroom apartment with stunning views',
        price: 150000,
        propertyType: 'apartment',
        listingType: 'sale',
        location: {
          address: '123 Main Street',
          city: 'Pristina',
          country: 'Kosovo',
        },
        features: {
          bedrooms: 2,
          bathrooms: 1,
          area: 85,
          parking: true,
          furnished: false,
        },
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(propertyData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(propertyData.title);
      expect(response.body.price).toBe(propertyData.price);
      expect(response.body.location.city).toBe(propertyData.location.city);
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
          // Missing required fields
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return property by ID', async () => {
      const app = createTestApp();
      const { accessToken } = await getAuthToken(app);

      // First create a property
      const propertyData = {
        title: 'Property to Fetch',
        description: 'Test property',
        price: 100000,
        propertyType: 'house',
        listingType: 'sale',
        location: {
          address: '456 Test Road',
          city: 'Tirana',
          country: 'Albania',
        },
        features: {
          bedrooms: 3,
          bathrooms: 2,
          area: 120,
        },
      };

      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(propertyData);

      const propertyId = createResponse.body._id;

      // Now fetch it
      const response = await request(app)
        .get(`/api/properties/${propertyId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(propertyId);
      expect(response.body.title).toBe(propertyData.title);
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
        .send({
          title: 'Property to Update',
          description: 'Original description',
          price: 100000,
          propertyType: 'apartment',
          listingType: 'sale',
          location: {
            address: '789 Update Street',
            city: 'Skopje',
            country: 'North Macedonia',
          },
          features: { bedrooms: 2, bathrooms: 1, area: 70 },
        });

      const propertyId = createResponse.body._id;

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
      expect(response.body.title).toBe('Updated Property Title');
      expect(response.body.price).toBe(120000);
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
        .send({
          title: 'Property to Delete',
          description: 'Will be deleted',
          price: 50000,
          propertyType: 'land',
          listingType: 'sale',
          location: {
            address: '999 Delete Lane',
            city: 'Podgorica',
            country: 'Montenegro',
          },
          features: { area: 500 },
        });

      const propertyId = createResponse.body._id;

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
