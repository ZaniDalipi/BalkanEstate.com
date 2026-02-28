/**
 * Security Tests: NoSQL Injection Sanitization
 * Verifies that MongoDB operator injection is blocked in both
 * request body and query parameters.
 */

import { Request, Response, NextFunction } from 'express';
import { mongoSanitization } from '../middleware/security';

/** Helper to create a mock req/res/next for middleware testing. */
const createMocks = (overrides: { body?: any; query?: any } = {}) => {
  const req = {
    body: overrides.body || {},
    query: overrides.query || {},
  } as Request;

  const res = {} as Response;

  let nextCalled = false;
  const next: NextFunction = () => { nextCalled = true; };

  return { req, res, next, wasNextCalled: () => nextCalled };
};

describe('NoSQL Injection Sanitization', () => {
  describe('Body sanitization', () => {
    it('should strip $gt operator from body keys', () => {
      const { req, res, next } = createMocks({
        body: { $gt: 100 },
      });

      mongoSanitization(req, res, next);

      expect(req.body['$gt']).toBeUndefined();
      expect(req.body['_gt']).toBe(100);
    });

    it('should strip $where operator from body keys', () => {
      const { req, res, next } = createMocks({
        body: { $where: 'this.isAdmin' },
      });

      mongoSanitization(req, res, next);

      expect(req.body['$where']).toBeUndefined();
      expect(req.body['_where']).toBe('this.isAdmin');
    });

    it('should handle nested operator injection in body', () => {
      const { req, res, next } = createMocks({
        body: { password: { $ne: '' } },
      });

      mongoSanitization(req, res, next);

      // The nested $ne key should be sanitized
      expect(req.body.password['$ne']).toBeUndefined();
      expect(req.body.password['_ne']).toBe('');
    });

    it('should leave normal body data untouched', () => {
      const { req, res, next } = createMocks({
        body: { email: 'user@test.com', password: 'secure123' },
      });

      mongoSanitization(req, res, next);

      expect(req.body.email).toBe('user@test.com');
      expect(req.body.password).toBe('secure123');
    });
  });

  describe('Query parameter sanitization', () => {
    it('should strip $gt operator from query params', () => {
      const { req, res, next } = createMocks({
        query: { price: { $gt: '100' } },
      });

      mongoSanitization(req, res, next);

      expect((req.query.price as any)['$gt']).toBeUndefined();
      expect((req.query.price as any)['_gt']).toBe('100');
    });

    it('should strip $ne operator from query params', () => {
      const { req, res, next } = createMocks({
        query: { role: { $ne: 'admin' } },
      });

      mongoSanitization(req, res, next);

      expect((req.query.role as any)['$ne']).toBeUndefined();
    });

    it('should leave normal query params untouched', () => {
      const { req, res, next } = createMocks({
        query: { page: '1', search: 'apartment' },
      });

      mongoSanitization(req, res, next);

      expect(req.query.page).toBe('1');
      expect(req.query.search).toBe('apartment');
    });

    it('should handle empty query object', () => {
      const { req, res, next, wasNextCalled } = createMocks({ query: {} });

      mongoSanitization(req, res, next);

      expect(wasNextCalled()).toBe(true);
    });
  });

  describe('Always calls next()', () => {
    it('should call next even with malicious input', () => {
      const { req, res, next, wasNextCalled } = createMocks({
        body: { $gt: 1, $lt: 2, $where: 'x' },
        query: { $ne: 'y' },
      });

      mongoSanitization(req, res, next);

      expect(wasNextCalled()).toBe(true);
    });
  });
});
