/**
 * Correlation ID Management
 * Task 5: Request Tracing & Correlation (AC5)
 * Manages correlation IDs for distributed request tracing
 */

import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Context store using AsyncLocalStorage for request isolation
 * Ensures each async context (request) has its own correlation context
 * Safe for concurrent requests and serverless environments
 */
const contextStore = new AsyncLocalStorage<CorrelationContext>();

/**
 * Fallback context for cases where AsyncLocalStorage is not available
 */
let fallbackContext: CorrelationContext | null = null;

export interface CorrelationContext {
  correlationId: string;
  requestId?: string;
  userId?: string;
  groupId?: string;
  requestPath?: string;
  startTime?: number;
}

/**
 * Generate a new correlation ID (UUID v4)
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Generate a new request ID with prefix
 */
export function generateRequestId(): string {
  return `api-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate UUID v4 format
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Create correlation context with provided metadata
 */
export function createCorrelationContext(input: {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  groupId?: string;
  requestPath?: string;
}): CorrelationContext {
  const context: CorrelationContext = {
    correlationId: input.correlationId || generateCorrelationId(),
    requestId: input.requestId || generateRequestId(),
    userId: input.userId,
    groupId: input.groupId,
    requestPath: input.requestPath,
    startTime: Date.now()
  };

  // Store in AsyncLocalStorage (request-isolated)
  contextStore.enterWith(context);
  // Also set fallback for non-async contexts
  fallbackContext = context;

  return context;
}

/**
 * Get current context from AsyncLocalStorage or fallback
 */
function getCurrentContext(): CorrelationContext | undefined {
  return contextStore.getStore() || fallbackContext || undefined;
}

/**
 * Get correlation ID for current request
 */
export function getCorrelationId(): string {
  const context = getCurrentContext();
  return context?.correlationId || generateCorrelationId();
}

/**
 * Set correlation ID for current request
 */
export function setCorrelationId(id: string): void {
  let context = getCurrentContext();
  if (!context) {
    context = { correlationId: id };
    contextStore.enterWith(context);
    fallbackContext = context;
  } else {
    context.correlationId = id;
  }
}

/**
 * Get request ID for current request
 */
export function getRequestId(): string {
  const context = getCurrentContext();
  return context?.requestId || generateRequestId();
}

/**
 * Set request ID for current request
 */
export function setRequestId(id: string): void {
  let context = getCurrentContext();
  if (!context) {
    context = { correlationId: generateCorrelationId(), requestId: id };
    contextStore.enterWith(context);
    fallbackContext = context;
  } else {
    context.requestId = id;
  }
}

/**
 * Get current correlation context
 */
export function getContext(): CorrelationContext | undefined {
  return getCurrentContext();
}

/**
 * Set correlation context
 */
export function setContext(context: CorrelationContext): void {
  contextStore.enterWith(context);
  fallbackContext = context;
}

/**
 * Clear correlation context (for testing or cleanup)
 */
export function clearContext(): void {
  fallbackContext = null;
  // AsyncLocalStorage cannot be cleared directly, it's cleared on async context exit
}

/**
 * Add user ID to correlation context
 */
export function addUserIdToContext(userId: string): void {
  let context = getCurrentContext();
  if (!context) {
    context = { correlationId: generateCorrelationId() };
    contextStore.enterWith(context);
    fallbackContext = context;
  }
  context.userId = userId;
}

/**
 * Add group ID to correlation context
 */
export function addGroupIdToContext(groupId: string): void {
  let context = getCurrentContext();
  if (!context) {
    context = { correlationId: generateCorrelationId() };
    contextStore.enterWith(context);
    fallbackContext = context;
  }
  context.groupId = groupId;
}

/**
 * Get elapsed time since context creation
 */
export function getElapsedTime(): number {
  const context = getContext();
  if (!context || !context.startTime) return 0;
  return Date.now() - context.startTime;
}

/**
 * Export context for downstream services
 * Used for propagating context through AppSync, database calls, etc.
 */
export function exportContext(): CorrelationContext | null {
  const context = getContext();
  if (!context) {
    // Create default context if none exists
    const newContext: CorrelationContext = {
      correlationId: generateCorrelationId(),
      requestId: generateRequestId()
    };
    contextStore.enterWith(newContext);
    fallbackContext = newContext;
    return newContext;
  }
  return { ...context };
}

/**
 * Import context from upstream service
 * Used for receiving context from upstream API calls
 */
export function importContext(context: CorrelationContext): void {
  const importedContext = { ...context };
  contextStore.enterWith(importedContext);
  fallbackContext = importedContext;
}

/**
 * Get correlation context as headers (for propagating to downstream services)
 * Ensures consistent header values across multiple calls by using stored context
 */
export function getContextHeaders(): Record<string, string> {
  let context = getContext();

  // If no context exists, create and store one to ensure consistency
  if (!context) {
    context = {
      correlationId: generateCorrelationId(),
      requestId: generateRequestId()
    };
    contextStore.enterWith(context);
    fallbackContext = context;
  }

  return {
    'X-Correlation-ID': context.correlationId,
    ...(context.requestId && { 'X-Request-ID': context.requestId }),
    ...(context.userId && { 'X-User-ID': context.userId }),
    ...(context.groupId && { 'X-Group-ID': context.groupId })
  };
}
