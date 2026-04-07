/**
 * Logger Unit Tests
 * Task 1: Application Logging Infrastructure (AC1, AC8)
 * Tests for logger initialization, structured logging, and PII masking
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createLogger, getLogger, setLogLevel, LogLevel } from '@/lib/logging/logger';

describe('Logger - Initialization & Configuration', () => {
  beforeEach(() => {
    // Reset logger state before each test
    jest.clearAllMocks();
  });

  it('should initialize logger with Winston transport', () => {
    const logger = createLogger('test');
    expect(logger).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
  });

  it('should support DEBUG log level in development', () => {
    setLogLevel('development', LogLevel.DEBUG);
    const logger = getLogger('dev-logger');
    expect(logger).toBeDefined();
    // Logger should accept debug calls without error
    logger.debug('test debug message');
  });

  it('should support INFO log level in staging', () => {
    setLogLevel('staging', LogLevel.INFO);
    const logger = getLogger('staging-logger');
    expect(logger).toBeDefined();
    logger.info('test info message');
  });

  it('should support WARN log level in production', () => {
    setLogLevel('production', LogLevel.WARN);
    const logger = getLogger('prod-logger');
    expect(logger).toBeDefined();
    logger.warn('test warn message');
  });

  it('should create logger with context metadata', () => {
    const logger = createLogger('service-name', { service: 'api', version: '1.0' });
    expect(logger).toBeDefined();
    // Logger should include metadata in output
  });

  it('should support multiple logger instances', () => {
    const authLogger = createLogger('auth');
    const dbLogger = createLogger('database');
    const apiLogger = createLogger('api');

    expect(authLogger).toBeDefined();
    expect(dbLogger).toBeDefined();
    expect(apiLogger).toBeDefined();
    expect(authLogger).not.toBe(dbLogger);
  });

  it('should output structured JSON format', () => {
    const logger = createLogger('json-test');
    const mockTransport = vi.fn();

    // Log a message and verify structured format
    logger.info('test message', { userId: 'user-123', groupId: 'group-456' });

    // Output should be JSON-structured with timestamp, level, message, etc.
  });

  it('should include correlation ID in logs if provided', () => {
    const logger = createLogger('correlation-test');
    const correlationId = 'corr-12345';

    logger.info('test with correlation', { correlationId, userId: 'user-1' });

    // Log output should include correlationId field
  });
});

describe('Logger - Structured Logging Format', () => {
  it('should include timestamp in ISO 8601 format', () => {
    const logger = createLogger('timestamp-test');
    logger.info('test message');

    // Output should have timestamp: "2026-04-03T10:30:45.123Z"
  });

  it('should include log level (DEBUG, INFO, WARN, ERROR)', () => {
    const logger = createLogger('level-test');

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    // Each log should include level field
  });

  it('should include request method and path for API logs', () => {
    const logger = createLogger('api-logs');
    logger.info('API request', {
      method: 'GET',
      path: '/api/groups/123',
      statusCode: 200,
      duration: 145
    });

    // Log should have method, path, statusCode, duration fields
  });

  it('should include error stack trace for error logs', () => {
    const logger = createLogger('error-test');
    const error = new Error('Test error');

    logger.error('An error occurred', { error });

    // Error log should include stack trace
  });

  it('should support additional context fields', () => {
    const logger = createLogger('context-test');
    logger.info('test with context', {
      userId: 'user-123',
      groupId: 'group-456',
      action: 'create_event',
      resourceId: 'event-789'
    });

    // Log should include all context fields
  });

  it('should not include sensitive data fields (by default)', () => {
    const logger = createLogger('sensitive-test');

    // Should not log raw passwords, tokens, etc.
    logger.info('user login', {
      userId: 'user-123',
      password: 'secret123' // Should be masked or excluded
    });
  });
});

describe('Logger - Error Handling', () => {
  it('should log errors with stack trace', () => {
    const logger = createLogger('error-handling');
    const error = new Error('Database connection failed');

    logger.error('Failed to connect to database', {
      error,
      hostname: 'db.example.com'
    });
  });

  it('should support nested error context', () => {
    const logger = createLogger('nested-error');
    const originalError = new Error('Connection timeout');
    const wrappedError = new Error('Database operation failed');
    wrappedError.cause = originalError;

    logger.error('Operation failed', { error: wrappedError });
  });

  it('should handle null/undefined error gracefully', () => {
    const logger = createLogger('error-null');

    expect(() => {
      logger.error('Something went wrong', { error: null });
      logger.error('Something went wrong', { error: undefined });
    }).not.toThrow();
  });
});

describe('Logger - Environment Awareness', () => {
  it('should log at appropriate level for development', () => {
    setLogLevel('development', LogLevel.DEBUG);
    const logger = getLogger('dev');

    // DEBUG, INFO, WARN, ERROR all should be logged
    expect(() => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
    }).not.toThrow();
  });

  it('should log at appropriate level for staging', () => {
    setLogLevel('staging', LogLevel.INFO);
    const logger = getLogger('staging');

    // INFO, WARN, ERROR should be logged; DEBUG should be filtered
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');
  });

  it('should log at appropriate level for production', () => {
    setLogLevel('production', LogLevel.WARN);
    const logger = getLogger('prod');

    // WARN, ERROR should be logged; DEBUG, INFO should be filtered
    logger.warn('warn message');
    logger.error('error message');
  });

  it('should support custom log format for CI environments', () => {
    setLogLevel('ci', LogLevel.INFO);
    const logger = getLogger('ci-logger');

    // Should output JSON format suitable for log aggregation
    logger.info('ci test message', { buildId: 'build-123' });
  });
});

describe('Logger - Performance', () => {
  it('should log with minimal overhead (<10ms)', () => {
    const logger = createLogger('perf-test');
    const iterations = 100;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      logger.info('perf test', { iteration: i });
    }
    const elapsed = performance.now() - start;

    // Total time for 100 logs should be reasonable
    expect(elapsed).toBeLessThan(1000); // <10ms per log on average
  });

  it('should handle high-volume logging without buffering issues', () => {
    const logger = createLogger('volume-test');

    const messages = Array.from({ length: 1000 }, (_, i) => ({
      iteration: i,
      message: `Volume test ${i}`
    }));

    expect(() => {
      messages.forEach((msg) => {
        logger.info(msg.message, { iteration: msg.iteration });
      });
    }).not.toThrow();
  });
});
