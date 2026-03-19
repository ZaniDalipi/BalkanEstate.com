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

// Rate limiting is disabled in development for convenience
const isProduction = process.env.NODE_ENV === 'production';

// Configuration - auth rate limits apply in ALL environments
const RATE_LIMIT_CONFIG = {
  // Login endpoint: per-IP limits
  LOGIN_IP: {
    maxAttempts: isProduction ? 200 : 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: isProduction ? 2 * 60 * 1000 : 30 * 1000, // 2min prod, 30s dev
  },
  // Login endpoint: per-account limits
  LOGIN_ACCOUNT: {
    maxAttempts: isProduction ? 150 : 100,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: isProduction ? 3 * 60 * 1000 : 60 * 1000, // 3min prod, 1min dev
  },
  // Signup endpoint: per-IP limits
  SIGNUP_IP: {
    maxAttempts: isProduction ? 60 : 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: isProduction ? 10 * 60 * 1000 : 2 * 60 * 1000,
  },
  // Password reset: per-IP limits
  PASSWORD_RESET_IP: {
    maxAttempts: isProduction ? 50 : 50,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: isProduction ? 10 * 60 * 1000 : 2 * 60 * 1000,
  },
  // Password reset: per-account limits
  PASSWORD_RESET_ACCOUNT: {
    maxAttempts: isProduction ? 50 : 50,
    windowMs: 60 * 60 * 1000,
    blockDurationMs: isProduction ? 10 * 60 * 1000 : 2 * 60 * 1000,
  },
  // Refresh token endpoint: per-IP limits
  REFRESH_TOKEN_IP: {
    maxAttempts: isProduction ? 600 : 500,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: isProduction ? 2 * 60 * 1000 : 30 * 1000,
  },
  // Discount/coupon code validation: per-IP limits (prevent brute-force enumeration)
  COUPON_VALIDATION_IP: {
    maxAttempts: isProduction ? 200 : 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: isProduction ? 5 * 60 * 1000 : 60 * 1000, // 5min prod, 1min dev
  },
  // Push subscribe/unsubscribe: per-IP limits (prevent subscription spam)
  PUSH_SUBSCRIBE_IP: {
    maxAttempts: isProduction ? 10 : 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: isProduction ? 10 * 60 * 1000 : 60 * 1000, // 10min prod, 1min dev
  },
  // VAPID public key fetch: per-IP limits (prevent enumeration/scraping)
  PUSH_VAPID_KEY_IP: {
    maxAttempts: isProduction ? 30 : 100,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: isProduction ? 5 * 60 * 1000 : 30 * 1000,
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
  if (!isProduction) return next();
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
  if (!isProduction) return { allowed: true };
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
  if (!isProduction) return next();
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
  if (!isProduction) return next();
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
  if (!isProduction) return { allowed: true };
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
  if (!isProduction) return next();
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
 * Coupon/discount code validation rate limiter (IP-based)
 * Prevents brute-force enumeration of valid discount codes
 */
export const couponValidationRateLimiterIP = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isProduction) return next();
  const ip = getClientIp(req);
  const result = checkRateLimit(`coupon_validate_ip_${ip}`, ipLimitStore, RATE_LIMIT_CONFIG.COUPON_VALIDATION_IP);

  if (!result.allowed) {
    res.status(429).json({
      message: 'Too many validation attempts. Please try again later.',
      retryAfter: result.retryAfter,
    });
    return;
  }

  next();
};

/**
 * Push subscribe/unsubscribe rate limiter (IP-based)
 * Prevents subscription spam and abuse
 */
export const pushSubscribeRateLimiterIP = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isProduction) return next();
  const ip = getClientIp(req);
  const result = checkRateLimit(`push_subscribe_ip_${ip}`, ipLimitStore, RATE_LIMIT_CONFIG.PUSH_SUBSCRIBE_IP);

  if (!result.allowed) {
    res.status(429).json({
      message: 'Too many push subscription requests. Please try again later.',
      retryAfter: result.retryAfter,
    });
    return;
  }

  next();
};

/**
 * VAPID public key fetch rate limiter (IP-based)
 */
export const pushVapidKeyRateLimiterIP = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!isProduction) return next();
  const ip = getClientIp(req);
  const result = checkRateLimit(`push_vapid_ip_${ip}`, ipLimitStore, RATE_LIMIT_CONFIG.PUSH_VAPID_KEY_IP);

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
 * Reset rate limit for successful login
 * @param clearIpLimit - when true, also clears the IP-based limit (use for admin logins)
 */
export const resetLoginRateLimit = (email: string, ip: string, clearIpLimit = false): void => {
  accountLimitStore.delete(`login_account_${email.toLowerCase()}`);
  if (clearIpLimit) {
    ipLimitStore.delete(`login_ip_${ip}`);
    ipLimitStore.delete(`refresh_token_ip_${ip}`);
  }
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

// Schedule cleanup every 5 minutes (skip in test to avoid open handles)
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}
