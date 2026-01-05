/**
 * Production-safe logger utility
 * Only logs in development mode to prevent exposing debug info to users
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

const noop = () => {};

const createLogger = (): Logger => {
  if (isDevelopment) {
    return {
      log: (...args: unknown[]) => console.log(...args),
      info: (...args: unknown[]) => console.info(...args),
      warn: (...args: unknown[]) => console.warn(...args),
      error: (...args: unknown[]) => console.error(...args),
      debug: (...args: unknown[]) => console.debug(...args),
    };
  }

  // In production, only log errors (they go to Sentry anyway)
  return {
    log: noop,
    info: noop,
    warn: noop,
    error: (...args: unknown[]) => console.error(...args),
    debug: noop,
  };
};

export const logger = createLogger();

// Utility to suppress all console output in production
export const suppressConsoleLogs = () => {
  if (!isDevelopment) {
    const originalConsole = { ...console };

    console.log = noop;
    console.info = noop;
    console.debug = noop;
    // Keep warn and error for critical issues
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }
};

export default logger;
