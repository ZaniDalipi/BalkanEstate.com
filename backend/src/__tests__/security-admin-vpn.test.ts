/**
 * Security Tests: Admin VPN Check Hardening
 * Verifies that the VPN check cannot be bypassed in production
 * and that IP/domain whitelisting works correctly.
 */

import { Request, Response, NextFunction } from 'express';
import { checkVPNAccess, checkAdminRole, getWhitelistConfig } from '../middleware/adminAuth';

/** Create mock Express req/res/next. */
const createMocks = (overrides: Partial<Request> = {}) => {
  const req = {
    ip: '127.0.0.1',
    headers: {},
    connection: { remoteAddress: '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request;

  let statusCode = 0;
  let jsonBody: any = null;
  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (body: any) => {
      jsonBody = body;
      return res;
    },
  } as unknown as Response;

  let nextCalled = false;
  const next: NextFunction = () => { nextCalled = true; };

  return {
    req, res, next,
    getStatus: () => statusCode,
    getJson: () => jsonBody,
    wasNextCalled: () => nextCalled,
  };
};

describe('Admin VPN Check Hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDisableVpn = process.env.DISABLE_ADMIN_VPN_CHECK;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDisableVpn === undefined) {
      delete process.env.DISABLE_ADMIN_VPN_CHECK;
    } else {
      process.env.DISABLE_ADMIN_VPN_CHECK = originalDisableVpn;
    }
  });

  describe('Production hardening', () => {
    it('should never allow disabling VPN check in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DISABLE_ADMIN_VPN_CHECK = 'true';

      const { req, res, next, wasNextCalled, getStatus } = createMocks({
        ip: '10.99.99.99', // non-whitelisted IP
        headers: { host: 'evil.com' },
      });

      checkVPNAccess(req, res, next);

      // Should NOT call next — production must enforce VPN check
      expect(wasNextCalled()).toBe(false);
      expect(getStatus()).toBe(403);
    });

    it('should allow disabling VPN check in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.DISABLE_ADMIN_VPN_CHECK = 'true';

      const { req, res, next, wasNextCalled } = createMocks({
        ip: '10.99.99.99',
      });

      checkVPNAccess(req, res, next);

      expect(wasNextCalled()).toBe(true);
    });
  });

  describe('IP whitelisting', () => {
    it('should allow localhost IPv4', () => {
      delete process.env.DISABLE_ADMIN_VPN_CHECK;

      const { req, res, next, wasNextCalled } = createMocks({ ip: '127.0.0.1' });
      checkVPNAccess(req, res, next);

      expect(wasNextCalled()).toBe(true);
    });

    it('should allow localhost IPv6', () => {
      delete process.env.DISABLE_ADMIN_VPN_CHECK;

      const { req, res, next, wasNextCalled } = createMocks({ ip: '::1' });
      checkVPNAccess(req, res, next);

      expect(wasNextCalled()).toBe(true);
    });

    it('should reject unknown IPs', () => {
      delete process.env.DISABLE_ADMIN_VPN_CHECK;

      const { req, res, next, wasNextCalled, getStatus } = createMocks({
        ip: '192.168.99.99',
        headers: { host: 'unknown.com' },
      });

      checkVPNAccess(req, res, next);

      expect(wasNextCalled()).toBe(false);
      expect(getStatus()).toBe(403);
    });
  });

  describe('Domain whitelisting', () => {
    const originalDomains = process.env.ADMIN_ALLOWED_DOMAINS;

    afterEach(() => {
      if (originalDomains === undefined) {
        delete process.env.ADMIN_ALLOWED_DOMAINS;
      } else {
        process.env.ADMIN_ALLOWED_DOMAINS = originalDomains;
      }
    });

    it('should allow a whitelisted domain', () => {
      process.env.ADMIN_ALLOWED_DOMAINS = 'admin.balkanestateai.com';
      delete process.env.DISABLE_ADMIN_VPN_CHECK;

      const { req, res, next, wasNextCalled } = createMocks({
        ip: '10.0.0.1', // non-whitelisted IP
        headers: { host: 'admin.balkanestateai.com' },
      });

      checkVPNAccess(req, res, next);

      expect(wasNextCalled()).toBe(true);
    });

    it('should reject a non-whitelisted domain', () => {
      process.env.ADMIN_ALLOWED_DOMAINS = 'admin.balkanestateai.com';
      delete process.env.DISABLE_ADMIN_VPN_CHECK;

      const { req, res, next, wasNextCalled, getStatus } = createMocks({
        ip: '10.0.0.1',
        headers: { host: 'evil-admin.com' },
      });

      checkVPNAccess(req, res, next);

      expect(wasNextCalled()).toBe(false);
      expect(getStatus()).toBe(403);
    });
  });

  describe('checkAdminRole', () => {
    it('should reject unauthenticated requests', () => {
      const { req, res, next, getStatus } = createMocks();
      (req as any).user = undefined;

      checkAdminRole(req, res, next);

      expect(getStatus()).toBe(401);
    });

    it('should reject non-admin users', () => {
      const { req, res, next, getStatus } = createMocks();
      (req as any).user = { role: 'buyer' };

      checkAdminRole(req, res, next);

      expect(getStatus()).toBe(403);
    });

    it('should allow admin users', () => {
      const { req, res, next, wasNextCalled } = createMocks();
      (req as any).user = { role: 'admin' };

      checkAdminRole(req, res, next);

      expect(wasNextCalled()).toBe(true);
    });

    it('should allow super_admin users', () => {
      const { req, res, next, wasNextCalled } = createMocks();
      (req as any).user = { role: 'super_admin' };

      checkAdminRole(req, res, next);

      expect(wasNextCalled()).toBe(true);
    });
  });

  describe('getWhitelistConfig', () => {
    it('should return the current whitelist configuration', () => {
      const config = getWhitelistConfig();

      expect(config).toHaveProperty('ips');
      expect(config).toHaveProperty('domains');
      expect(config).toHaveProperty('vpnCheckDisabled');
      expect(Array.isArray(config.ips)).toBe(true);
      expect(Array.isArray(config.domains)).toBe(true);
      expect(config.ips).toContain('127.0.0.1');
    });
  });
});
