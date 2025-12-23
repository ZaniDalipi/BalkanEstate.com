/**
 * Sentry Error Monitoring for Backend
 * Tracks errors and performance in production
 */

import * as Sentry from '@sentry/node';
import { Application, Request, Response, NextFunction } from 'express';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Sentry configuration
const SENTRY_DSN = process.env.SENTRY_DSN;

/**
 * Initialize Sentry for the backend
 */
export const initSentry = (): void => {
  if (!SENTRY_DSN) {
    if (isDevelopment) {
      console.log('ℹ️ Sentry DSN not configured - error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // Release tracking
    release: process.env.RELEASE_VERSION || 'development',

    // Ignore common non-actionable errors
    ignoreErrors: [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'socket hang up',
    ],

    // Filter sensitive data
    beforeSend(event: Sentry.ErrorEvent) {
      // Don't send in development unless explicitly enabled
      if (isDevelopment && !process.env.SENTRY_DEV_ENABLED) {
        return null;
      }

      // Scrub sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      return event;
    },
  });

  console.log('✅ Sentry initialized for backend error tracking');
};

/**
 * Setup Sentry for Express app
 */
export const setupSentry = (app: Application): void => {
  if (!SENTRY_DSN) {
    return;
  }

  // Add request context to Sentry
  app.use((req: Request, _res: Response, next: NextFunction) => {
    Sentry.setContext('request', {
      method: req.method,
      url: req.url,
      query: req.query,
    });
    next();
  });

  console.log('✅ Sentry middleware attached to Express');
};

/**
 * Attach Sentry error handler to Express app
 * Call this after all routes but before other error handlers
 */
export const attachSentryErrorHandler = (app: Application): void => {
  if (!SENTRY_DSN) {
    return;
  }

  // Error handler that reports to Sentry
  app.use((err: Error, req: Request, _res: Response, next: NextFunction) => {
    Sentry.captureException(err, {
      extra: {
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
      },
    });
    next(err);
  });
};

/**
 * Capture a custom error with context
 */
export const captureError = (
  error: Error,
  context?: Record<string, any>
): void => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a custom message
 */
export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void => {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: {
  id: string;
  email?: string;
  role?: string;
} | null): void => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, any>
): void => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

export default {
  init: initSentry,
  setupSentry,
  attachSentryErrorHandler,
  captureError,
  captureMessage,
  setUser,
  addBreadcrumb,
};
