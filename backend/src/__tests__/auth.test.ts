/**
 * Authentication API Tests
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

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

      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect('Content-Type', /json/);

      // Check response structure
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.firstName).toBe(userData.firstName);
      expect(response.body.user.lastName).toBe(userData.lastName);
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
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should reject signup with weak password', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123', // Too weak
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(400);
    });

    it('should reject duplicate email registration', async () => {
      const app = createTestApp();

      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

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
    const testUser = {
      email: 'logintest@example.com',
      password: 'SecurePassword123!',
      firstName: 'Login',
      lastName: 'Test',
    };

    beforeEach(async () => {
      const app = createTestApp();
      // Create a user before login tests
      await request(app)
        .post('/api/auth/signup')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with wrong password', async () => {
      const app = createTestApp();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
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

      // First create and login a user
      const userData = {
        email: 'profile@example.com',
        password: 'SecurePassword123!',
        firstName: 'Profile',
        lastName: 'User',
      };

      const signupResponse = await request(app)
        .post('/api/auth/signup')
        .send(userData);

      const token = signupResponse.body.token;

      // Now get profile
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(userData.email);
      expect(response.body.firstName).toBe(userData.firstName);
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
