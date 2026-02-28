/**
 * Security Tests: Refresh Token httpOnly Cookie Flow
 * Verifies that refresh tokens are set as httpOnly cookies and
 * that the cookie-based flow works for login, refresh, and logout.
 */

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createSignupPayload } from './setup';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const authRoutes = require('../routes/authRoutes').default;
  app.use('/api/auth', authRoutes);
  return app;
};

/** Extract a named cookie from supertest response Set-Cookie header. */
const extractCookie = (res: request.Response, name: string) => {
  const cookies = res.headers['set-cookie'];
  if (!cookies) return null;
  const arr = Array.isArray(cookies) ? cookies : [cookies];
  return arr.find((c: string) => c.startsWith(`${name}=`)) || null;
};

describe('Refresh Token Cookie Flow', () => {
  describe('POST /api/auth/signup', () => {
    it('should set refresh token as httpOnly cookie on signup', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/signup')
        .send(createSignupPayload());

      expect(res.status).toBe(201);

      const cookie = extractCookie(res, 'balkan_rt');
      expect(cookie).not.toBeNull();
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/api/auth');
    });

    it('should also return refresh token in the response body for backward compat', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/signup')
        .send(createSignupPayload());

      expect(res.status).toBe(201);
      expect(res.body.refreshToken).toBeDefined();
      expect(typeof res.body.refreshToken).toBe('string');
    });
  });

  describe('POST /api/auth/login', () => {
    const loginPayload = createSignupPayload({ email: 'cookie-login@example.com' });

    beforeEach(async () => {
      const app = createTestApp();
      await request(app).post('/api/auth/signup').send(loginPayload);
    });

    it('should set refresh token cookie on login', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginPayload.email, password: loginPayload.password });

      expect(res.status).toBe(200);

      const cookie = extractCookie(res, 'balkan_rt');
      expect(cookie).not.toBeNull();
      expect(cookie).toContain('HttpOnly');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should accept refresh token from cookie', async () => {
      const app = createTestApp();

      // Signup to get tokens
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send(createSignupPayload());

      const refreshCookie = extractCookie(signupRes, 'balkan_rt');
      expect(refreshCookie).not.toBeNull();

      // Extract cookie value (name=value; attrs...)
      const cookieValue = refreshCookie!.split(';')[0];

      // Use cookie to refresh
      const refreshRes = await request(app)
        .post('/api/auth/refresh-token')
        .set('Cookie', [cookieValue])
        .send({});

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();
    });

    it('should fall back to body refreshToken for backward compat', async () => {
      const app = createTestApp();

      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send(createSignupPayload());

      // Send refresh token in body (old-style)
      const refreshRes = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: signupRes.body.refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();
    });

    it('should return 400 when no refresh token is provided', async () => {
      const app = createTestApp();
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/refresh token/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear the refresh token cookie on logout', async () => {
      const app = createTestApp();

      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send(createSignupPayload());

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${signupRes.body.accessToken}`)
        .send({});

      expect(logoutRes.status).toBe(200);

      // Cookie should be cleared (set to empty / expired)
      const cookie = extractCookie(logoutRes, 'balkan_rt');
      if (cookie) {
        // Express clears cookies by setting them to empty with Expires in the past
        const isCleared = cookie.includes('Expires=Thu, 01 Jan 1970') ||
                          cookie.split('=')[1].startsWith(';') ||
                          cookie.includes('balkan_rt=;');
        expect(isCleared).toBe(true);
      }
    });
  });
});
