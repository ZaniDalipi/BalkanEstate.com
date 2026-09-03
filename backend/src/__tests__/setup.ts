/**
 * Jest Test Setup
 * Configures the test environment with MongoDB Memory Server
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';

let mongoServer: MongoMemoryServer | undefined;

/**
 * A suite that touches no collection can opt out of the in-memory database by
 * setting `process.env.SKIP_TEST_DB = 'true'` at the top of its file — module
 * bodies run after this file registers its hooks but before they execute, so
 * the flag is read in time.
 *
 * Worth having for suites that mock their models: `MongoMemoryServer.create()`
 * downloads a mongod binary on first use, which costs every one of those
 * suites tens of seconds for a database they never query, and fails outright
 * where that download is unreachable.
 */
const usesDatabase = () => process.env.SKIP_TEST_DB !== 'true';

// Setup before all tests
beforeAll(async () => {
  if (!usesDatabase()) return;

  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect mongoose to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  if (!usesDatabase()) return;

  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Guarded rather than assumed: when startup itself failed, an unguarded
  // `mongoServer.stop()` throws in teardown and buries the real error.
  await mongoose.disconnect();
  await mongoServer?.stop();
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
