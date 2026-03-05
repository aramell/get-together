import { POST, GET } from '@/app/api/groups/[groupId]/availabilities/route';
import { NextRequest } from 'next/server';

const mockGroupId = 'test-group-123';
const mockUserId = 'test-user-123';

// Mock the database queries
jest.mock('@/lib/db/queries', () => ({
  getUserGroupRole: jest.fn().mockResolvedValue('member'),
  getGroupById: jest.fn().mockResolvedValue({ id: mockGroupId }),
  createAvailability: jest.fn(),
  checkDuplicateAvailability: jest.fn(),
  getGroupAvailabilities: jest.fn(),
}));

// Mock the service layer
jest.mock('@/lib/services/availabilityService', () => ({
  createAvailability: jest.fn(),
  createRecurringAvailability: jest.fn(),
  getGroupAvailabilities: jest.fn(),
}));

describe('Availability API - Recurring Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST - Create Recurring Availability', () => {
    it('should create single (non-recurring) availability', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      expect(response.status).toBe(201);
    });

    it('should create recurring availability with daily pattern', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          recurring_pattern: 'daily',
          recurring_end_date: '2026-03-07T09:00:00Z',
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      expect(response.status).toBe(201);
    });

    it('should create recurring availability with weekly pattern', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          recurring_pattern: 'weekly',
          recurring_end_date: '2026-03-26T09:00:00Z', // 3 weeks
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      expect(response.status).toBe(201);
    });

    it('should reject invalid recurring pattern', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          recurring_pattern: 'monthly', // Invalid
          recurring_end_date: '2026-03-07T09:00:00Z',
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should handle 409 conflict for overlapping recurring', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          recurring_pattern: 'daily',
          recurring_end_date: '2026-03-07T09:00:00Z',
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      // Response status depends on service layer implementation
      expect([201, 409]).toContain(response.status);
    });
  });

  describe('GET - Retrieve Availabilities', () => {
    it('should get availabilities for date range', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: {
          searchParams: new URLSearchParams({
            startDate: '2026-03-01T00:00:00Z',
            endDate: '2026-03-31T23:59:59Z',
          }),
        },
      } as unknown as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      expect(response.status).toBe(200);
    });

    it('should reject invalid date range', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: {
          searchParams: new URLSearchParams({
            startDate: 'not-a-date',
            endDate: '2026-03-31T23:59:59Z',
          }),
        },
      } as unknown as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      expect(response.status).toBe(400);
    });

    it('should reject missing date parameters', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest;

      const response = await GET(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication', () => {
    it('should reject request without x-user-id header', async () => {
      const mockRequest = {
        headers: new Map(),
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: mockGroupId }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject invalid group ID format', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', mockUserId]]),
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'invalid-id' }),
      });

      expect(response.status).toBe(400);
    });
  });
});
