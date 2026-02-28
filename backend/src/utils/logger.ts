/**
 * Backend Logger Utility
 * Provides structured logging with environment-aware behavior
 *
 * In production:
 * - Debug logs are suppressed unless DEBUG env var is set
 * - Sensitive data is automatically redacted
 * - Logs include request ID for tracing
 *
 * In development:
 * - All log levels are enabled
 * - Includes timestamps and colors
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  includeTimestamp: boolean;
  colorize: boolean;
  redactPatterns: RegExp[];
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  dim: '\x1b[2m',
};

// Environment detection
const isDevelopment = process.env.NODE_ENV !== 'production';
const isDebugEnabled = process.env.DEBUG === 'true' || isDevelopment;

// Default configuration
const defaultConfig: LoggerConfig = {
  enabled: true,
  minLevel: isDebugEnabled ? 'debug' : 'info',
  includeTimestamp: true,
  colorize: isDevelopment && process.stdout.isTTY,
  redactPatterns: [
    /password["\s:=]+["']?[^"'\s,}]+/gi,
    /token["\s:=]+["']?[^"'\s,}]+/gi,
    /secret["\s:=]+["']?[^"'\s,}]+/gi,
    /api[_-]?key["\s:=]+["']?[^"'\s,}]+/gi,
    /authorization["\s:=]+["']?[^"'\s,}]+/gi,
    /bearer\s+[a-zA-Z0-9._-]+/gi,
    /mongodb(\+srv)?:\/\/[^@]+@/gi, // MongoDB connection strings
  ],
};

let config = { ...defaultConfig };

/**
 * Redact sensitive information from log data
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
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('cookie') ||
        lowerKey.includes('privatekey')
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
 * Format timestamp
 */
const formatTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Colorize text if enabled
 */
const colorize = (text: string, color: keyof typeof COLORS): string => {
  if (!config.colorize) return text;
  return `${COLORS[color]}${text}${COLORS.reset}`;
};

/**
 * Format log message
 */
const formatMessage = (
  level: LogLevel,
  namespace: string,
  args: unknown[]
): string => {
  const parts: string[] = [];

  if (config.includeTimestamp) {
    parts.push(colorize(`[${formatTimestamp()}]`, 'dim'));
  }

  parts.push(colorize(`[${level.toUpperCase().padEnd(5)}]`, level));

  if (namespace) {
    parts.push(colorize(`[${namespace}]`, 'dim'));
  }

  // Process arguments
  const processedArgs = args.map((arg) => {
    if (arg instanceof Error) {
      return isDevelopment
        ? `${arg.message}\n${arg.stack}`
        : arg.message;
    }
    if (typeof arg === 'object') {
      const redacted = redactSensitive(arg);
      try {
        return JSON.stringify(redacted, null, isDevelopment ? 2 : 0);
      } catch {
        return String(arg);
      }
    }
    return String(redactSensitive(arg));
  });

  parts.push(...processedArgs);

  return parts.join(' ');
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
export const createLogger = (namespace: string) => {
  const log = (level: LogLevel, ...args: unknown[]) => {
    if (!shouldLog(level)) return;

    const message = formatMessage(level, namespace, args);

    switch (level) {
      case 'debug':
        console.debug(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
        console.error(message);
        break;
    }
  };

  return {
    debug: (...args: unknown[]) => log('debug', ...args),
    info: (...args: unknown[]) => log('info', ...args),
    warn: (...args: unknown[]) => log('warn', ...args),
    error: (...args: unknown[]) => log('error', ...args),
    log,

    /**
     * Create child logger with extended namespace
     */
    child: (childNamespace: string) =>
      createLogger(`${namespace}:${childNamespace}`),

    /**
     * Log with request context
     */
    withRequest: (requestId: string) =>
      createLogger(`${namespace}:${requestId}`),
  };
};

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
export const dbLogger = createLogger('Database');
export const paymentLogger = createLogger('Payment');
export const emailLogger = createLogger('Email');
export const socketLogger = createLogger('Socket');
export const cronLogger = createLogger('Cron');
export const agencyLogger = createLogger('Agency');
export const propertyLogger = createLogger('Property');
export const adminLogger = createLogger('Admin');
export const promotionLogger = createLogger('Promotion');
export const subscriptionLogger = createLogger('Subscription');
export const videoLogger = createLogger('Video');
export const webhookLogger = createLogger('Webhook');
export const geocodingLogger = createLogger('Geocoding');
export const mediaLogger = createLogger('Media');
export const serverLogger = createLogger('Server');
export const scriptLogger = createLogger('Script');

export default logger;
