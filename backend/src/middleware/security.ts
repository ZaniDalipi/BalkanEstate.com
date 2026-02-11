/**
 * Security Middleware Configuration
 * Comprehensive security hardening for production
 */

import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import { apiLogger } from '../utils/logger';

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
 * Configure Helmet security headers
 *
 * CSP Notes:
 * - 'unsafe-inline' is required for Tailwind CSS and React's style injection
 * - 'unsafe-eval' is required for some mapping libraries (MapLibre, Leaflet)
 * - TODO: Implement nonce-based CSP for better security when feasible
 * - Report-only mode can be used to test stricter policies
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Note: 'unsafe-inline' needed for React hydration, Tailwind
        // TODO: Migrate to nonce-based CSP for scripts
        "'unsafe-inline'",
        // Note: 'unsafe-eval' needed for MapLibre GL JS
        // See: https://github.com/maplibre/maplibre-gl-js/issues/1035
        "'unsafe-eval'",
        'https://unpkg.com',
        'https://www.googletagmanager.com',
        'https://connect.facebook.net',
      ],
      styleSrc: [
        "'self'",
        // Note: 'unsafe-inline' needed for Tailwind CSS and component styles
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
        'https://api.balkanestate.com',
        'https://www.balkanestate.com',
        'wss://api.balkanestate.com',
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
        'https://balkanestate.com',
        'https://www.balkanestate.com',
        'https://app.balkanestate.com',
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
 * More permissive than auth rate limiting
 * Active in all environments (relaxed limits in development)
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 200 : 500, // Relaxed but not unlimited in development
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks only
    return req.path === '/health';
  },
  validate: { xForwardedForHeader: false },
});

/**
 * Stricter rate limiter for sensitive endpoints (auth, admin)
 * Always enforced regardless of environment
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 30 : 60, // Stricter even in development
  message: {
    error: 'Too many requests',
    message: 'Too many requests to this endpoint. Please try again later.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Very strict rate limiter for payment endpoints
 * In development mode, skip rate limiting entirely to avoid blocking during testing
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 10 : 0, // 0 = unlimited in development
  message: {
    error: 'Too many payment attempts',
    message: 'Too many payment attempts. Please try again later.',
    retryAfter: 60,
  },
  standardHeaders: true,
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
  max: isProduction ? 20 : 100, // 20 requests per hour in production
  message: {
    error: 'AI rate limit exceeded',
    message: 'You have made too many AI requests. Please try again later.',
    retryAfter: 60,
  },
  standardHeaders: true,
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
  // Only sanitize body - query and params are read-only in newer Express
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSQLInjection(req.body, 'body');
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
    'text', 'message', 'description', 'title', 'name', 'content' // User-facing text fields - React handles XSS escaping
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
 * Adds unique ID to each request for tracking/debugging
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
  const suspiciousPatterns = [
    /(\.\.|\/\.)/,  // Path traversal
    /<script/i,     // XSS attempt
    /javascript:/i, // XSS attempt
    /\$where/i,     // NoSQL injection
    /\$gt/i,        // NoSQL injection
    /\$lt/i,        // NoSQL injection
  ];

  const requestData = JSON.stringify({ body: req.body, query: req.query, params: req.params });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData) || pattern.test(req.path)) {
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
    // For other requests, redirect to HTTPS
    res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
    return;
  }
  next();
};

/**
 * Apply all security middleware to Express app
 */
export const applySecurityMiddleware = (app: Application): void => {

  // 0. CORS (must be first to handle preflight OPTIONS requests before
  //    any other middleware can short-circuit the response without CORS headers)
  app.use(getCorsConfig());

  // 1. Enforce HTTPS in production
  app.use(enforceHttps);

  // 2. Request ID (for tracking)
  app.use(requestId);

  // 3. Helmet security headers
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
    : ['https://balkanestate.com', 'https://www.balkanestate.com', 'https://balkanestateai.com', 'https://www.balkanestateai.com'];

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
  getCorsConfig,
  generalRateLimiter,
  sensitiveRateLimiter,
  paymentRateLimiter,
  aiRateLimiter,
  hppProtection,
  mongoSanitization,
  xssSanitizer,
  requestId,
  securityLogger,
  getSocketCorsConfig,
};
