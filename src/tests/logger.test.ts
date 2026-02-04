/**
 * Logger Utility Tests
 * Tests for logging functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createLogger,
  configureLogger,
  disableLogging,
  enableLogging,
} from '../shared/utils/logger';

describe('createLogger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    enableLogging();
  });

  afterEach(() => {
    consoleSpy.debug.mockRestore();
    consoleSpy.info.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  it('should create a logger with a namespace', () => {
    const logger = createLogger('TestNamespace');
    expect(logger).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
  });

  it('should log debug messages', () => {
    const logger = createLogger('Test');
    logger.debug('Debug message');
    expect(consoleSpy.debug).toHaveBeenCalled();
  });

  it('should log info messages', () => {
    const logger = createLogger('Test');
    logger.info('Info message');
    expect(consoleSpy.info).toHaveBeenCalled();
  });

  it('should log warn messages', () => {
    const logger = createLogger('Test');
    logger.warn('Warning message');
    expect(consoleSpy.warn).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    const logger = createLogger('Test');
    logger.error('Error message');
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('should create child loggers', () => {
    const logger = createLogger('Parent');
    const child = logger.child('Child');
    expect(child).toBeDefined();
    child.info('Child message');
    expect(consoleSpy.info).toHaveBeenCalled();
  });
});

describe('disableLogging', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    enableLogging();
  });

  it('should disable all logging', () => {
    disableLogging();
    const logger = createLogger('Test');
    logger.info('This should not be logged');
    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('enableLogging', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    disableLogging();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    enableLogging();
  });

  it('should re-enable logging after disable', () => {
    enableLogging();
    const logger = createLogger('Test');
    logger.info('This should be logged');
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('configureLogger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
    enableLogging();
  });

  afterEach(() => {
    consoleSpy.debug.mockRestore();
    consoleSpy.warn.mockRestore();
    // Reset to default config
    configureLogger({ minLevel: 'debug' });
  });

  it('should respect minLevel configuration', () => {
    configureLogger({ minLevel: 'warn' });
    const logger = createLogger('Test');

    logger.debug('Debug message');
    logger.warn('Warn message');

    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalled();
  });
});

describe('sensitive data redaction', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    enableLogging();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should redact password fields in objects', () => {
    const logger = createLogger('Test');
    const data = { username: 'user', password: 'secret123' };
    logger.warn('User data', data);

    // The spy was called, verify it doesn't contain the actual password
    expect(consoleSpy).toHaveBeenCalled();
    const callArg = consoleSpy.mock.calls[0].join(' ');
    expect(callArg).not.toContain('secret123');
  });

  it('should redact token fields in objects', () => {
    const logger = createLogger('Test');
    const data = { token: 'jwt.token.here', userId: '123' };
    logger.warn('Auth data', data);

    expect(consoleSpy).toHaveBeenCalled();
    const callArg = consoleSpy.mock.calls[0].join(' ');
    expect(callArg).not.toContain('jwt.token.here');
  });
});
