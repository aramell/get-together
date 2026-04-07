/**
 * Logging Middleware
 * Task 1: Application Logging Infrastructure (AC1, AC8)
 * Next.js middleware for request/response logging with correlation IDs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from './logger';
import { maskHeaders } from './pii-masking';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  correlationId: string;
  requestId: string;
  startTime: number;
  userId?: string;
  groupId?: string;
}

const requestContextMap = new WeakMap<any, RequestContext>();
const logger = getLogger('http');

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `api-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract or create correlation ID from request
 */
function getCorrelationId(request: NextRequest): string {
  const header = request.headers.get('X-Correlation-ID');
  if (header && isValidUUID(header)) {
    return header;
  }
  return uuidv4();
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('X-Real-IP') || 'unknown';
}

/**
 * Create request context
 */
function createRequestContext(request: NextRequest): RequestContext {
  const correlationId = getCorrelationId(request);
  const requestId = generateRequestId();
  const startTime = Date.now();

  return {
    correlationId,
    requestId,
    startTime
  };
}

/**
 * Log incoming request
 */
function logRequest(request: NextRequest, context: RequestContext): void {
  const method = request.method;
  const path = new URL(request.url).pathname;
  const search = new URL(request.url).search;
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  const clientIP = getClientIP(request);

  // Don't log sensitive headers
  const safeHeaders = {
    'content-type': request.headers.get('Content-Type'),
    'user-agent': userAgent,
    'accept': request.headers.get('Accept')
  };

  logger.info('Incoming request', {
    correlationId: context.correlationId,
    requestId: context.requestId,
    method,
    path: path + search,
    clientIP,
    headers: safeHeaders,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log outgoing response
 */
function logResponse(
  statusCode: number,
  context: RequestContext,
  method: string,
  path: string,
  responseSize?: number
): void {
  const duration = Date.now() - context.startTime;
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

  logger[level as 'info' | 'warn' | 'error']('Outgoing response', {
    correlationId: context.correlationId,
    requestId: context.requestId,
    method,
    path,
    statusCode,
    duration,
    responseSize,
    timestamp: new Date().toISOString()
  });
}

/**
 * Create logging middleware for Next.js API routes
 */
export function createLoggingMiddleware(customLogger = logger) {
  return (handler: Function) => {
    return async (request: NextRequest, ...args: any[]) => {
      const context = createRequestContext(request);
      const method = request.method;
      const path = new URL(request.url).pathname;

      // Log incoming request
      logRequest(request, context);

      try {
        // Call the actual handler
        const response = await handler(request, ...args);

        // Log response
        if (response instanceof NextResponse) {
          const statusCode = response.status;
          logResponse(statusCode, context, method, path, response.headers.get('Content-Length') ? parseInt(response.headers.get('Content-Length')!) : undefined);
        }

        // Add correlation ID to response headers
        const headers = new Headers(response.headers);
        headers.set('X-Correlation-ID', context.correlationId);
        headers.set('X-Request-ID', context.requestId);

        return new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (error) {
        // Log error
        const statusCode = error instanceof Error && 'status' in error ? (error as any).status : 500;
        logResponse(statusCode, context, method, path);

        throw error;
      }
    };
  };
}

/**
 * Middleware function for wrapping API route handlers
 */
export function withLogging(handler: any) {
  return async (request: NextRequest, context: any) => {
    const logContext = createRequestContext(request);
    const method = request.method;
    const path = new URL(request.url).pathname;

    // Log incoming request
    logRequest(request, logContext);

    try {
      // Call handler
      const response = await handler(request, context);

      // Log response
      const statusCode = response.status || 200;
      logResponse(statusCode, logContext, method, path);

      // Add correlation ID to response
      const headers = new Headers(response.headers || {});
      headers.set('X-Correlation-ID', logContext.correlationId);
      headers.set('X-Request-ID', logContext.requestId);

      return new NextResponse(response.body, {
        status: statusCode,
        headers
      });
    } catch (error) {
      // Log error
      const statusCode = error instanceof Error && 'status' in error ? (error as any).status : 500;
      logResponse(statusCode, logContext, method, path);

      // Log error details
      logger.error('Request failed', {
        correlationId: logContext.correlationId,
        requestId: logContext.requestId,
        method,
        path,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error
      });

      throw error;
    }
  };
}

/**
 * Get correlation ID from current request context
 */
export function getCorrelationIdFromContext(context: any): string {
  return context?.correlationId || 'unknown';
}

/**
 * Set correlation ID in request context
 */
export function setCorrelationIdInContext(context: any, correlationId: string): void {
  if (context) {
    context.correlationId = correlationId;
  }
}
