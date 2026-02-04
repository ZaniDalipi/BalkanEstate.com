/**
 * Sentry Error Monitoring Configuration
 * Tracks errors and performance in production
 */

import * as Sentry from '@sentry/react';

// Environment detection
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Sentry configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || (isProduction ? 'production' : 'development');

/**
 * Initialize Sentry for the frontend
 */
export const initSentry = (): void => {
  // Only initialize if DSN is provided
  if (!SENTRY_DSN) {
    if (isDevelopment) {
      // Log removed
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay (optional - can increase bundle size)
    replaysSessionSampleRate: isProduction ? 0.1 : 0,
    replaysOnErrorSampleRate: isProduction ? 1.0 : 0,

    // Release tracking (set via CI/CD)
    release: import.meta.env.VITE_RELEASE_VERSION || 'development',

    // Ignore common non-actionable errors
    ignoreErrors: [
      // Browser extensions
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Network errors
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'NetworkError',
      // User cancelled
      'AbortError',
      'The operation was aborted',
      // Resize observer (common, usually harmless)
      'ResizeObserver loop',
      // Script errors from third-party
      'Script error.',
      // Common React errors during development
      /Minified React error/,
    ],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly enabled
      if (isDevelopment && !import.meta.env.VITE_SENTRY_DEV_ENABLED) {
        return null;
      }

      // Scrub sensitive data from the event
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      // Add additional context
      event.tags = {
        ...event.tags,
        app_version: import.meta.env.VITE_APP_VERSION || 'unknown',
      };

      return event;
    },

    // Configure which URLs to trace
    tracePropagationTargets: [
      'localhost',
      /^https:\/\/api\.balkanestate\.com/,
      /^https:\/\/balkanestate\.com/,
    ],
  });

  // Log removed
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
      // Don't include sensitive info like name
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

/**
 * Start a performance transaction
 */
export const startTransaction = (
  name: string,
  op: string
): Sentry.Span | undefined => {
  return Sentry.startInactiveSpan({
    name,
    op,
  });
};

/**
 * React Error Boundary with Sentry
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * HOC to wrap components with Sentry profiling
 */
export const withSentryProfiler = Sentry.withProfiler;

export default {
  init: initSentry,
  captureError,
  captureMessage,
  setUser,
  addBreadcrumb,
  startTransaction,
  ErrorBoundary: SentryErrorBoundary,
  withProfiler: withSentryProfiler,
};
