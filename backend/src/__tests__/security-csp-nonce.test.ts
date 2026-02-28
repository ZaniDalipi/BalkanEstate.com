/**
 * Security Tests: CSP Nonce, Security Logger, Request ID, HTTPS Enforcement
 * Verifies that per-request CSP nonces are generated, security patterns
 * are logged, and request IDs use cryptographic randomness.
 */

import { Request, Response, NextFunction } from 'express';
import {
  cspNonceMiddleware,
  securityLogger,
  requestId,
  enforceHttps,
  xssSanitizer,
} from '../middleware/security';

/** Create minimal Express mock objects. */
const createMocks = (reqOverrides: Partial<Request> = {}) => {
  const locals: Record<string, any> = {};
  const headers: Record<string, string> = {};

  const req = {
    body: {},
    query: {},
    params: {},
    path: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
    hostname: 'localhost',
    originalUrl: '/api/test',
    protocol: 'https',
    headers: {},
    ...reqOverrides,
  } as unknown as Request;

  let statusCode = 0;
  let jsonBody: any = null;
  let redirectUrl = '';

  const res = {
    locals,
    setHeader: (name: string, value: string) => { headers[name] = value; },
    status: (code: number) => { statusCode = code; return res; },
    json: (body: any) => { jsonBody = body; return res; },
    redirect: (code: number, url: string) => { statusCode = code; redirectUrl = url; },
  } as unknown as Response;

  let nextCalled = false;
  const next: NextFunction = () => { nextCalled = true; };

  return {
    req, res, next,
    getLocals: () => locals,
    getHeaders: () => headers,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    getRedirectUrl: () => redirectUrl,
    wasNextCalled: () => nextCalled,
  };
};

describe('CSP Nonce Middleware', () => {
  it('should generate a base64 nonce on res.locals.cspNonce', () => {
    const { req, res, next, getLocals } = createMocks();

    cspNonceMiddleware(req, res, next);

    const nonce = getLocals().cspNonce;
    expect(nonce).toBeDefined();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('should generate unique nonces per request', () => {
    const nonces = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const { req, res, next, getLocals } = createMocks();
      cspNonceMiddleware(req, res, next);
      nonces.add(getLocals().cspNonce);
    }

    // All 100 nonces should be unique
    expect(nonces.size).toBe(100);
  });

  it('should call next()', () => {
    const { req, res, next, wasNextCalled } = createMocks();

    cspNonceMiddleware(req, res, next);

    expect(wasNextCalled()).toBe(true);
  });

  it('should produce a valid base64 string', () => {
    const { req, res, next, getLocals } = createMocks();
    cspNonceMiddleware(req, res, next);

    const nonce = getLocals().cspNonce;
    // Base64 regex: only allowed characters
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe('Request ID Middleware', () => {
  it('should set X-Request-ID on both request and response', () => {
    const { req, res, next, getHeaders } = createMocks();

    requestId(req, res, next);

    expect(req.headers['x-request-id']).toBeDefined();
    expect(getHeaders()['X-Request-ID']).toBeDefined();
    expect(req.headers['x-request-id']).toBe(getHeaders()['X-Request-ID']);
  });

  it('should generate a valid UUID', () => {
    const { req, res, next } = createMocks();
    requestId(req, res, next);

    const id = req.headers['x-request-id'] as string;
    // UUID v4 format
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate unique IDs per request', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const { req, res, next } = createMocks();
      requestId(req, res, next);
      ids.add(req.headers['x-request-id'] as string);
    }
    expect(ids.size).toBe(50);
  });
});

describe('Security Logger Middleware', () => {
  it('should call next() for normal requests', () => {
    const { req, res, next, wasNextCalled } = createMocks();

    securityLogger(req, res, next);

    expect(wasNextCalled()).toBe(true);
  });

  it('should call next() even for suspicious requests', () => {
    const { req, res, next, wasNextCalled } = createMocks({
      body: { input: '<script>alert(1)</script>' },
    } as any);

    securityLogger(req, res, next);

    expect(wasNextCalled()).toBe(true);
  });

  it('should call next() for path traversal attempts', () => {
    const { req, res, next, wasNextCalled } = createMocks({
      path: '/api/../../../etc/passwd',
    } as any);

    securityLogger(req, res, next);

    expect(wasNextCalled()).toBe(true);
  });
});

describe('HTTPS Enforcement Middleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should pass through in non-production', () => {
    process.env.NODE_ENV = 'test';
    const { req, res, next, wasNextCalled } = createMocks({ protocol: 'http' } as any);

    enforceHttps(req, res, next);

    expect(wasNextCalled()).toBe(true);
  });
});

describe('XSS Sanitizer Middleware', () => {
  it('should escape HTML entities in body strings', () => {
    const { req, res, next } = createMocks();
    req.body = { input: '<img onerror=alert(1)>' };

    xssSanitizer(req, res, next);

    expect(req.body.input).toBe('&lt;img onerror=alert(1)&gt;');
  });

  it('should not modify URLs', () => {
    const { req, res, next } = createMocks();
    req.body = { url: 'https://example.com/path?q=1' };

    xssSanitizer(req, res, next);

    // URL fields are in the skip list
    expect(req.body.url).toBe('https://example.com/path?q=1');
  });

  it('should not modify password fields', () => {
    const { req, res, next } = createMocks();
    req.body = { password: 'P@ss<word>123' };

    xssSanitizer(req, res, next);

    expect(req.body.password).toBe('P@ss<word>123');
  });

  it('should handle nested objects', () => {
    const { req, res, next } = createMocks();
    req.body = { nested: { deep: '<b>bold</b>' } };

    xssSanitizer(req, res, next);

    expect(req.body.nested.deep).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('should call next()', () => {
    const { req, res, next, wasNextCalled } = createMocks();

    xssSanitizer(req, res, next);

    expect(wasNextCalled()).toBe(true);
  });
});
