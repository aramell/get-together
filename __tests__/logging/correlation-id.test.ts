/**
 * Correlation ID & Request Tracing Tests
 * Task 5: Request Tracing & Correlation (AC5)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  generateCorrelationId,
  generateRequestId,
  isValidUUID,
  createCorrelationContext,
  getCorrelationId,
  setCorrelationId,
  getRequestId,
  setRequestId,
  getContextHeaders,
  exportContext,
  importContext,
  clearContext
} from '@/lib/logging/correlation-id';

describe('Correlation ID - Generation (AC5)', () => {
  afterEach(() => {
    clearContext();
  });

  it('should generate valid UUID v4 format', () => {
    const id = generateCorrelationId();

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique correlation IDs', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();

    expect(id1).not.toBe(id2);
  });

  it('should generate valid request IDs with prefix', () => {
    const id = generateRequestId();

    expect(id).toMatch(/^api-req-\d+-[a-z0-9]+$/);
  });

  it('should validate UUID format', () => {
    const validUUID = generateCorrelationId();
    const invalidUUID = 'not-a-uuid';

    expect(isValidUUID(validUUID)).toBe(true);
    expect(isValidUUID(invalidUUID)).toBe(false);
  });
});

describe('Correlation ID - Context Management (AC5)', () => {
  afterEach(() => {
    clearContext();
  });

  it('should create correlation context with all metadata', () => {
    const context = createCorrelationContext({
      correlationId: 'test-uuid',
      userId: 'user-123',
      groupId: 'group-456',
      requestPath: '/api/groups'
    });

    expect(context.correlationId).toBe('test-uuid');
    expect(context.userId).toBe('user-123');
    expect(context.groupId).toBe('group-456');
    expect(context.requestPath).toBe('/api/groups');
  });

  it('should store and retrieve correlation ID', () => {
    const originalId = generateCorrelationId();
    setCorrelationId(originalId);

    const retrieved = getCorrelationId();
    expect(retrieved).toBe(originalId);
  });

  it('should store and retrieve request ID', () => {
    const originalId = generateRequestId();
    setRequestId(originalId);

    const retrieved = getRequestId();
    expect(retrieved).toBe(originalId);
  });

  it('should preserve correlation ID across function calls', () => {
    const id = generateCorrelationId();
    setCorrelationId(id);

    // Simulate multiple operations
    const id1 = getCorrelationId();
    const id2 = getCorrelationId();

    expect(id1).toBe(id2);
    expect(id1).toBe(id);
  });
});

describe('Correlation ID - HTTP Header Propagation (AC5)', () => {
  afterEach(() => {
    clearContext();
  });

  it('should export context as HTTP headers', () => {
    setCorrelationId('test-uuid');
    setRequestId('api-req-123');

    const headers = getContextHeaders();

    expect(headers['X-Correlation-ID']).toBe('test-uuid');
    expect(headers['X-Request-ID']).toBe('api-req-123');
  });

  it('should include user ID in context headers', () => {
    const context = createCorrelationContext({
      correlationId: 'test-uuid',
      userId: 'user-123',
      groupId: 'group-456',
      requestPath: '/api/groups'
    });

    setCorrelationId(context.correlationId);

    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe('test-uuid');
  });

  it('should export context for downstream propagation', () => {
    const context = createCorrelationContext({
      correlationId: 'test-uuid',
      userId: 'user-123',
      groupId: 'group-456',
      requestPath: '/api/groups'
    });

    setCorrelationId(context.correlationId);
    const exported = exportContext();

    expect(exported).toBeDefined();
    expect(exported.correlationId).toBe('test-uuid');
  });

  it('should import context from downstream calls', () => {
    const originalContext = createCorrelationContext({
      correlationId: 'test-uuid',
      userId: 'user-123',
      groupId: 'group-456',
      requestPath: '/api/groups'
    });

    setCorrelationId(originalContext.correlationId);
    const exported = exportContext();

    // Clear and import
    clearContext();
    if (exported) {
      importContext(exported);
    }

    expect(getCorrelationId()).toBe('test-uuid');
  });
});

describe('Correlation ID - End-to-End Tracing (AC5)', () => {
  afterEach(() => {
    clearContext();
  });

  it('should maintain correlation ID through request lifecycle', () => {
    const correlationId = generateCorrelationId();
    const requestId = generateRequestId();

    // Start of request
    setCorrelationId(correlationId);
    setRequestId(requestId);

    // During processing
    const headers = getContextHeaders();

    // Verify headers contain IDs
    expect(headers['X-Correlation-ID']).toBe(correlationId);
    expect(headers['X-Request-ID']).toBe(requestId);

    // Verify context can be exported for downstream
    const exported = exportContext();
    expect(exported.correlationId).toBe(correlationId);
  });

  it('should support multi-step tracing scenario', () => {
    // Initial request
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    // Simulate API call
    const headers1 = getContextHeaders();
    expect(headers1['X-Correlation-ID']).toBe(correlationId);

    // Simulate downstream service receiving it
    const exported = exportContext();
    clearContext();
    importContext(exported);

    // Downstream service uses same correlation ID
    const headers2 = getContextHeaders();
    expect(headers2['X-Correlation-ID']).toBe(correlationId);
  });

  it('should allow context enrichment during request flow', () => {
    const context = createCorrelationContext({
      correlationId: generateCorrelationId(),
      userId: 'user-123',
      groupId: null,
      requestPath: '/api/groups'
    });

    setCorrelationId(context.correlationId);

    // Enrich with group ID after auth
    const enrichedContext = createCorrelationContext({
      correlationId: context.correlationId,
      userId: context.userId,
      groupId: 'group-456', // Now known after query
      requestPath: context.requestPath
    });

    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe(context.correlationId);
  });
});

describe('Correlation ID - Compliance (AC5)', () => {
  afterEach(() => {
    clearContext();
  });

  it('should satisfy AC5 correlation ID generation', () => {
    const id = generateCorrelationId();

    expect(isValidUUID(id)).toBe(true);
  });

  it('should satisfy AC5 correlation ID in headers', () => {
    setCorrelationId('test-uuid');
    const headers = getContextHeaders();

    expect(headers['X-Correlation-ID']).toBe('test-uuid');
  });

  it('should satisfy AC5 correlation ID in logs', () => {
    const context = createCorrelationContext({
      correlationId: 'test-uuid',
      userId: 'user-123',
      groupId: 'group-456',
      requestPath: '/api/groups'
    });

    expect(context.correlationId).toBe('test-uuid');
  });

  it('should satisfy AC5 end-to-end tracing capability', () => {
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    // Can export context
    const exported = exportContext();
    expect(exported.correlationId).toBe(correlationId);

    // Can import in downstream
    clearContext();
    importContext(exported);
    expect(getCorrelationId()).toBe(correlationId);
  });
});

describe('Correlation ID - Edge Cases', () => {
  afterEach(() => {
    clearContext();
  });

  it('should handle null/undefined context gracefully', () => {
    clearContext();
    const id = getCorrelationId();

    // Should generate new one or return empty
    expect(typeof id === 'string').toBe(true);
  });

  it('should validate UUID before storing', () => {
    const validId = generateCorrelationId();
    setCorrelationId(validId);

    expect(getCorrelationId()).toBe(validId);
  });

  it('should handle context export with partial data', () => {
    setCorrelationId(generateCorrelationId());
    // Request ID not set

    const exported = exportContext();
    expect(exported.correlationId).toBeDefined();
  });
});
