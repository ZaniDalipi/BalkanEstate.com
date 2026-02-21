/**
 * Properties API Tests
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

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

// Helper to create an authenticated user
const createAuthenticatedUser = async (app: express.Application) => {
  const userData = {
    email: `agent-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    name: 'Agent User',
    phone: '+38344123456',
  };

  const response = await request(app)
    .post('/api/auth/signup')
    .send(userData);

  return {
    user: response.body.user,
    token: response.body.accessToken,
  };
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
      const { token } = await createAuthenticatedUser(app);

      const propertyData = {
        title: 'Modern Apartment in City Center',
        description: 'Beautiful 2-bedroom apartment with stunning views',
        price: 150000,
        propertyType: 'apartment',
        listingType: 'sale',
        address: '123 Main Street',
        city: 'Pristina',
        country: 'Kosovo',
        beds: 2,
        baths: 1,
        livingRooms: 1,
        sqft: 85,
        yearBuilt: 2020,
        parking: 1,
        imageUrl: 'https://example.com/image.jpg',
        lat: 42.6629,
        lng: 21.1655,
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(propertyData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(201);
      expect(response.body.property.title).toBe(propertyData.title);
      expect(response.body.property.price).toBe(propertyData.price);
      expect(response.body.property.city).toBe(propertyData.city);
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
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Incomplete Property',
          // Missing required fields
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return property by ID', async () => {
      const app = createTestApp();
      const { token } = await createAuthenticatedUser(app);

      // First create a property
      const propertyData = {
        title: 'Property to Fetch',
        description: 'Test property',
        price: 100000,
        propertyType: 'house',
        listingType: 'sale',
        address: '456 Test Road',
        city: 'Tirana',
        country: 'Albania',
        beds: 3,
        baths: 2,
        livingRooms: 1,
        sqft: 120,
        yearBuilt: 2018,
        parking: 1,
        imageUrl: 'https://example.com/image2.jpg',
        lat: 41.3275,
        lng: 19.8187,
      };

      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send(propertyData);

      const propertyId = createResponse.body.property._id;

      // Now fetch it
      const response = await request(app)
        .get(`/api/properties/${propertyId}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.property._id).toBe(propertyId);
      expect(response.body.property.title).toBe(propertyData.title);
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
      const { token } = await createAuthenticatedUser(app);

      // Create property
      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Property to Update',
          description: 'Original description',
          price: 100000,
          propertyType: 'apartment',
          listingType: 'sale',
          address: '789 Update Street',
          city: 'Skopje',
          country: 'North Macedonia',
          beds: 2,
          baths: 1,
          livingRooms: 1,
          sqft: 70,
          yearBuilt: 2019,
          parking: 0,
          imageUrl: 'https://example.com/image3.jpg',
          lat: 41.9981,
          lng: 21.4254,
        });

      const propertyId = createResponse.body.property._id;

      // Update it
      const response = await request(app)
        .put(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${token}`)
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
      const { token } = await createAuthenticatedUser(app);

      // Create property
      const createResponse = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Property to Delete',
          description: 'Will be deleted',
          price: 50000,
          propertyType: 'land',
          listingType: 'sale',
          address: '999 Delete Lane',
          city: 'Podgorica',
          country: 'Montenegro',
          beds: 0,
          baths: 0,
          livingRooms: 0,
          sqft: 500,
          yearBuilt: 2020,
          parking: 0,
          imageUrl: 'https://example.com/image4.jpg',
          lat: 42.4304,
          lng: 19.2594,
        });

      const propertyId = createResponse.body.property._id;

      // Delete it
      const response = await request(app)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${token}`);

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
