/**
 * Frontend Logger Utility
 * Provides structured logging with environment-aware behavior
 *
 * In production:
 * - Debug and info logs are suppressed
 * - Warnings and errors are still logged
 * - Sensitive data is redacted
 *
 * In development:
 * - All log levels are enabled
 * - Includes timestamps and caller info
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  includeTimestamp: boolean;
  redactPatterns: RegExp[];
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Environment detection
const isDevelopment = typeof window !== 'undefined'
  ? import.meta.env?.DEV ?? true
  : process.env.NODE_ENV !== 'production';

// Default configuration
const defaultConfig: LoggerConfig = {
  enabled: true,
  minLevel: isDevelopment ? 'debug' : 'warn',
  includeTimestamp: isDevelopment,
  redactPatterns: [
    /password["\s:=]+["']?[^"'\s,}]+/gi,
    /token["\s:=]+["']?[^"'\s,}]+/gi,
    /secret["\s:=]+["']?[^"'\s,}]+/gi,
    /api[_-]?key["\s:=]+["']?[^"'\s,}]+/gi,
    /authorization["\s:=]+["']?[^"'\s,}]+/gi,
    /bearer\s+[a-zA-Z0-9._-]+/gi,
  ],
};

let config = { ...defaultConfig };

/**
 * Redact sensitive information from log messages
 */
const redactSensitive = (data: unknown): unknown => {
  if (typeof data === 'string') {
    let result = data;
    for (const pattern of config.redactPatterns) {
      result = result.replace(pattern, '[REDACTED]');
    }
    return result;
  }

  if (Array.isArray(data)) {
    return data.map(redactSensitive);
  }

  if (data !== null && typeof data === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('authorization')
      ) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitive(value);
      }
    }
    return redacted;
  }

  return data;
};

/**
 * Format log message with optional timestamp
 */
const formatMessage = (level: LogLevel, prefix: string, ...args: unknown[]): unknown[] => {
  const parts: unknown[] = [];

  if (config.includeTimestamp) {
    parts.push(`[${new Date().toISOString()}]`);
  }

  parts.push(`[${level.toUpperCase()}]`);

  if (prefix) {
    parts.push(`[${prefix}]`);
  }

  // Redact sensitive data in production
  const processedArgs = isDevelopment ? args : args.map(redactSensitive);

  return [...parts, ...processedArgs];
};

/**
 * Check if log level should be output
 */
const shouldLog = (level: LogLevel): boolean => {
  if (!config.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
};

/**
 * Create a namespaced logger
 */
export const createLogger = (namespace: string) => ({
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.debug(...formatMessage('debug', namespace, ...args));
    }
  },

  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.info(...formatMessage('info', namespace, ...args));
    }
  },

  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(...formatMessage('warn', namespace, ...args));
    }
  },

  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(...formatMessage('error', namespace, ...args));
    }
  },

  /**
   * Log with specific level
   */
  log: (level: LogLevel, ...args: unknown[]) => {
    if (shouldLog(level)) {
      const method = level === 'debug' ? console.debug :
                     level === 'info' ? console.info :
                     level === 'warn' ? console.warn : console.error;
      method(...formatMessage(level, namespace, ...args));
    }
  },

  /**
   * Create child logger with extended namespace
   */
  child: (childNamespace: string) => createLogger(`${namespace}:${childNamespace}`),
});

/**
 * Default application logger
 */
export const logger = createLogger('App');

/**
 * Configure logger settings
 */
export const configureLogger = (newConfig: Partial<LoggerConfig>) => {
  config = { ...config, ...newConfig };
};

/**
 * Disable all logging (useful for tests)
 */
export const disableLogging = () => {
  config.enabled = false;
};

/**
 * Enable logging
 */
export const enableLogging = () => {
  config.enabled = true;
};

/**
 * Feature-specific loggers
 */
export const authLogger = createLogger('Auth');
export const apiLogger = createLogger('API');
export const mapLogger = createLogger('Map');
export const paymentLogger = createLogger('Payment');
export const propertyLogger = createLogger('Property');
export const i18nLogger = createLogger('i18n');

export default logger;
