/**
 * Application Logger
 * Task 1: Application Logging Infrastructure (AC1, AC8)
 * Winston-based structured logging with environment-aware configuration
 */

import winston from 'winston';
import { maskSensitiveObject } from './pii-masking';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

type Environment = 'development' | 'staging' | 'production' | 'ci';

interface LoggerConfig {
  level: LogLevel;
  format: winston.Logform.Format;
  transports: winston.transport[];
  defaultMeta?: Record<string, any>;
}

const loggers = new Map<string, winston.Logger>();
let currentLogLevel: LogLevel = LogLevel.DEBUG;
let currentEnvironment: Environment = (process.env.NODE_ENV as Environment) || 'development';

/**
 * Get environment-specific log level
 */
function getEnvironmentLogLevel(env: Environment): LogLevel {
  switch (env) {
    case 'production':
      return LogLevel.WARN;
    case 'staging':
      return LogLevel.INFO;
    case 'ci':
      return LogLevel.INFO;
    case 'development':
    default:
      return LogLevel.DEBUG;
  }
}

/**
 * Create structured log format
 */
function createLogFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      // Mask sensitive data before logging
      const maskedMeta = maskSensitiveObject(meta);

      // Structured JSON format
      const log = {
        timestamp,
        level,
        message,
        ...maskedMeta
      };

      return JSON.stringify(log);
    })
  );
}

/**
 * Create console format for local development (pretty-printed)
 */
function createConsoleFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const maskedMeta = maskSensitiveObject(meta);
      const metaStr = Object.keys(maskedMeta).length > 0 ? ' ' + JSON.stringify(maskedMeta) : '';
      return `${timestamp} [${level}] ${message}${metaStr}`;
    })
  );
}

/**
 * Create logger configuration for environment
 */
function createLoggerConfig(name: string, meta?: Record<string, any>): LoggerConfig {
  const level = currentLogLevel;
  const transports: winston.transport[] = [];

  // Console transport for development
  if (currentEnvironment === 'development') {
    transports.push(
      new winston.transports.Console({
        format: createConsoleFormat()
      })
    );
  } else {
    // JSON format for CI/staging/production
    transports.push(
      new winston.transports.Console({
        format: createLogFormat()
      })
    );
  }

  // CloudWatch transport (will be configured in Task 2)
  // transports.push(new WinstonCloudWatch({ ... }));

  return {
    level,
    format: createLogFormat(),
    transports,
    defaultMeta: {
      service: name,
      environment: currentEnvironment,
      ...meta
    }
  };
}

/**
 * Create a new logger instance
 */
export function createLogger(name: string, meta?: Record<string, any>): winston.Logger {
  if (loggers.has(name)) {
    return loggers.get(name)!;
  }

  const config = createLoggerConfig(name, meta);
  const logger = winston.createLogger(config);

  loggers.set(name, logger);
  return logger;
}

/**
 * Get existing logger by name
 */
export function getLogger(name: string): winston.Logger {
  if (!loggers.has(name)) {
    return createLogger(name);
  }
  return loggers.get(name)!;
}

/**
 * Set log level for specific environment
 */
export function setLogLevel(env: Environment, level: LogLevel): void {
  currentEnvironment = env;
  currentLogLevel = level;

  // Update all existing loggers
  loggers.forEach((logger) => {
    logger.level = level;
  });
}

/**
 * Set environment and configure log levels
 */
export function setEnvironment(env: Environment): void {
  currentEnvironment = env;
  const level = getEnvironmentLogLevel(env);
  setLogLevel(env, level);
}

/**
 * Get all active loggers (for testing)
 */
export function getAllLoggers(): Map<string, winston.Logger> {
  return loggers;
}

/**
 * Clear all loggers (for testing)
 */
export function clearLoggers(): void {
  loggers.forEach((logger) => {
    logger.clear();
  });
  loggers.clear();
}

// Initialize environment on module load
setEnvironment(currentEnvironment);

// Create default logger
export const logger = createLogger('app');
