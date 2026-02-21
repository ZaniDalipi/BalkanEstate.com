/**
 * Authentication API Tests
 */

import request from 'supertest';
import express from 'express';
import { createSignupPayload, getAuthToken } from './setup';

// Create a minimal express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Import routes dynamically to avoid initialization issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const authRoutes = require('../routes/authRoutes').default;
  app.use('/api/auth', authRoutes);

  return app;
};

describe('Auth API', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      const app = createTestApp();

      const userData = createSignupPayload({
        email: 'newuser@example.com',
        name: 'John Doe',
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/);

      // Check response structure
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      // Password should not be returned
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject signup with missing required fields', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' }) // Missing password, name
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject signup with invalid email', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/signup')
        .send(createSignupPayload({ email: 'invalid-email' }))
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should reject signup with weak password', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/signup')
        .send(createSignupPayload({
          email: 'test@example.com',
          password: '123', // Too weak
        }))
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should reject duplicate email registration', async () => {
      const app = createTestApp();

      const userData = createSignupPayload({
        email: 'duplicate@example.com',
        name: 'John Doe',
      });

      // First signup should succeed
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Second signup with same email should fail
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already exists|registered/i);
    });
  });

  describe('POST /api/auth/login', () => {
    const loginUserPayload = createSignupPayload({
      email: 'logintest@example.com',
      name: 'Login Test',
    });

    beforeEach(async () => {
      const app = createTestApp();
      // Create a user before login tests
      await request(app)
        .post('/api/auth/signup')
        .send(loginUserPayload);
    });

    it('should login with valid credentials', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUserPayload.email,
          password: loginUserPayload.password,
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(loginUserPayload.email);
    });

    it('should reject login with wrong password', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginUserPayload.email,
          password: 'WrongPassword123!',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject login with non-existent email', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const app = createTestApp();

      const { accessToken, signupPayload } = await getAuthToken(app, {
        email: 'profile@example.com',
        name: 'Profile User',
      });

      // Now get profile
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(signupPayload.email);
      expect(response.body.user.name).toBe(signupPayload.name);
    });

    it('should reject request without token', async () => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const app = createTestApp();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(401);
    });
  });
});
