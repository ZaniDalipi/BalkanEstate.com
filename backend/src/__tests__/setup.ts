/**
 * Jest Test Setup
 * Configures the test environment with MongoDB Memory Server
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';

let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect and stop the in-memory database
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';

/**
 * Creates mock user data matching the User model schema.
 * Single source of truth — if the schema changes, fix it here only.
 */
export const createMockUser = (overrides: Record<string, any> = {}) => ({
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'SecurePassword123!',
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
  password: 'SecurePassword123!',
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
