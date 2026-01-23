/**
 * Logger Utility
 *
 * Provides environment-aware logging.
 * In production, only errors and warnings are logged.
 * In development, all logs are shown.
 */

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  /**
   * Debug log - only in development
   */
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info log - only in development
   */
  info: (...args: any[]) => {
    if (!isProduction) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Warning log - always logged
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error log - always logged
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Payment/webhook log - only critical info in production
   */
  payment: (message: string, data?: any) => {
    if (isProduction) {
      // In production, only log essential info (no sensitive data)
      console.log(`[PAYMENT] ${message}`);
    } else {
      console.log(`[PAYMENT] ${message}`, data || '');
    }
  },
};

export default logger;
