import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { POST } from '@/app/api/groups/[groupId]/events/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/services/eventService', () => ({
  createEvent: jest.fn(),
}));

const { createEvent } = require('@/lib/services/eventService');

describe('POST /api/groups/[groupId]/events', () => {
  let mockRequest: Partial<NextRequest>;

  const createMockRequest = (body: any, headers: Record<string, string> = {}) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: new Map(Object.entries(headers)),
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when x-user-id header is missing', async () => {
      mockRequest = createMockRequest({
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('UNAUTHORIZED');
    });

    it('should return 401 when x-user-id header is empty', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': '' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should proceed with valid authentication header', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: {
            id: 'event-1',
            title: 'Test Event',
            date: '2026-04-20T19:00:00Z',
          },
          rsvp: {
            id: 'rsvp-1',
            status: 'in',
          },
        },
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Validation', () => {
    it('should return 400 for missing title', async () => {
      mockRequest = createMockRequest(
        {
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty title', async () => {
      mockRequest = createMockRequest(
        {
          title: '',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for title exceeding 255 characters', async () => {
      mockRequest = createMockRequest(
        {
          title: 'A'.repeat(256),
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing date', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
        },
        { 'x-user-id': 'user-123' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid date format', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: 'not-a-date',
        },
        { 'x-user-id': 'user-123' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid threshold (zero)', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
          threshold: 0,
        },
        { 'x-user-id': 'user-123' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid threshold (exceeding 1000)', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
          threshold: 1001,
        },
        { 'x-user-id': 'user-123' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for description exceeding 2000 characters', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
          description: 'A'.repeat(2001),
        },
        { 'x-user-id': 'user-123' }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should accept valid threshold and description', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
          threshold: 5,
          description: 'This is a valid description',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: {
            id: 'event-1',
            title: 'Test Event',
            date: '2026-04-20T19:00:00Z',
            threshold: 5,
            description: 'This is a valid description',
          },
          rsvp: {
            id: 'rsvp-1',
            status: 'in',
          },
        },
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('Authorization', () => {
    it('should return 403 when user is not a group member', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: false,
        message: 'You must be a group member to create events',
        errorCode: 'FORBIDDEN',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('Successful Creation', () => {
    it('should return 201 Created with event and RSVP data', async () => {
      const eventData = {
        title: 'Pizza Night',
        date: '2026-04-20T19:00:00Z',
        threshold: 5,
        description: 'Join us for pizza!',
      };

      mockRequest = createMockRequest(
        eventData,
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: {
            id: 'event-1',
            group_id: 'group-123',
            created_by: 'user-123',
            title: eventData.title,
            date: eventData.date,
            threshold: eventData.threshold,
            description: eventData.description,
            status: 'proposal',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          },
          rsvp: {
            id: 'rsvp-1',
            event_id: 'event-1',
            user_id: 'user-123',
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          },
        },
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data?.event?.title).toBe(eventData.title);
      expect(data.data?.rsvp?.status).toBe('in');
    });

    it('should pass correct parameters to createEvent service', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
        threshold: 3,
        description: 'Test description',
      };

      mockRequest = createMockRequest(
        eventData,
        { 'x-user-id': 'user-456' }
      );

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: { id: 'event-1' },
          rsvp: { id: 'rsvp-1' },
        },
      });

      await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-789' }),
      });

      expect(createEvent).toHaveBeenCalledWith(
        'group-789',
        'user-456',
        expect.objectContaining({
          title: eventData.title,
          date: eventData.date,
          threshold: eventData.threshold,
          description: eventData.description,
        })
      );
    });
  });

  describe('Conflict Errors', () => {
    it('should return 409 Conflict for duplicate event', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: false,
        message: 'An event with this date and time already exists',
        errorCode: 'CONFLICT',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('CONFLICT');
    });
  });

  describe('Server Errors', () => {
    it('should return 500 for internal server error', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: false,
        message: 'An error occurred while creating the event',
        errorCode: 'INTERNAL_ERROR',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should handle unexpected errors gracefully', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockRejectedValueOnce(new Error('Unexpected error'));

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    it('should always include success field', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: { id: 'event-1' },
          rsvp: { id: 'rsvp-1' },
        },
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
    });

    it('should include message field', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: { id: 'event-1' },
          rsvp: { id: 'rsvp-1' },
        },
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(typeof data.message).toBe('string');
    });

    it('should include data field on success', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: { id: 'event-1' },
          rsvp: { id: 'rsvp-1' },
        },
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('event');
      expect(data.data).toHaveProperty('rsvp');
    });

    it('should include errorCode field on failure', async () => {
      mockRequest = createMockRequest(
        {
          title: 'Test Event',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      createEvent.mockResolvedValueOnce({
        success: false,
        message: 'Validation failed',
        errorCode: 'VALIDATION_ERROR',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ groupId: 'group-123' }),
      });

      const data = await response.json();
      expect(data).toHaveProperty('errorCode');
      expect(typeof data.errorCode).toBe('string');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests independently', async () => {
      const request1 = createMockRequest(
        {
          title: 'Event 1',
          date: '2026-04-20T19:00:00Z',
        },
        { 'x-user-id': 'user-123' }
      );

      const request2 = createMockRequest(
        {
          title: 'Event 2',
          date: '2026-04-21T19:00:00Z',
        },
        { 'x-user-id': 'user-456' }
      );

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: { id: 'event-1', title: 'Event 1' },
          rsvp: { id: 'rsvp-1' },
        },
      });

      createEvent.mockResolvedValueOnce({
        success: true,
        message: 'Event proposed successfully',
        data: {
          event: { id: 'event-2', title: 'Event 2' },
          rsvp: { id: 'rsvp-2' },
        },
      });

      const [response1, response2] = await Promise.all([
        POST(request1, { params: Promise.resolve({ groupId: 'group-123' }) }),
        POST(request2, { params: Promise.resolve({ groupId: 'group-456' }) }),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.data?.event?.title).toBe('Event 1');
      expect(data2.data?.event?.title).toBe('Event 2');
    });
  });
});
