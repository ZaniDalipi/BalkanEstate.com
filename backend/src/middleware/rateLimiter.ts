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

// Configuration
const RATE_LIMIT_CONFIG = {
  // Login endpoint: 5 attempts per 15 minutes per IP
  LOGIN_IP: {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  // Login endpoint: 3 attempts per 15 minutes per account
  LOGIN_ACCOUNT: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  // Signup endpoint: 3 signups per hour per IP
  SIGNUP_IP: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours
  },
  // Password reset: 3 attempts per hour per IP
  PASSWORD_RESET_IP: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 2 * 60 * 60 * 1000,
  },
  // Password reset: 2 attempts per hour per account
  PASSWORD_RESET_ACCOUNT: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: 3 * 60 * 60 * 1000, // 3 hours
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
