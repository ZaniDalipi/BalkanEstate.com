/**
 * Security Tests: API Authorization
 *
 * Verifies that the `protect` middleware and role-based access control correctly
 * reject unauthorized requests. Tests run without a database by mocking
 * User.findById — the focus is purely on JWT validation and RBAC logic.
 *
 * Test matrix:
 *  - No token              → 401 NO_TOKEN
 *  - Malformed token       → 401 INVALID_TOKEN
 *  - Expired token         → 401 TOKEN_EXPIRED
 *  - Refresh token as access token → 401 INVALID_TOKEN_TYPE
 *  - Tampered payload      → 401 INVALID_TOKEN
 *  - Wrong signing secret  → 401 INVALID_TOKEN
 *  - Bearer prefix missing → 401 NO_TOKEN
 *  - Lowercase "bearer"    → 401 NO_TOKEN
 *  - Valid user token on admin routes → 403
 *  - Valid token, user not in DB → 401 USER_NOT_FOUND
 */

// Set env before any module that reads it at load time.
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { protect, restrictTo } from '../middleware/auth';
import { checkAdminRole } from '../middleware/adminAuth';

const JWT_SECRET = 'test-jwt-secret';
const FAKE_USER_ID = '507f1f77bcf86cd799439011';

// ---------------------------------------------------------------------------
// Mock User.findById so tests never touch a real database.
// ---------------------------------------------------------------------------
jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

import User from '../models/User';
const mockFindById = User.findById as jest.MockedFunction<typeof User.findById>;

/** Returns a mongoose-style chainable that resolves to `doc`. */
const mockUser = (overrides: Record<string, unknown> = {}) => {
  const doc = {
    _id: FAKE_USER_ID,
    id: FAKE_USER_ID,
    name: 'Test User',
    email: 'test@example.com',
    role: 'buyer',
    isEmailVerified: true,
    provider: 'local',
    ...overrides,
  };
  // findById(...).select('-password') — mock the chain
  mockFindById.mockReturnValueOnce({
    select: jest.fn().mockResolvedValueOnce(doc),
  } as any);
  return doc;
};

/** Makes findById resolve to null (user deleted). */
const mockUserNotFound = () => {
  mockFindById.mockReturnValueOnce({
    select: jest.fn().mockResolvedValueOnce(null),
  } as any);
};

// ---------------------------------------------------------------------------
// Minimal Express apps for testing
// ---------------------------------------------------------------------------
const protectedApp = () => {
  const app = express();
  app.use(express.json());
  app.get('/protected', protect, (_req, res) => res.json({ ok: true }));
  return app;
};

const adminApp = () => {
  const app = express();
  app.use(express.json());
  app.get('/admin/stats', protect, checkAdminRole, (_req, res) => res.json({ ok: true }));
  return app;
};

// ---------------------------------------------------------------------------
// Token factories
// ---------------------------------------------------------------------------
const validAccessToken = (overrides: Record<string, unknown> = {}) =>
  jwt.sign({ id: FAKE_USER_ID, type: 'access', ...overrides }, JWT_SECRET, { expiresIn: '1h' });

const expiredToken = () =>
  jwt.sign({ id: FAKE_USER_ID, type: 'access' }, JWT_SECRET, { expiresIn: -1 });

const tokenSignedWithWrongSecret = () =>
  jwt.sign({ id: FAKE_USER_ID, type: 'access' }, 'wrong-secret', { expiresIn: '1h' });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('API Authorization Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. No token
  // -------------------------------------------------------------------------
  describe('No token → 401 NO_TOKEN', () => {
    it('rejects a request with no Authorization header', async () => {
      const res = await request(protectedApp()).get('/protected');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('rejects an empty Authorization header', async () => {
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', '');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('rejects a token sent without the "Bearer " prefix', async () => {
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', validAccessToken());
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });

    it('rejects lowercase "bearer" prefix', async () => {
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `bearer ${validAccessToken()}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('NO_TOKEN');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Malformed / invalid tokens
  // -------------------------------------------------------------------------
  describe('Invalid token → 401 INVALID_TOKEN', () => {
    it('rejects a completely garbled token string', async () => {
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', 'Bearer not.a.valid.token');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('rejects a token signed with the wrong secret', async () => {
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `Bearer ${tokenSignedWithWrongSecret()}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('rejects a token with a tampered payload', async () => {
      const original = validAccessToken();
      const [header, , signature] = original.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ id: 'hacker', type: 'access' })
      ).toString('base64url');
      const tampered = `${header}.${tamperedPayload}.${signature}`;

      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `Bearer ${tampered}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('rejects a token with a truncated signature', async () => {
      const token = validAccessToken();
      const truncated = token.slice(0, -10);
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `Bearer ${truncated}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Expired tokens
  // -------------------------------------------------------------------------
  describe('Expired token → 401 TOKEN_EXPIRED', () => {
    it('rejects an expired token', async () => {
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken()}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Refresh token used as access token
  // -------------------------------------------------------------------------
  describe('Refresh token misuse → 401 INVALID_TOKEN_TYPE', () => {
    it('rejects a token with type=refresh', async () => {
      const refreshAsAccess = jwt.sign(
        { id: FAKE_USER_ID, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `Bearer ${refreshAsAccess}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN_TYPE');
    });
  });

  // -------------------------------------------------------------------------
  // 5. User not found in database
  // -------------------------------------------------------------------------
  describe('Token valid but user deleted → 401 USER_NOT_FOUND', () => {
    it('rejects a valid JWT whose user no longer exists', async () => {
      mockUserNotFound();
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `Bearer ${validAccessToken()}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('USER_NOT_FOUND');
    });
  });

  // -------------------------------------------------------------------------
  // 6. Valid token → access granted
  // -------------------------------------------------------------------------
  describe('Valid token → 200 on protected routes', () => {
    it('grants access with a valid token and existing user', async () => {
      mockUser();
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `Bearer ${validAccessToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('accepts a legacy token without a type field', async () => {
      mockUser();
      const legacyToken = jwt.sign({ id: FAKE_USER_ID }, JWT_SECRET, { expiresIn: '1h' });
      const res = await request(protectedApp())
        .get('/protected')
        .set('Authorization', `Bearer ${legacyToken}`);
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Role-based access control
  // -------------------------------------------------------------------------
  describe('RBAC: insufficient role → 403', () => {
    it('returns 403 when a "buyer" accesses an admin-only route', async () => {
      mockUser({ role: 'buyer' });
      const res = await request(adminApp())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${validAccessToken()}`);
      expect(res.status).toBe(403);
    });

    it('returns 403 when an "agent" accesses an admin-only route', async () => {
      mockUser({ role: 'agent' });
      const res = await request(adminApp())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${validAccessToken()}`);
      expect(res.status).toBe(403);
    });

    it('rejects a forged token claiming admin role but wrong secret', async () => {
      const fakeAdmin = jwt.sign(
        { id: FAKE_USER_ID, role: 'admin' },
        'wrong-secret',
        { expiresIn: '1h' }
      );
      const res = await request(adminApp())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${fakeAdmin}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('grants access to an actual admin user on admin routes', async () => {
      mockUser({ role: 'admin' });
      const res = await request(adminApp())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${validAccessToken()}`);
      // Admin middleware passes — the route handler runs
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // 8. restrictTo helper
  // -------------------------------------------------------------------------
  describe('restrictTo role check', () => {
    const makeApp = (...roles: string[]) => {
      const app = express();
      app.use(express.json());
      app.get('/route', protect, restrictTo(...roles), (_req, res) =>
        res.json({ ok: true })
      );
      return app;
    };

    it('allows a user whose role is in the allowed list', async () => {
      mockUser({ role: 'seller' });
      const res = await request(makeApp('seller', 'agent'))
        .get('/route')
        .set('Authorization', `Bearer ${validAccessToken()}`);
      expect(res.status).toBe(200);
    });

    it('blocks a user whose role is not in the allowed list', async () => {
      mockUser({ role: 'buyer' });
      const res = await request(makeApp('seller', 'agent'))
        .get('/route')
        .set('Authorization', `Bearer ${validAccessToken()}`);
      expect(res.status).toBe(403);
    });
  });
});
