/**
 * Security Middleware Configuration
 * Comprehensive security hardening for production
 */

import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction, Application } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import cors from 'cors';
import crypto from 'crypto';
import { apiLogger } from '../utils/logger';
import { buildSafeHttpsRedirect } from '../utils/redirectValidation';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Validate required environment variables on startup
 * Throws error if critical variables are missing in production
 */
export const validateEnvironment = (): void => {
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const productionRequiredVars = [
    ...requiredVars,
    'ENCRYPTION_KEY',
    'FIELD_ENCRYPTION_KEY',
    'PASSWORD_PEPPER',
    'FINGERPRINT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'RESEND_API_KEY',
    'GEMINI_API_KEY',
    'FRONTEND_URL',
    'BACKEND_URL',
  ];

  // Optional but recommended variables - warn if missing but don't throw
  const optionalButRecommended = [
    'SENTRY_DSN',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const varsToCheck = isProduction ? productionRequiredVars : requiredVars;
  const missing: string[] = [];

  varsToCheck.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Validate MONGODB_URI format
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    const formatMsg = 'MONGODB_URI must start with mongodb:// or mongodb+srv://';
    if (isProduction) {
      throw new Error(formatMsg);
    } else {
      apiLogger.warn(`[ENV WARNING] ${formatMsg}`);
    }
  }

  // Check for weak default secrets
  if (process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET === 'your-secret-key') {
    if (isProduction) {
      throw new Error('JWT_SECRET must be changed from default value in production');
    }
  }

  if (process.env.ENCRYPTION_KEY?.includes('default') || process.env.ENCRYPTION_KEY?.includes('change')) {
    if (isProduction) {
      throw new Error('ENCRYPTION_KEY must be changed from default value in production');
    }
  }

  // Check optional but recommended variables and warn if missing
  const missingOptional: string[] = [];
  optionalButRecommended.forEach((varName) => {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  });

  if (missingOptional.length > 0) {
    apiLogger.warn(
      `[ENV WARNING] Optional but recommended environment variables are not set: ${missingOptional.join(', ')}. ` +
      'Some features (payments, error tracking, OAuth) may not work correctly.'
    );
  }

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProduction) {
      throw new Error(errorMsg);
    } else {
      apiLogger.warn(
        `[ENV WARNING] ${errorMsg}. ` +
        'The application may not function correctly. Set these variables in your .env file.'
      );
    }
  }

};

/**
 * Generate a per-request CSP nonce.
 * The nonce is attached to res.locals.cspNonce so it can be injected into
 * script/style tags by the HTML template (e.g., index.html).
 */
export const cspNonceMiddleware = (_req: Request, res: Response, next: NextFunction): void => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
};

/**
 * Configure Helmet security headers with per-request nonce-based CSP.
 *
 * CSP Notes:
 * - Nonce-based CSP for scripts replaces 'unsafe-inline'
 * - MapLibre GL JS v5+ no longer requires 'unsafe-eval' (no new Function() usage)
 * - Styles still use 'unsafe-inline' because Tailwind injects styles dynamically
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Nonce-based CSP for inline scripts (replaces 'unsafe-inline')
        (_req: IncomingMessage, res: ServerResponse) => `'nonce-${(res as any).locals?.cspNonce || ''}'`,
        'https://unpkg.com',
        'https://www.googletagmanager.com',
        'https://connect.facebook.net',
      ],
      styleSrc: [
        "'self'",
        // Styles still need 'unsafe-inline' for Tailwind CSS dynamic injection
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://unpkg.com',
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com',
        'data:',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://res.cloudinary.com',
        'https://*.tile.openstreetmap.org',
        'https://unpkg.com',
        'https://*.basemaps.cartocdn.com', // Map tiles
        'https://api.mapbox.com', // MapLibre
      ],
      connectSrc: [
        "'self'",
        'https://www.balkanestateai.com',
        'https://api.balkanestateai.com',
        'wss://api.balkanestateai.com',
        'https://nominatim.openstreetmap.org',
        'https://www.google-analytics.com',
        'https://connect.facebook.net',
        'https://*.sentry.io', // Error tracking
        // Development URLs
        ...(isDevelopment ? [
          'http://localhost:5001',
          'ws://localhost:5001',
          'http://127.0.0.1:5001',
        ] : []),
      ],
      frameSrc: [
        "'self'",
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https://res.cloudinary.com', 'blob:'],
      workerSrc: ["'self'", 'blob:'],
      childSrc: ["'self'", 'blob:'],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
    // Report violations to help identify issues without breaking functionality
    reportOnly: false,
  } : false, // Disable CSP in development for easier debugging

  // Cross-Origin settings
  crossOriginEmbedderPolicy: false, // Required for external images
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: true },

  // Expect-CT (Certificate Transparency)
  // expectCt: isProduction ? { maxAge: 86400, enforce: true } : false,

  // Frameguard - prevent clickjacking
  frameguard: { action: 'deny' },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // HSTS - HTTP Strict Transport Security
  hsts: isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,

  // IE No Open
  ieNoOpen: true,

  // No Sniff - prevent MIME type sniffing
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // XSS Filter (legacy, mostly for older browsers)
  xssFilter: true,
});

/**
 * Configure CORS for production
 */
export const getCorsConfig = () => {
  // Parse allowed origins from environment
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  // Default allowed origins
  const defaultOrigins = isDevelopment
    ? [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
      ]
    : [
        'https://balkanestateai.com',
        'https://www.balkanestateai.com',
      ];

  const origins = [...new Set([...defaultOrigins, ...allowedOrigins])];

  return cors({
    origin: (origin, callback) => {
      // In production, only allow requests with no origin for non-browser clients
      // (mobile apps, webhooks). These are further protected by auth middleware.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (origins.includes(origin)) {
        callback(null, true);
      } else if (isDevelopment) {
        // In development, allow any localhost origin
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          // Use callback(null, false) instead of callback(new Error(...)) to avoid
          // triggering Express error handler which strips CORS headers from the response
          apiLogger.warn(`CORS blocked origin: ${origin}`);
          callback(null, false);
        }
      } else {
        apiLogger.warn(`CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token',
      'X-Response-Key',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
  });
};

/**
 * General API rate limiter
 * Permissive limit for browsing, searching, and reading data
 * Active in all environments (relaxed limits in development)
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Generous for normal browsing/searching
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: 15,
  },
  standardHeaders: !isProduction, // Hide rate limit config from production responses
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting entirely in development for easier testing
    if (isDevelopment) return true;
    // Skip rate limiting for health checks only
    return req.path === '/health';
  },
  validate: { xForwardedForHeader: false },
});

/**
 * Stricter rate limiter for login/auth endpoints only
 * Prevents brute-force and credential stuffing attacks
 * Always enforced regardless of environment
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Strict for auth endpoints
  message: {
    error: 'Too many requests',
    message: 'Too many login attempts. Please try again later.',
    retryAfter: 15,
  },
  standardHeaders: !isProduction, // Hide rate limit config from production responses
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip rate limiting in development
});

/**
 * Mutation rate limiter for write operations (create, update, delete, upload)
 * More generous than auth limits but still protective against abuse
 */
export const mutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Reasonable for property management workflows
  message: {
    error: 'Too many requests',
    message: 'Too many write requests. Please slow down and try again shortly.',
    retryAfter: 15,
  },
  standardHeaders: !isProduction, // Hide rate limit config from production responses
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip rate limiting in development
});

/**
 * Very strict rate limiter for payment endpoints
 * In development mode, skip rate limiting entirely to avoid blocking during testing
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 30 : 0, // 0 = unlimited in development
  message: {
    error: 'Too many payment attempts',
    message: 'Too many payment attempts. Please try again later.',
    retryAfter: 60,
  },
  standardHeaders: !isProduction, // Hide rate limit config from production responses
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip rate limiting entirely in development
});

/**
 * Rate limiter for AI endpoints (neighborhood insights, valuations, etc.)
 * Protects against AI quota abuse while allowing reasonable usage
 * More permissive than payment but stricter than general
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: isProduction ? 60 : 100, // 60 requests per hour in production
  message: {
    error: 'AI rate limit exceeded',
    message: 'You have made too many AI requests. Please try again later.',
    retryAfter: 60,
  },
  standardHeaders: !isProduction, // Hide rate limit config from production responses
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip rate limiting in development
  keyGenerator: (req: Request) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    const userId = (req as any).user?.id;
    if (userId) {
      return `ai_user_${userId}`;
    }
    // Use default key generator behavior for IP-based limiting
    return 'unknown';
  },
  // Disable IPv6 validation since we use user ID primarily
  validate: { xForwardedForHeader: false },
});

/**
 * Rate limiter for message sending and image uploads in conversations.
 * Prevents spam and resource abuse. Keyed by authenticated user ID.
 */
export const messagingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 messages/hour in production
  message: {
    error: 'Too many messages',
    message: 'You are sending messages too fast. Please slow down.',
    retryAfter: 60,
  },
  standardHeaders: !isProduction,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip rate limiting in development
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    return userId ? `msg_user_${userId}` : ipKeyGenerator(req.ip || 'unknown');
  },
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
});

/**
 * Rate limiter for image uploads (tighter than messaging).
 * Uploads are more expensive (storage, bandwidth) so limit separately.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 uploads/hour in production
  message: {
    error: 'Too many uploads',
    message: 'You have uploaded too many images. Please try again later.',
    retryAfter: 60,
  },
  standardHeaders: !isProduction,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip rate limiting in development
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    return userId ? `upload_user_${userId}` : ipKeyGenerator(req.ip || 'unknown');
  },
  validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
});

/**
 * HPP (HTTP Parameter Pollution) Protection
 */
export const hppProtection = hpp({
  whitelist: [
    // Allow array parameters for filtering
    'tags',
    'amenities',
    'features',
    'images',
    'propertyTypes',
    'languages',
  ],
});

/**
 * MongoDB Query Sanitization
 * Custom implementation that prevents NoSQL injection attacks
 * without modifying read-only Express properties
 */
const sanitizeNoSQLInjection = (obj: any, path = ''): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check for MongoDB operators in string values
    if (obj.includes('$') && /\$[a-zA-Z]/.test(obj)) {
      return obj.replace(/\$/g, '_');
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => sanitizeNoSQLInjection(item, `${path}[${index}]`));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Block keys starting with $ (MongoDB operators)
        if (key.startsWith('$')) {
          sanitized[`_${key.slice(1)}`] = sanitizeNoSQLInjection(obj[key], `${path}.${key}`);
        } else {
          sanitized[key] = sanitizeNoSQLInjection(obj[key], `${path}.${key}`);
        }
      }
    }
    return sanitized;
  }

  return obj;
};

export const mongoSanitization = (req: Request, _res: Response, next: NextFunction): void => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSQLInjection(req.body, 'body');
  }
  // Sanitize query parameters to prevent operator injection via ?key[$gt]=
  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitizeNoSQLInjection({ ...req.query }, 'query');
    for (const key of Object.keys(req.query)) {
      (req.query as any)[key] = sanitizedQuery[key];
    }
  }
  next();
};

/**
 * XSS Sanitization middleware
 * Sanitizes user input to prevent XSS attacks
 */
export const xssSanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  // Fields that should NOT be sanitized (contain URLs, special content, or user text)
  const skipFields = new Set([
    'password', 'currentPassword', 'newPassword',
    'url', 'imageUrl', 'previewUrl', 'floorplanUrl', 'tourUrl',
    'virtualTour360Url', 'avatarUrl', 'publicId', 'images',
    'text', 'message', 'description', 'title', 'name', 'content', // User-facing text fields - React handles XSS escaping
    'bodyTemplate', 'footerHtml', 'headerHtml', 'subject', 'preheaderText', 'headerGradient' // Email template fields - contain intentional HTML edited by admins
  ]);

  // Recursive function to sanitize strings
  const sanitize = (obj: any, key?: string): any => {
    // Skip fields that contain URLs or sensitive data
    if (key && skipFields.has(key)) {
      return obj;
    }

    if (typeof obj === 'string') {
      // Don't sanitize strings that look like URLs
      if (obj.startsWith('http://') || obj.startsWith('https://') || obj.startsWith('data:')) {
        return obj;
      }
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/`/g, '&#96;');
      // Note: Removed slash replacement as it breaks URLs and is not needed for XSS prevention
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item, key));
    }
    if (obj !== null && typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const objKey in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, objKey)) {
          sanitized[objKey] = sanitize(obj[objKey], objKey);
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Only sanitize body - query and params are read-only in newer Express
  if (req.body) {
    req.body = sanitize(req.body);
  }

  next();
};

/**
 * Request ID middleware
 * Adds a cryptographically random opaque ID to each request for tracking/debugging.
 * Uses crypto.randomUUID() — does not leak server timestamps or internal state.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = crypto.randomUUID();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};

/**
 * Security logging middleware
 * Logs security-relevant events
 */
export const securityLogger = (req: Request, _res: Response, next: NextFunction): void => {
  // Log suspicious patterns
  const suspiciousPatterns: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /(\.\.|\/\.)/, label: 'Path traversal' },
    { pattern: /<script/i, label: 'XSS attempt' },
    { pattern: /javascript:/i, label: 'XSS attempt' },
    { pattern: /\$where/i, label: 'NoSQL injection' },
    { pattern: /\$gt/i, label: 'NoSQL injection' },
    { pattern: /\$lt/i, label: 'NoSQL injection' },
  ];

  const requestData = JSON.stringify({ body: req.body, query: req.query, params: req.params });

  for (const { pattern, label } of suspiciousPatterns) {
    if (pattern.test(requestData) || pattern.test(req.path)) {
      apiLogger.warn(
        `[SECURITY] Suspicious request detected: ${label} | IP: ${req.ip} | Path: ${req.path} | Method: ${req.method}`
      );
      break;
    }
  }

  next();
};

/**
 * HTTPS enforcement middleware
 * In production, redirects HTTP requests to HTTPS and blocks non-secure API calls.
 * Checks X-Forwarded-Proto header (set by load balancers/reverse proxies).
 */
export const enforceHttps = (req: Request, res: Response, next: NextFunction): void => {
  if (!isProduction) {
    next();
    return;
  }

  // Allow OPTIONS preflight requests through without HTTPS check
  // so CORS headers (set by earlier middleware) are preserved in the response
  if (req.method === 'OPTIONS') {
    next();
    return;
  }

  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  if (proto !== 'https') {
    // For API requests, reject with 403 instead of redirecting
    if (req.path.startsWith('/api')) {
      res.status(403).json({ message: 'HTTPS is required' });
      return;
    }
    // For other requests, redirect to HTTPS (validated against allowlist)
    const httpsUrl = buildSafeHttpsRedirect(req);
    if (!httpsUrl) {
      res.status(400).json({ message: 'Invalid host' });
      return;
    }
    res.redirect(301, httpsUrl);
    return;
  }
  next();
};

/**
 * Apply all security middleware to Express app
 */
export const applySecurityMiddleware = (app: Application): void => {

  // Note: CORS is applied earlier in server.ts (before all other middleware)
  // to ensure preflight OPTIONS requests always get proper headers.

  // 1. Enforce HTTPS in production
  app.use(enforceHttps);

  // 2. Request ID (for tracking)
  app.use(requestId);

  // 3. CSP nonce generation (must come before Helmet)
  app.use(cspNonceMiddleware);

  // 4. Helmet security headers (uses nonce from res.locals.cspNonce)
  app.use(helmetConfig);

  // 4. HPP protection
  app.use(hppProtection);

  // 5. MongoDB sanitization
  app.use(mongoSanitization);

  // 6. XSS sanitization - enabled globally for security
  app.use(xssSanitizer);

  // 7. Security logging
  app.use(securityLogger);

  // 8. General rate limiting (applied to /api routes in server.ts)
  // Rate limiting is applied per-route for more granular control

};

/**
 * Get Socket.IO CORS config
 */
export const getSocketCorsConfig = () => {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  const defaultOrigins = isDevelopment
    ? ['http://localhost:5173', 'http://localhost:3000']
    : ['https://balkanestateai.com', 'https://www.balkanestateai.com'];

  return {
    origin: [...new Set([...defaultOrigins, ...allowedOrigins])],
    methods: ['GET', 'POST'],
    credentials: true,
  };
};

export default {
  validateEnvironment,
  applySecurityMiddleware,
  enforceHttps,
  helmetConfig,
  cspNonceMiddleware,
  getCorsConfig,
  generalRateLimiter,
  sensitiveRateLimiter,
  mutationRateLimiter,
  paymentRateLimiter,
  aiRateLimiter,
  messagingRateLimiter,
  uploadRateLimiter,
  hppProtection,
  mongoSanitization,
  xssSanitizer,
  requestId,
  securityLogger,
  getSocketCorsConfig,
};
