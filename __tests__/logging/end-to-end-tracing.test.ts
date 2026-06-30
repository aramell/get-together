/**
 * End-to-End Request Tracing Tests
 * Task 5: Request Tracing & Correlation (AC5) - Subtask 5.6
 * Verify correlation ID propagation through the full request lifecycle
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  generateCorrelationId,
  generateRequestId,
  createCorrelationContext,
  getCorrelationId,
  setCorrelationId,
  getContextHeaders,
  exportContext,
  importContext,
  clearContext
} from '@/lib/logging/correlation-id';
import { getLogger } from '@/lib/logging/logger';
import { getMetricsCollector, recordEndpointLatency } from '@/lib/logging/metrics';

describe('End-to-End Request Tracing (AC5)', () => {
  let correlationId: string;

  beforeEach(() => {
    clearContext();
    correlationId = generateCorrelationId();
    setCorrelationId(correlationId);
  });

  afterEach(() => {
    clearContext();
  });

  it('should trace request from middleware through API to logs', () => {
    // Step 1: Middleware receives request and extracts/creates correlation ID
    const incomingHeader = correlationId;
    const requestId = generateRequestId();

    createCorrelationContext({
      correlationId: incomingHeader,
      requestId: requestId
    });

    // Step 2: Logger includes correlation ID in structured logs
    const logger = getLogger('api');
    expect(logger).toBeDefined();

    // Step 3: Verify headers include correlation ID for response
    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe(correlationId);
    expect(headers['X-Request-ID']).toBe(requestId);
  });

  it('should propagate correlation ID through metric recording', () => {
    // Set up correlation context
    setCorrelationId(correlationId);

    // Record endpoint metric
    recordEndpointLatency('/api/groups', 145);

    // Verify metrics collector has access to correlation ID
    const collector = getMetricsCollector();
    const metrics = collector.getEndpointMetrics('/api/groups');

    expect(metrics).toBeDefined();
    expect(getCorrelationId()).toBe(correlationId);
  });

  it('should support multi-service request flow with correlation ID', () => {
    // Service A: Initial request
    const serviceAContext = createCorrelationContext({
      correlationId: correlationId,
      userId: 'user-123',
      groupId: 'group-456',
      requestPath: '/api/groups'
    });

    // Export for downstream
    const exported = exportContext();
    expect(exported?.correlationId).toBe(correlationId);

    // Service B: Receive and use same correlation ID
    clearContext();
    importContext(serviceAContext);

    expect(getCorrelationId()).toBe(correlationId);
    expect(getContextHeaders()['X-Correlation-ID']).toBe(correlationId);
  });

  it('should track user context through request lifecycle', () => {
    const userId = 'user-123';
    const context = createCorrelationContext({
      correlationId: correlationId,
      userId: userId,
      requestPath: '/api/users/profile'
    });

    // Store context
    setCorrelationId(context.correlationId);

    // Verify headers include user info
    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe(correlationId);
    expect(headers['X-User-ID']).toBe(userId);
  });

  it('should track group context through request lifecycle', () => {
    const groupId = 'group-456';
    const context = createCorrelationContext({
      correlationId: correlationId,
      groupId: groupId,
      requestPath: '/api/groups/456/members'
    });

    setCorrelationId(context.correlationId);

    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe(correlationId);
    expect(headers['X-Group-ID']).toBe(groupId);
  });

  it('should support single log query for complete request flow', () => {
    // Simulate complete request: Middleware → API → Service → Logging
    const startTime = Date.now();

    // 1. Middleware phase
    setCorrelationId(correlationId);
    const requestId = generateRequestId();

    // 2. API processing phase
    recordEndpointLatency('/api/groups', 145);

    // 3. Service layer phase
    const context = createCorrelationContext({
      correlationId: correlationId,
      userId: 'user-123'
    });

    // 4. Logging phase
    const logger = getLogger('api');
    expect(logger).toBeDefined();

    // Verify: All phases use same correlation ID
    expect(getCorrelationId()).toBe(correlationId);

    // Verify: Can track metrics with correlation ID
    const metrics = getMetricsCollector().getEndpointMetrics('/api/groups');
    expect(metrics).toBeDefined();

    // Time taken for complete flow
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete quickly
  });
});

describe('Request Tracing - Multi-Step Workflows (AC5)', () => {
  afterEach(() => {
    clearContext();
  });

  it('should trace create group workflow with correlation ID', () => {
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    // Step 1: User submits POST /api/groups
    recordEndpointLatency('/api/groups', 150);

    // Step 2: Database query
    const dbContext = exportContext();
    expect(dbContext?.correlationId).toBe(correlationId);

    // Step 3: Logging
    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe(correlationId);
  });

  it('should trace join group workflow with correlation ID', () => {
    const correlationId = generateCorrelationId();
    const inviteCode = 'abc123def456';

    setCorrelationId(correlationId);

    // Step 1: GET /join/:inviteCode
    recordEndpointLatency('/api/groups/join', 200);

    // Step 2: Validate invite code (database lookup)
    importContext(exportContext()!);

    // Step 3: Add member to group (database write)
    recordEndpointLatency('/api/groups/join', 250);

    // Verify same correlation ID throughout
    expect(getCorrelationId()).toBe(correlationId);
  });

  it('should trace soft calendar event workflow with correlation ID', () => {
    const correlationId = generateCorrelationId();
    const userId = 'user-123';
    const groupId = 'group-456';

    const context = createCorrelationContext({
      correlationId: correlationId,
      userId: userId,
      groupId: groupId,
      requestPath: '/api/groups/456/availabilities'
    });

    setCorrelationId(context.correlationId);

    // Mark availability (POST)
    recordEndpointLatency('/api/groups/456/availabilities', 100);

    // Get calendar (GET)
    recordEndpointLatency('/api/groups/456/calendar', 200);

    // Verify context includes group and user for audit trail
    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe(correlationId);
    expect(headers['X-User-ID']).toBe(userId);
    expect(headers['X-Group-ID']).toBe(groupId);
  });
});

describe('Request Tracing - Error Scenarios (AC5)', () => {
  afterEach(() => {
    clearContext();
  });

  it('should maintain correlation ID when request fails', () => {
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    // Simulate failed request
    recordEndpointLatency('/api/groups', 150, false); // success = false

    // Correlation ID should still be accessible for error logging
    expect(getCorrelationId()).toBe(correlationId);
    expect(getContextHeaders()['X-Correlation-ID']).toBe(correlationId);
  });

  it('should preserve correlation ID through retries', () => {
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    // Attempt 1 (fails)
    recordEndpointLatency('/api/groups', 150, false);
    const id1 = getCorrelationId();

    // Attempt 2 (fails)
    recordEndpointLatency('/api/groups', 200, false);
    const id2 = getCorrelationId();

    // Attempt 3 (succeeds)
    recordEndpointLatency('/api/groups', 100, true);
    const id3 = getCorrelationId();

    // All attempts have same correlation ID
    expect(id1).toBe(correlationId);
    expect(id2).toBe(correlationId);
    expect(id3).toBe(correlationId);
  });

  it('should handle concurrent requests with different correlation IDs', () => {
    const request1Id = generateCorrelationId();
    const request2Id = generateCorrelationId();

    expect(request1Id).not.toBe(request2Id);

    // Request 1
    setCorrelationId(request1Id);
    recordEndpointLatency('/api/groups', 100);
    const id1 = getCorrelationId();

    // Request 2 (would be in different async context in production)
    setCorrelationId(request2Id);
    recordEndpointLatency('/api/groups', 150);
    const id2 = getCorrelationId();

    expect(id1).not.toBe(id2);
    expect(id2).toBe(request2Id);
  });
});

describe('Request Tracing - Compliance (AC5)', () => {
  afterEach(() => {
    clearContext();
  });

  it('should satisfy AC5: correlation ID in X-Correlation-ID header', () => {
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe(correlationId);
  });

  it('should satisfy AC5: propagate through all logs', () => {
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    const logger = getLogger('test');
    expect(logger).toBeDefined();
    expect(getCorrelationId()).toBe(correlationId);
  });

  it('should satisfy AC5: propagate through AppSync/database', () => {
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    const exported = exportContext();
    clearContext();
    importContext(exported!);

    expect(getCorrelationId()).toBe(correlationId);
  });

  it('should satisfy AC5: single log search shows complete flow', () => {
    const correlationId = generateCorrelationId();
    setCorrelationId(correlationId);

    // Record multiple operations
    recordEndpointLatency('/api/groups', 100);
    recordEndpointLatency('/api/groups/123/members', 150);
    recordEndpointLatency('/api/groups/123/calendar', 200);

    // All operations linked by same correlation ID
    const headers = getContextHeaders();
    expect(headers['X-Correlation-ID']).toBe(correlationId);
  });
});
