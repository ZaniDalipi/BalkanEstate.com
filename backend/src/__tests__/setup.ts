/**
 * Jest Test Setup
 * Configures the test environment with MongoDB Memory Server
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';

let mongoServer: MongoMemoryServer;
let mongoAvailable = false;

// Setup before all tests
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    mongoAvailable = true;
  } catch (err) {
    // MongoDB binary unavailable in this environment (e.g. no network access).
    // Tests that mock the DB (unit tests) will still run; integration tests
    // that actually hit mongoose will fail on their own.
    console.warn('[setup] MongoMemoryServer unavailable — skipping DB setup. Unit tests will still run.');
  }
});

// Cleanup after each test
afterEach(async () => {
  if (!mongoAvailable) return;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  if (!mongoAvailable) return;
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.ENCRYPTION_KEY = 'test-encryption-key-must-be-32-chars!!';
process.env.FIELD_ENCRYPTION_KEY = 'test-encryption-key-must-be-32-chars!!';

/**
 * Creates mock user data matching the User model schema.
 * Single source of truth — if the schema changes, fix it here only.
 */
export const createMockUser = (overrides: Record<string, any> = {}) => ({
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'S3cur€Pass!x9Kw',
  role: 'buyer',
  isEmailVerified: true,
  ...overrides,
});

/**
 * Creates a mock user signup payload for the /api/auth/signup endpoint.
 */
export const createSignupPayload = (overrides: Record<string, any> = {}) => ({
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'S3cur€Pass!x9Kw',
  ...overrides,
});

/**
 * Signs up a user via the API and returns the accessToken.
 * Centralizes token extraction so tests don't break if response shape changes.
 */
export const getAuthToken = async (app: express.Express, userOverrides: Record<string, any> = {}) => {
  const payload = createSignupPayload(userOverrides);

  const res = await request(app)
    .post('/api/auth/signup')
    .send(payload);

  return {
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    user: res.body.user,
    signupPayload: payload,
  };
};

/**
 * Persists a user directly to the database using mongoose.
 * Use this when you need a user without going through the signup API.
 */
export const createTestUserInDb = async (overrides: Record<string, any> = {}) => {
  const User = mongoose.model('User');
  return User.create(createMockUser(overrides));
};
