/**
 * Redirect URL Validation Tests
 *
 * Tests for the redirect URL allowlist validation utility
 * to prevent open redirect attacks.
 */

import {
  validateRedirectUrl,
  buildFrontendRedirectUrl,
  buildSafeHttpsRedirect,
  getFrontendUrl,
} from '../utils/redirectValidation';

describe('Redirect URL Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateRedirectUrl', () => {
    it('should allow configured FRONTEND_URL', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const url = 'https://balkanestateai.com/auth/callback?token=abc';
      expect(validateRedirectUrl(url)).toBe(url);
    });

    it('should allow www subdomain of trusted domain', () => {
      const url = 'https://www.balkanestateai.com/dashboard';
      expect(validateRedirectUrl(url)).toBe(url);
    });

    it('should allow api subdomain of trusted domain', () => {
      const url = 'https://api.balkanestateai.com/callback';
      expect(validateRedirectUrl(url)).toBe(url);
    });

    it('should block untrusted external domains', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const url = 'https://evil-site.com/steal-tokens';
      const result = validateRedirectUrl(url);
      expect(result).toBe('https://balkanestateai.com');
    });

    it('should block domain that contains trusted domain as substring', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const url = 'https://notbalkanestateai.com/phishing';
      const result = validateRedirectUrl(url);
      expect(result).toBe('https://balkanestateai.com');
    });

    it('should block javascript: protocol', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const url = 'javascript:alert(1)';
      const result = validateRedirectUrl(url);
      expect(result).toBe('https://balkanestateai.com');
    });

    it('should block data: protocol', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const url = 'data:text/html,<script>alert(1)</script>';
      const result = validateRedirectUrl(url);
      expect(result).toBe('https://balkanestateai.com');
    });

    it('should return fallback for invalid URLs', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const result = validateRedirectUrl('not-a-valid-url://foo');
      expect(result).toBe('https://balkanestateai.com');
    });

    it('should allow localhost in development', () => {
      process.env.NODE_ENV = 'development';
      const url = 'http://localhost:5173/auth/callback';
      expect(validateRedirectUrl(url)).toBe(url);
    });

    it('should block localhost in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const url = 'http://localhost:5173/auth/callback';
      const result = validateRedirectUrl(url);
      expect(result).toBe('https://balkanestateai.com');
    });

    it('should use custom fallback URL when provided', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const url = 'https://evil.com/steal';
      const fallback = 'https://balkanestateai.com/error';
      expect(validateRedirectUrl(url, fallback)).toBe(fallback);
    });
  });

  describe('buildFrontendRedirectUrl', () => {
    it('should build URL with path and query params', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const result = buildFrontendRedirectUrl('/auth/callback', {
        token: 'abc123',
        refresh: 'def456',
      });
      expect(result).toBe('https://balkanestateai.com/auth/callback?token=abc123&refresh=def456');
    });

    it('should handle path without leading slash', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const result = buildFrontendRedirectUrl('auth/callback', { error: 'failed' });
      expect(result).toBe('https://balkanestateai.com/auth/callback?error=failed');
    });

    it('should build URL without query params', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      const result = buildFrontendRedirectUrl('/dashboard');
      expect(result).toBe('https://balkanestateai.com/dashboard');
    });

    it('should use default URL when FRONTEND_URL is not set', () => {
      delete process.env.FRONTEND_URL;
      const result = buildFrontendRedirectUrl('/auth/callback');
      expect(result).toBe('http://localhost:5173/auth/callback');
    });
  });

  describe('buildSafeHttpsRedirect', () => {
    it('should allow redirect for trusted hostname', () => {
      const req = { hostname: 'balkanestateai.com', originalUrl: '/dashboard' };
      expect(buildSafeHttpsRedirect(req)).toBe('https://balkanestateai.com/dashboard');
    });

    it('should allow redirect for www subdomain', () => {
      const req = { hostname: 'www.balkanestateai.com', originalUrl: '/search' };
      expect(buildSafeHttpsRedirect(req)).toBe('https://www.balkanestateai.com/search');
    });

    it('should block redirect for untrusted hostname', () => {
      process.env.NODE_ENV = 'production';
      const req = { hostname: 'evil-site.com', originalUrl: '/steal' };
      expect(buildSafeHttpsRedirect(req)).toBeNull();
    });

    it('should block host header injection attempts', () => {
      process.env.NODE_ENV = 'production';
      const req = { hostname: 'attacker.com', originalUrl: '/' };
      expect(buildSafeHttpsRedirect(req)).toBeNull();
    });

    it('should allow localhost in development', () => {
      process.env.NODE_ENV = 'development';
      const req = { hostname: 'localhost', originalUrl: '/api/test' };
      expect(buildSafeHttpsRedirect(req)).toBe('https://localhost/api/test');
    });
  });

  describe('getFrontendUrl', () => {
    it('should return FRONTEND_URL from env', () => {
      process.env.FRONTEND_URL = 'https://balkanestateai.com';
      expect(getFrontendUrl()).toBe('https://balkanestateai.com');
    });

    it('should return default when FRONTEND_URL is not set', () => {
      delete process.env.FRONTEND_URL;
      expect(getFrontendUrl()).toBe('http://localhost:5173');
    });
  });
});
