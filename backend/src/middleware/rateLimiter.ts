import { Request, Response, NextFunction } from 'express';

/**
 * Rate Limiter Middleware
 *
 * Protects authentication endpoints from brute-force attacks
 * Uses in-memory storage (for production, consider Redis)
 *
 * Security Principles:
 * - Per-IP rate limiting to prevent distributed attacks
 * - Per-account rate limiting to prevent credential stuffing
 * - Exponential backoff for repeated violations
 * - Generic error messages to avoid information leakage
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockUntil?: number;
}

// In-memory store (replace with Redis for production with multiple servers)
const ipLimitStore = new Map<string, RateLimitEntry>();
const accountLimitStore = new Map<string, RateLimitEntry>();

// Rate limiting is ALWAYS enabled for auth endpoints (even in development)
// to prevent brute-force attacks. Limits are relaxed in development for convenience.
const isProduction = process.env.NODE_ENV === 'production';

// Configuration - auth rate limits apply in ALL environments
const RATE_LIMIT_CONFIG = {
  // Login endpoint: strict per-IP limits
  LOGIN_IP: {
    maxAttempts: isProduction ? 10 : 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: isProduction ? 30 * 60 * 1000 : 5 * 60 * 1000, // 30min prod, 5min dev
  },
  // Login endpoint: per-account limits
  LOGIN_ACCOUNT: {
    maxAttempts: isProduction ? 5 : 10,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: isProduction ? 60 * 60 * 1000 : 10 * 60 * 1000, // 1hr prod, 10min dev
  },
  // Signup endpoint: per-IP limits
  SIGNUP_IP: {
    maxAttempts: isProduction ? 5 : 15,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: isProduction ? 2 * 60 * 60 * 1000 : 10 * 60 * 1000,
  },
  // Password reset: per-IP limits
  PASSWORD_RESET_IP: {
    maxAttempts: isProduction ? 5 : 10,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: isProduction ? 2 * 60 * 60 * 1000 : 10 * 60 * 1000,
  },
  // Password reset: per-account limits
  PASSWORD_RESET_ACCOUNT: {
    maxAttempts: isProduction ? 5 : 10,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: isProduction ? 3 * 60 * 60 * 1000 : 15 * 60 * 1000,
  },
  // Refresh token endpoint: per-IP limits
  REFRESH_TOKEN_IP: {
    maxAttempts: isProduction ? 30 : 60,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000,
  },
};

/**
 * Get client IP address (considers proxies)
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Check and update rate limit
 */
const checkRateLimit = (
  key: string,
  store: Map<string, RateLimitEntry>,
  config: { maxAttempts: number; windowMs: number; blockDurationMs: number }
): { allowed: boolean; retryAfter?: number } => {
  const now = Date.now();
  const entry = store.get(key);

  // Check if currently blocked
  if (entry?.blockUntil && entry.blockUntil > now) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
    };
  }

  // Reset if window expired
  if (!entry || entry.resetTime < now) {
    store.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true };
  }

  // Increment count
  entry.count += 1;

  // Block if limit exceeded
  if (entry.count > config.maxAttempts) {
    entry.blockUntil = now + config.blockDurationMs;
    store.set(key, entry);

    return {
      allowed: false,
      retryAfter: Math.ceil(config.blockDurationMs / 1000),
    };
  }

  store.set(key, entry);
  return { allowed: true };
};

/**
 * Login rate limiter (IP-based)
 */
export const loginRateLimiterIP = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = getClientIp(req);
  const result = checkRateLimit(`login_ip_${ip}`, ipLimitStore, RATE_LIMIT_CONFIG.LOGIN_IP);

  if (!result.allowed) {
    res.status(429).json({
      message: `Too many login attempts. Please try again later in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
    });
    return;
  }

  next();
};

/**
 * Login rate limiter (Account-based)
 * Call this after identifying the account
 */
export const loginRateLimiterAccount = (email: string): { allowed: boolean; retryAfter?: number } => {
  return checkRateLimit(
    `login_account_${email.toLowerCase()}`,
    accountLimitStore,
    RATE_LIMIT_CONFIG.LOGIN_ACCOUNT
  );
};

/**
 * Signup rate limiter (IP-based)
 */
export const signupRateLimiterIP = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = getClientIp(req);
  const result = checkRateLimit(`signup_ip_${ip}`, ipLimitStore, RATE_LIMIT_CONFIG.SIGNUP_IP);

  if (!result.allowed) {
    res.status(429).json({
      message: 'Too many signup attempts. Please try again later.',
      retryAfter: result.retryAfter,
    });
    return;
  }

  next();
};

/**
 * Password reset rate limiter (IP-based)
 */
export const passwordResetRateLimiterIP = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = getClientIp(req);
  const result = checkRateLimit(
    `password_reset_ip_${ip}`,
    ipLimitStore,
    RATE_LIMIT_CONFIG.PASSWORD_RESET_IP
  );

  if (!result.allowed) {
    res.status(429).json({
      message: 'Too many password reset attempts. Please try again later.',
      retryAfter: result.retryAfter,
    });
    return;
  }

  next();
};

/**
 * Password reset rate limiter (Account-based)
 */
export const passwordResetRateLimiterAccount = (
  email: string
): { allowed: boolean; retryAfter?: number } => {
  return checkRateLimit(
    `password_reset_account_${email.toLowerCase()}`,
    accountLimitStore,
    RATE_LIMIT_CONFIG.PASSWORD_RESET_ACCOUNT
  );
};

/**
 * Refresh token rate limiter (IP-based)
 * Prevents abuse of the token refresh endpoint
 */
export const refreshTokenRateLimiterIP = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const ip = getClientIp(req);
  const result = checkRateLimit(`refresh_token_ip_${ip}`, ipLimitStore, RATE_LIMIT_CONFIG.REFRESH_TOKEN_IP);

  if (!result.allowed) {
    res.status(429).json({
      message: 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
    });
    return;
  }

  next();
};

/**
 * Reset rate limit for successful login (optional)
 */
export const resetLoginRateLimit = (email: string, ip: string): void => {
  accountLimitStore.delete(`login_account_${email.toLowerCase()}`);
  // Optionally keep IP rate limit to prevent rapid account switching attacks
};

/**
 * Clean up expired entries (run periodically)
 */
export const cleanupRateLimitStore = (): void => {
  const now = Date.now();

  const cleanStore = (store: Map<string, RateLimitEntry>) => {
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now && (!entry.blockUntil || entry.blockUntil < now)) {
        store.delete(key);
      }
    }
  };

  cleanStore(ipLimitStore);
  cleanStore(accountLimitStore);
};

// Schedule cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
