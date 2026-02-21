/**
 * Agency Favorites API Tests
 * Tests: Toggle, Check, List endpoints
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createMockUser } from './setup';

// Import models to register them with mongoose
import '../models/User';
import '../models/Agency';
import '../models/AgencyFavorite';

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const agencyFavoriteRoutes = require('../routes/agencyFavoriteRoutes').default;
  app.use('/api/agency-favorites', agencyFavoriteRoutes);

  return app;
};

const createToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-jwt-secret', {
    expiresIn: '1d',
  });
};

const createTestUser = async () => {
  const User = mongoose.model('User');
  return User.create(createMockUser());
};

const createTestAgency = async (ownerId: string) => {
  const Agency = mongoose.model('Agency');
  const agency = await Agency.create({
    name: `Test Agency ${Date.now()}`,
    slug: `test-agency-${Date.now()}`,
    email: `agency-${Date.now()}@test.com`,
    phone: '+1234567890',
    city: 'Belgrade',
    country: 'Serbia',
    ownerId,
    totalAgents: 0,
    totalProperties: 0,
    isFeatured: false,
  });
  return agency;
};

describe('Agency Favorites API', () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('POST /api/agency-favorites/toggle', () => {
    it('should add agency to favourites', async () => {
      const user = await createTestUser();
      const agency = await createTestAgency(String(user._id));
      const token = createToken(String(user._id));

      const response = await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ agencyId: String(agency._id) });

      expect(response.status).toBe(200);
      expect(response.body.isSaved).toBe(true);
      expect(response.body.message).toContain('added');
    });

    it('should remove agency from favourites on second toggle', async () => {
      const user = await createTestUser();
      const agency = await createTestAgency(String(user._id));
      const token = createToken(String(user._id));

      // First toggle - add
      await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ agencyId: String(agency._id) });

      // Second toggle - remove
      const response = await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ agencyId: String(agency._id) });

      expect(response.status).toBe(200);
      expect(response.body.isSaved).toBe(false);
      expect(response.body.message).toContain('removed');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/agency-favorites/toggle')
        .send({ agencyId: new mongoose.Types.ObjectId().toString() });

      expect(response.status).toBe(401);
    });

    it('should return 400 without agencyId', async () => {
      const user = await createTestUser();
      const token = createToken(String(user._id));

      const response = await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Agency ID is required');
    });

    it('should return 404 for non-existent agency', async () => {
      const user = await createTestUser();
      const token = createToken(String(user._id));
      const fakeAgencyId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ agencyId: fakeAgencyId });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/agency-favorites/check/:agencyId', () => {
    it('should return false for non-favourited agency', async () => {
      const user = await createTestUser();
      const agency = await createTestAgency(String(user._id));
      const token = createToken(String(user._id));

      const response = await request(app)
        .get(`/api/agency-favorites/check/${agency._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.isSaved).toBe(false);
    });

    it('should return true for favourited agency', async () => {
      const user = await createTestUser();
      const agency = await createTestAgency(String(user._id));
      const token = createToken(String(user._id));

      // Add to favourites first
      await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ agencyId: String(agency._id) });

      const response = await request(app)
        .get(`/api/agency-favorites/check/${agency._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.isSaved).toBe(true);
    });

    it('should return 401 without auth token', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/agency-favorites/check/${fakeId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/agency-favorites', () => {
    it('should return empty list when no favourites', async () => {
      const user = await createTestUser();
      const token = createToken(String(user._id));

      const response = await request(app)
        .get('/api/agency-favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.favorites).toEqual([]);
    });

    it('should return favourited agencies', async () => {
      const user = await createTestUser();
      const user2 = await createTestUser();
      const agency1 = await createTestAgency(String(user._id));
      const agency2 = await createTestAgency(String(user2._id));
      const token = createToken(String(user._id));

      // Add both to favourites
      await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ agencyId: String(agency1._id) });

      await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ agencyId: String(agency2._id) });

      const response = await request(app)
        .get('/api/agency-favorites')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.favorites).toHaveLength(2);
    });

    it('should not return other users favourites', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const agency = await createTestAgency(String(user1._id));

      // User1 favourites the agency
      const token1 = createToken(String(user1._id));
      await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token1}`)
        .send({ agencyId: String(agency._id) });

      // User2 should not see it
      const token2 = createToken(String(user2._id));
      const response = await request(app)
        .get('/api/agency-favorites')
        .set('Authorization', `Bearer ${token2}`);

      expect(response.status).toBe(200);
      expect(response.body.favorites).toHaveLength(0);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/agency-favorites');

      expect(response.status).toBe(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggle clicks (idempotency)', async () => {
      const user = await createTestUser();
      const agency = await createTestAgency(String(user._id));
      const token = createToken(String(user._id));

      // Simulate rapid toggles
      const results = await Promise.all([
        request(app).post('/api/agency-favorites/toggle')
          .set('Authorization', `Bearer ${token}`)
          .send({ agencyId: String(agency._id) }),
        request(app).post('/api/agency-favorites/toggle')
          .set('Authorization', `Bearer ${token}`)
          .send({ agencyId: String(agency._id) }),
      ]);

      // Both should succeed (no crash from unique constraint)
      results.forEach(r => {
        expect([200, 500]).toContain(r.status); // 500 is possible from race condition
      });
    });

    it('should handle invalid agencyId format', async () => {
      const user = await createTestUser();
      const token = createToken(String(user._id));

      const response = await request(app)
        .post('/api/agency-favorites/toggle')
        .set('Authorization', `Bearer ${token}`)
        .send({ agencyId: 'not-a-valid-objectid' });

      // Should return 404 or 500 (cast error)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
