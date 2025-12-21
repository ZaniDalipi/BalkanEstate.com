/**
 * Security Middleware Configuration
 * Comprehensive security hardening for production
 */

import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';

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
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const varsToCheck = isProduction ? productionRequiredVars : requiredVars;
  const missing: string[] = [];

  varsToCheck.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check for weak default secrets
  if (process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET === 'your-secret-key') {
    console.warn('⚠️  WARNING: JWT_SECRET is using a weak default value. Change it for production!');
    if (isProduction) {
      throw new Error('JWT_SECRET must be changed from default value in production');
    }
  }

  if (process.env.ENCRYPTION_KEY?.includes('default') || process.env.ENCRYPTION_KEY?.includes('change')) {
    console.warn('⚠️  WARNING: ENCRYPTION_KEY is using a default value. Change it for production!');
    if (isProduction) {
      throw new Error('ENCRYPTION_KEY must be changed from default value in production');
    }
  }

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    console.error(`❌ ${errorMsg}`);
    if (isProduction) {
      throw new Error(errorMsg);
    } else {
      console.warn('⚠️  Running in development mode - some features may not work correctly');
    }
  }

  console.log('✅ Environment variables validated');
};

/**
 * Configure Helmet security headers
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some inline scripts
        "'unsafe-eval'", // Required for some libraries
        'https://cdn.tailwindcss.com',
        'https://unpkg.com',
        'https://www.googletagmanager.com',
        'https://connect.facebook.net',
      ],
      styleSrc: [
        "'self'",
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
      ],
      connectSrc: [
        "'self'",
        'https://api.balkanestate.com',
        'wss://api.balkanestate.com',
        'https://nominatim.openstreetmap.org',
        'https://www.google-analytics.com',
        'https://connect.facebook.net',
        // Development URLs
        ...(isDevelopment ? [
          'http://localhost:5001',
          'ws://localhost:5001',
          'http://127.0.0.1:5001',
        ] : []),
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'https://res.cloudinary.com'],
      workerSrc: ["'self'", 'blob:'],
    },
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
      ];

  const origins = [...new Set([...defaultOrigins, ...allowedOrigins])];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
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
          console.warn(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
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
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
  });
};

/**
 * General API rate limiter
 * More permissive than auth rate limiting
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 200 : 1000, // Limit each IP
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  keyGenerator: (req: Request) => {
    // Use X-Forwarded-For header if behind proxy
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           req.ip ||
           req.socket.remoteAddress ||
           'unknown';
  },
});

/**
 * Stricter rate limiter for sensitive endpoints
 */
export const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 30 : 100, // Stricter limit
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
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 10 : 50, // Very strict
  message: {
    error: 'Too many payment attempts',
    message: 'Too many payment attempts. Please try again later.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
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
      console.warn(`🚨 Potential NoSQL injection blocked in string at ${path}: ${obj.substring(0, 50)}`);
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
          console.warn(`🚨 Potential NoSQL injection blocked: operator "${key}" at ${path}`);
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
  // Recursive function to sanitize strings
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/`/g, '&#96;')
        .replace(/\$/g, '&#36;');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj !== null && typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // Skip password fields from sanitization (they get hashed anyway)
          if (key === 'password' || key === 'currentPassword' || key === 'newPassword') {
            sanitized[key] = obj[key];
          } else {
            sanitized[key] = sanitize(obj[key]);
          }
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize body, query, and params
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
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
      console.warn(`🚨 SECURITY: Suspicious request pattern detected`, {
        requestId: req.headers['x-request-id'],
        ip: req.ip,
        path: req.path,
        method: req.method,
        pattern: pattern.toString(),
        timestamp: new Date().toISOString(),
      });
      break;
    }
  }

  next();
};

/**
 * Apply all security middleware to Express app
 */
export const applySecurityMiddleware = (app: Application): void => {
  console.log('🔒 Applying security middleware...');

  // 1. Request ID (first, for tracking)
  app.use(requestId);

  // 2. Helmet security headers
  app.use(helmetConfig);

  // 3. CORS
  app.use(getCorsConfig());

  // 4. HPP protection
  app.use(hppProtection);

  // 5. MongoDB sanitization
  app.use(mongoSanitization);

  // 6. XSS sanitization (applied to specific routes, not globally)
  // app.use(xssSanitizer); // Uncomment if needed globally

  // 7. Security logging
  app.use(securityLogger);

  // 8. General rate limiting (applied to /api routes in server.ts)
  // Rate limiting is applied per-route for more granular control

  console.log('✅ Security middleware applied');
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
    : ['https://balkanestate.com', 'https://www.balkanestate.com'];

  return {
    origin: [...new Set([...defaultOrigins, ...allowedOrigins])],
    methods: ['GET', 'POST'],
    credentials: true,
  };
};

export default {
  validateEnvironment,
  applySecurityMiddleware,
  helmetConfig,
  getCorsConfig,
  generalRateLimiter,
  sensitiveRateLimiter,
  paymentRateLimiter,
  hppProtection,
  mongoSanitization,
  xssSanitizer,
  requestId,
  securityLogger,
  getSocketCorsConfig,
};
