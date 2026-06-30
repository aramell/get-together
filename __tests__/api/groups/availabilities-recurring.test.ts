/**
 * API Integration Tests for Recurring Availability (Story 3.2 - Task 11)
 * Tests POST and GET endpoints with recurring availability patterns
 */

import { POST, GET } from '@/app/api/groups/[groupId]/availabilities/route';
import * as availabilityService from '@/lib/services/availabilityService';
import * as queries from '@/lib/db/queries';

// Mock the service and database modules
jest.mock('@/lib/services/availabilityService');
jest.mock('@/lib/db/queries');

const mockGroupId = '550e8400-e29b-41d4-a716-446655440000';
const mockUserId = '660e8400-e29b-41d4-a716-446655440001';

// Helper to create mock NextRequest
function createMockRequest(
  method: 'POST' | 'GET',
  headers: Record<string, string> = {},
  body: any = null,
  searchParams: Record<string, string> = {}
) {
  const headerMap = new Map(Object.entries(headers));
  const params = new URLSearchParams(searchParams);

  return {
    method,
    headers: headerMap,
    nextUrl: { searchParams: params },
    json: async () => body,
  } as unknown as Request;
}

describe('API: Availability - Recurring Support (Story 3.2 Task 11)', () => {
  /**
   * TEST SCENARIOS FOR TASK 11: API TESTS FOR RECURRING AVAILABILITY
   *
   * These tests verify that the API correctly handles:
   * - Single (non-recurring) availability creation
   * - Recurring availability with daily pattern
   * - Recurring availability with weekly pattern
   * - Invalid recurring pattern validation
   * - Conflict handling (overlapping times)
   * - GET endpoint with date ranges
   * - Date format validation
   * - Authentication and authorization
   *
   * Implementation Notes:
   * - Tests should be run with jest configured for Next.js API routes
   * - Mock the service layer (createAvailability, createRecurringAvailability)
   * - Each test should verify both response status and response body
   * - Include edge cases for date boundaries and recurring patterns
   */

  describe('POST /api/groups/:groupId/availabilities', () => {
    describe('Single Availability (Non-Recurring)', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        (queries.getGroupById as jest.Mock).mockResolvedValue({ id: mockGroupId, name: 'Test Group' });
        (queries.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      });

      it('TC-1.1: Should create single busy availability', async () => {
        // ARRANGE: Prepare test data
        const testData = {
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
        };

        const mockResponse = {
          success: true,
          message: 'Availability created',
          data: {
            id: 'avail-123',
            user_id: mockUserId,
            group_id: mockGroupId,
            start_time: testData.start_time,
            end_time: testData.end_time,
            status: testData.status,
          },
        };

        (availabilityService.createAvailability as jest.Mock).mockResolvedValue(mockResponse);

        // ACT: POST request
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Response status: 201 Created
        expect(response.status).toBe(201);
        // - Response body: { success: true, data: {...} }
        expect(body.success).toBe(true);
        // - Data includes: id, user_id, group_id, start_time, end_time, status
        expect(body.data).toMatchObject({
          id: expect.any(String),
          user_id: mockUserId,
          group_id: mockGroupId,
          status: 'busy',
        });
      });

      it('TC-1.2: Should create single free availability', async () => {
        // ARRANGE: Test free status
        const testData = {
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'free',
        };

        const mockResponse = {
          success: true,
          message: 'Availability created',
          data: { id: 'avail-456', status: 'free' },
        };

        (availabilityService.createAvailability as jest.Mock).mockResolvedValue(mockResponse);

        // ACT: POST request
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT: Verify free status creation
        expect(response.status).toBe(201);
        expect(body.data.status).toBe('free');
      });

      it('TC-1.3: Should create multi-hour busy block', async () => {
        // ARRANGE: 4-hour busy block
        const testData = {
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T13:00:00Z', // 4 hours
          status: 'busy',
        };

        const mockResponse = {
          success: true,
          message: 'Availability created',
          data: { id: 'avail-789', start_time: testData.start_time, end_time: testData.end_time },
        };

        (availabilityService.createAvailability as jest.Mock).mockResolvedValue(mockResponse);

        // ACT: POST request
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT: Verify duration stored correctly
        expect(response.status).toBe(201);
        expect(body.data.start_time).toBe('2026-03-05T09:00:00Z');
        expect(body.data.end_time).toBe('2026-03-05T13:00:00Z');
      });
    });

    describe('Recurring Availability', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        (queries.getGroupById as jest.Mock).mockResolvedValue({ id: mockGroupId, name: 'Test Group' });
        (queries.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      });

      it('TC-2.1: Should create daily recurring availability', async () => {
        // ARRANGE: Daily pattern for 3 days
        const testData = {
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          recurring_pattern: 'daily',
          recurring_end_date: '2026-03-07T09:00:00Z',
        };

        const mockResponse = {
          success: true,
          message: '3 recurring availabilities created',
          data: [
            { id: 'avail-1', date: '2026-03-05T09:00:00Z' },
            { id: 'avail-2', date: '2026-03-06T09:00:00Z' },
            { id: 'avail-3', date: '2026-03-07T09:00:00Z' },
          ],
        };

        (availabilityService.createRecurringAvailability as jest.Mock).mockResolvedValue(mockResponse);

        // ACT: POST with recurring_pattern and recurring_end_date
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Response status: 201 Created
        expect(response.status).toBe(201);
        // - Service was called with correct parameters
        expect(availabilityService.createRecurringAvailability).toHaveBeenCalledWith(
          mockUserId,
          mockGroupId,
          testData.start_time,
          testData.end_time,
          'busy',
          'daily',
          testData.recurring_end_date
        );
        // - Response includes array of created availabilities
        expect(Array.isArray(body.data)).toBe(true);
        // - Should create 3 entries (Mar 5, 6, 7)
        expect(body.data).toHaveLength(3);
      });

      it('TC-2.2: Should create weekly recurring availability', async () => {
        // ARRANGE: Weekly pattern for 4 weeks
        const testData = {
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          recurring_pattern: 'weekly',
          recurring_end_date: '2026-03-26T09:00:00Z',
        };

        const mockResponse = {
          success: true,
          message: '4 recurring availabilities created',
          data: [
            { id: 'avail-w1', date: '2026-03-05T09:00:00Z' },
            { id: 'avail-w2', date: '2026-03-12T09:00:00Z' },
            { id: 'avail-w3', date: '2026-03-19T09:00:00Z' },
            { id: 'avail-w4', date: '2026-03-26T09:00:00Z' },
          ],
        };

        (availabilityService.createRecurringAvailability as jest.Mock).mockResolvedValue(mockResponse);

        // ACT: POST with weekly pattern
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT: Verify 4 weekly occurrences created
        expect(response.status).toBe(201);
        // Verify service was called with weekly pattern
        expect(availabilityService.createRecurringAvailability).toHaveBeenCalledWith(
          mockUserId,
          mockGroupId,
          testData.start_time,
          testData.end_time,
          'busy',
          'weekly',
          testData.recurring_end_date
        );
        expect(body.data).toHaveLength(4);
        // Verify entries are 7 days apart
        const date1 = new Date(body.data[0].date).getTime();
        const date2 = new Date(body.data[1].date).getTime();
        const dayDiff = (date2 - date1) / (1000 * 60 * 60 * 24);
        expect(dayDiff).toBe(7);
      });

      it('TC-2.3: Should handle partial failure (some overlaps)', async () => {
        // ARRANGE: Pattern where some occurrences conflict
        const testData = {
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          recurring_pattern: 'daily',
          recurring_end_date: '2026-03-07T09:00:00Z',
        };

        const mockResponse = {
          success: true,
          message: 'Partial success: 2 created, 1 conflict',
          data: [
            { id: 'avail-created-1', date: '2026-03-05T09:00:00Z' },
            { id: 'avail-created-2', date: '2026-03-07T09:00:00Z' },
          ],
        };

        (availabilityService.createRecurringAvailability as jest.Mock).mockResolvedValue(mockResponse);

        // ACT: POST with recurring pattern where conflicts exist
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Response status: 201 (partial success)
        expect(response.status).toBe(201);
        // - Response includes created entries (partial set returned)
        expect(body.data).toHaveLength(2);
        expect(body.success).toBe(true);
        expect(body.message).toContain('Partial success');
      });
    });

    describe('Validation & Error Handling', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        (queries.getGroupById as jest.Mock).mockResolvedValue({ id: mockGroupId, name: 'Test Group' });
        (queries.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      });

      it('TC-3.1: Should reject invalid recurring pattern (monthly)', async () => {
        // ARRANGE: Invalid pattern
        const testData = {
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          recurring_pattern: 'monthly', // Invalid
          recurring_end_date: '2026-03-07T09:00:00Z',
        };

        // ACT: POST with invalid pattern
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Response status: 400 Bad Request
        expect(response.status).toBe(400);
        // - Response includes: { errorCode: 'VALIDATION_ERROR' }
        expect(body.errorCode).toBe('VALIDATION_ERROR');
      });

      it('TC-3.2: Should reject if end_time <= start_time', async () => {
        // ARRANGE: Invalid time range
        const testData = {
          start_time: '2026-03-05T10:00:00Z',
          end_time: '2026-03-05T09:00:00Z', // Before start
          status: 'busy',
        };

        // Mock the service to return validation error
        (availabilityService.createAvailability as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Invalid time range',
          errorCode: 'VALIDATION_ERROR',
        });

        // ACT: POST with invalid time range
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT: Expect validation error
        expect(response.status).toBe(422); // Unprocessable Entity
        expect(body.errorCode).toBe('VALIDATION_ERROR');
      });

      it('TC-3.3: Should handle overlapping availability (409)', async () => {
        // ARRANGE: Time already marked
        const testData = {
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
        };

        // Mock conflict response
        (availabilityService.createAvailability as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Time slot already taken',
          errorCode: 'CONFLICT',
          message: 'Overlapping availability exists',
          data: { existingId: 'avail-existing' },
        });

        // ACT: POST with conflicting time
        const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
        const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Response status: 409 Conflict
        expect(response.status).toBe(409);
        // - Response includes existing availability details
        expect(body.errorCode).toBe('CONFLICT');
        expect(body.data).toBeDefined();
      });
    });
  });

  describe('GET /api/groups/:groupId/availabilities', () => {
    describe('Date Range Queries', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        (queries.getGroupById as jest.Mock).mockResolvedValue({ id: mockGroupId, name: 'Test Group' });
        (queries.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      });

      it('TC-4.1: Should retrieve availabilities for full month', async () => {
        // ARRANGE: Date range for March 2026
        const params = {
          startDate: '2026-03-01T00:00:00Z',
          endDate: '2026-03-31T23:59:59Z',
        };

        const mockAvailabilities = [
          { id: 'avail-1', start_time: '2026-03-05T09:00:00Z', status: 'busy' },
          { id: 'avail-2', start_time: '2026-03-10T14:00:00Z', status: 'free' },
          { id: 'avail-3', start_time: '2026-03-15T10:00:00Z', status: 'busy' },
        ];

        (availabilityService.getGroupAvailabilities as jest.Mock).mockResolvedValue({
          success: true,
          message: 'Availabilities retrieved',
          data: mockAvailabilities,
        });

        // ACT: GET request with date range
        const request = createMockRequest('GET', { 'x-user-id': mockUserId }, null, params);
        const response = await GET(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Response status: 200 OK
        expect(response.status).toBe(200);
        // - Response includes array of availabilities
        expect(Array.isArray(body.data)).toBe(true);
        // - All returned entries within date range
        body.data.forEach((entry: any) => {
          const entryDate = new Date(entry.start_time);
          expect(entryDate >= new Date(params.startDate)).toBe(true);
          expect(entryDate <= new Date(params.endDate)).toBe(true);
        });
      });

      it('TC-4.2: Should return empty array for empty date range', async () => {
        // ARRANGE: Date range with no entries
        const params = {
          startDate: '2026-04-01T00:00:00Z',
          endDate: '2026-04-30T23:59:59Z',
        };

        (availabilityService.getGroupAvailabilities as jest.Mock).mockResolvedValue({
          success: true,
          message: 'No availabilities found',
          data: [],
        });

        // ACT: GET request
        const request = createMockRequest('GET', { 'x-user-id': mockUserId }, null, params);
        const response = await GET(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT: data: [], count: 0
        expect(body.data).toEqual([]);
        expect(body.count).toBe(0);
      });

      it('TC-4.3: Should include expanded recurring entries', async () => {
        // ARRANGE: Query covering recurring availability period
        const params = {
          startDate: '2026-03-05T00:00:00Z',
          endDate: '2026-03-07T23:59:59Z',
        };

        const mockAvailabilities = [
          { id: 'avail-recurring-1', start_time: '2026-03-05T09:00:00Z', recurring_pattern: 'daily' },
          { id: 'avail-recurring-2', start_time: '2026-03-06T09:00:00Z', recurring_pattern: 'daily' },
          { id: 'avail-recurring-3', start_time: '2026-03-07T09:00:00Z', recurring_pattern: 'daily' },
        ];

        (availabilityService.getGroupAvailabilities as jest.Mock).mockResolvedValue({
          success: true,
          message: 'Availabilities retrieved',
          data: mockAvailabilities,
        });

        // ACT: GET request
        const request = createMockRequest('GET', { 'x-user-id': mockUserId }, null, params);
        const response = await GET(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Recurring entries materialized as individual entries
        expect(Array.isArray(body.data)).toBe(true);
        // - Count matches expected occurrences
        expect(body.count).toBe(3);
      });
    });

    describe('Date Validation', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        (queries.getGroupById as jest.Mock).mockResolvedValue({ id: mockGroupId, name: 'Test Group' });
        (queries.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      });

      it('TC-5.1: Should reject invalid ISO 8601 format', async () => {
        // ARRANGE: Invalid date format
        const params = {
          startDate: 'not-a-date',
          endDate: '2026-03-31T23:59:59Z',
        };

        // ACT: GET request with invalid date
        const request = createMockRequest('GET', { 'x-user-id': mockUserId }, null, params);
        const response = await GET(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Response status: 400 Bad Request
        expect(response.status).toBe(400);
        // - Error: INVALID_DATE_FORMAT
        expect(body.errorCode).toBe('INVALID_DATE_FORMAT');
      });

      it('TC-5.2: Should reject missing date parameters', async () => {
        // ARRANGE: No startDate or endDate
        const params = {};

        // ACT: GET request without date params
        const request = createMockRequest('GET', { 'x-user-id': mockUserId }, null, params);
        const response = await GET(request, { params: Promise.resolve({ groupId: mockGroupId }) });
        const body = await response.json();

        // ASSERT:
        // - Response status: 400
        expect(response.status).toBe(400);
        // - Error: MISSING_PARAMS
        expect(body.errorCode).toBe('MISSING_PARAMS');
      });
    });
  });

  describe('Authentication & Authorization', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('TC-6.1: Should reject request without x-user-id header', async () => {
      // ARRANGE: Missing auth header
      const testData = {
        start_time: '2026-03-05T09:00:00Z',
        end_time: '2026-03-05T10:00:00Z',
        status: 'busy',
      };

      // ACT: POST without x-user-id
      const request = createMockRequest('POST', {}, testData); // No x-user-id header
      const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
      const body = await response.json();

      // ASSERT:
      // - Response status: 401 Unauthorized
      expect(response.status).toBe(401);
      // - Error: NOT_AUTHENTICATED
      expect(body.errorCode).toBe('NOT_AUTHENTICATED');
    });

    it('TC-6.2: Should reject invalid group ID format', async () => {
      // ARRANGE: Malformed UUID
      const groupId = 'invalid-id';
      const testData = {
        start_time: '2026-03-05T09:00:00Z',
        end_time: '2026-03-05T10:00:00Z',
        status: 'busy',
      };

      // ACT: POST with invalid groupId
      const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
      const response = await POST(request, { params: Promise.resolve({ groupId }) });
      const body = await response.json();

      // ASSERT:
      // - Response status: 400 Bad Request
      expect(response.status).toBe(400);
      // - Error: INVALID_GROUP_ID
      expect(body.errorCode).toBe('INVALID_GROUP_ID');
    });

    it('TC-6.3: Should reject non-member user', async () => {
      // ARRANGE: User not in group
      (queries.getGroupById as jest.Mock).mockResolvedValue({ id: mockGroupId, name: 'Test Group' });
      (queries.getUserGroupRole as jest.Mock).mockResolvedValue(null); // User is not a member

      const testData = {
        start_time: '2026-03-05T09:00:00Z',
        end_time: '2026-03-05T10:00:00Z',
        status: 'busy',
      };

      // ACT: POST as non-member
      const request = createMockRequest('POST', { 'x-user-id': mockUserId }, testData);
      const response = await POST(request, { params: Promise.resolve({ groupId: mockGroupId }) });
      const body = await response.json();

      // ASSERT:
      // - Response status: 403 Forbidden
      expect(response.status).toBe(403);
      // - Error: NOT_GROUP_MEMBER
      expect(body.errorCode).toBe('NOT_GROUP_MEMBER');
    });
  });

  /**
   * IMPLEMENTATION GUIDE FOR NEXT DEVELOPER:
   *
   * 1. Replace placeholder expects with actual API calls
   * 2. Mock NextRequest properly for each test
   * 3. Mock service layer: createAvailability, createRecurringAvailability
   * 4. For each test:
   *    - Verify HTTP status code
   *    - Verify response body structure
   *    - Verify error codes and messages
   *    - Verify data accuracy (dates, counts, etc.)
   * 5. Run with: npm test -- availabilities-recurring.test.ts
   * 6. Coverage goal: 90%+ for API routes
   */
});
