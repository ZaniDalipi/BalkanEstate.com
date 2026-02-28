/**
 * Security Tests: Signup Role Sanitization
 * Verifies that privilege escalation via the signup endpoint is blocked.
 */

import request from 'supertest';
import express from 'express';
import { createSignupPayload } from './setup';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  const authRoutes = require('../routes/authRoutes').default;
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Signup Role Sanitization', () => {
  it('should allow buyer role', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/signup')
      .send(createSignupPayload({ role: 'buyer' }));

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('buyer');
  });

  it('should allow private_seller role', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/signup')
      .send(createSignupPayload({ role: 'private_seller' }));

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('private_seller');
  });

  it('should default to buyer when no role is provided', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/signup')
      .send(createSignupPayload());

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('buyer');
  });

  it('should reject admin role and default to buyer', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/signup')
      .send(createSignupPayload({ role: 'admin' }));

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('buyer');
  });

  it('should reject super_admin role and default to buyer', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/signup')
      .send(createSignupPayload({ role: 'super_admin' }));

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('buyer');
  });

  it('should reject arbitrary role strings and default to buyer', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/auth/signup')
      .send(createSignupPayload({ role: 'superuser' }));

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('buyer');
  });
});
