/**
 * CSRF Protection Middleware
 *
 * Uses the double-submit cookie pattern:
 * 1. Server generates a random CSRF token and sets it in a cookie
 * 2. Client reads the cookie and includes it in the X-CSRF-Token header
 * 3. Server verifies cookie value matches header value
 *
 * This prevents cross-origin attacks because:
 * - A malicious site cannot read cookies from our domain (SameSite + domain isolation)
 * - Without the cookie value, the attacker can't set the matching header
 *
 * Combined with JWT Bearer auth, this provides defense-in-depth:
 * - JWT protects against unauthenticated access
 * - CSRF token protects against cross-origin forged requests
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const CSRF_COOKIE_NAME = '__csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32; // 256 bits of entropy
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Parse a specific cookie value from the raw Cookie header.
 * Avoids requiring the cookie-parser package.
 */
const parseCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const pair of header.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key.trim() === name) {
      return rest.join('=').trim();
    }
  }
  return undefined;
};

/**
 * Paths that are exempt from CSRF validation.
 * - Auth endpoints: user doesn't have a CSRF cookie yet during login/register
 * - Webhook endpoints: called by external services (Paysera, Stripe) with their own signature verification
 * - Health check: monitoring probes
 * - GET/HEAD/OPTIONS: safe methods that don't modify state
 */
const EXEMPT_PATHS = [
  '/auth/',
  '/webhooks/',
  '/health',
];

/** HTTP methods that are safe (read-only) and don't need CSRF protection */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Generate a cryptographically random CSRF token
 */
const generateToken = (): string => {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

/**
 * Middleware that sets a CSRF cookie on every response (if not already set).
 * Must be applied before csrfValidation in the middleware chain.
 */
export const csrfCookie = (_req: Request, res: Response, next: NextFunction): void => {
  // Always set a fresh CSRF cookie so the client can read it.
  // We do NOT use httpOnly because the client JS needs to read the cookie
  // to include the value in the X-CSRF-Token header (double-submit pattern).
  const token = generateToken();

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,      // Client JS must read this for double-submit
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict',   // Prevents cross-origin cookie sending
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  next();
};

/**
 * Middleware that validates the CSRF token on mutation requests.
 * Compares the X-CSRF-Token header against the __csrf cookie.
 */
export const csrfValidation = (req: Request, res: Response, next: NextFunction): void => {
  // Safe methods don't need CSRF protection
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  // Check if path is exempt
  const isExempt = EXEMPT_PATHS.some(path => req.path.startsWith(path));
  if (isExempt) {
    next();
    return;
  }

  // Get CSRF token from cookie and header
  const cookieToken = parseCookie(req, CSRF_COOKIE_NAME);
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  // Both must be present
  if (!cookieToken || !headerToken) {
    res.status(403).json({
      message: 'CSRF validation failed',
      code: 'CSRF_TOKEN_MISSING',
    });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    res.status(403).json({
      message: 'CSRF validation failed',
      code: 'CSRF_TOKEN_INVALID',
    });
    return;
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(cookieToken, 'utf8'),
    Buffer.from(headerToken, 'utf8'),
  );

  if (!isValid) {
    res.status(403).json({
      message: 'CSRF validation failed',
      code: 'CSRF_TOKEN_INVALID',
    });
    return;
  }

  next();
};
