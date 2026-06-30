import { POST } from '@/app/api/groups/[groupId]/events/[eventId]/rsvp/route';
import { NextRequest } from 'next/server';
import * as eventService from '@/lib/services/eventService';

jest.mock('@/lib/services/eventService');

describe('POST /api/groups/:groupId/events/:eventId/rsvp', () => {
  const mockRequest = (body: any, userId?: string): Partial<NextRequest> => ({
    json: jest.fn().mockResolvedValue(body),
    headers: new Map([['x-user-id', userId || 'user-123']]),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful RSVP', () => {
    it('should return 200 with updated momentum on successful RSVP', async () => {
      const body = { status: 'in' };
      const request = mockRequest(body);

      (eventService.updateEventRsvp as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'RSVP recorded successfully',
        data: {
          eventId: 'event-123',
          userId: 'user-123',
          status: 'in',
          respondedAt: '2026-03-16T10:00:00Z',
          momentumCount: { in: 2, maybe: 1, out: 0 },
          eventConfirmed: false,
        },
      });

      const response = await POST(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.momentumCount.in).toBe(2);
    });

    it('should return 200 with auto-confirmation when threshold met', async () => {
      const body = { status: 'in' };
      const request = mockRequest(body);

      (eventService.updateEventRsvp as jest.Mock).mockResolvedValueOnce({
        success: true,
        message: 'RSVP recorded successfully',
        data: {
          eventId: 'event-123',
          userId: 'user-123',
          status: 'in',
          respondedAt: '2026-03-16T10:00:00Z',
          momentumCount: { in: 5, maybe: 0, out: 0 },
          eventConfirmed: true,
          autoConfirmed: true,
        },
      });

      const response = await POST(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.autoConfirmed).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should return 422 for invalid RSVP status', async () => {
      const body = { status: 'invalid' };
      const request = mockRequest(body);

      const response = await POST(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(422);
    });

    it('should return 401 when user ID is missing', async () => {
      const body = { status: 'in' };
      const request = {
        json: jest.fn().mockResolvedValue(body),
        headers: new Map(),
      };

      const response = await POST(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Service Errors', () => {
    it('should return 404 when event not found', async () => {
      const body = { status: 'in' };
      const request = mockRequest(body);

      (eventService.updateEventRsvp as jest.Mock).mockResolvedValueOnce({
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      });

      const response = await POST(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'nonexistent' },
      });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not group member', async () => {
      const body = { status: 'in' };
      const request = mockRequest(body);

      (eventService.updateEventRsvp as jest.Mock).mockResolvedValueOnce({
        success: false,
        message: 'You are not a member of this group',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      });

      const response = await POST(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(403);
    });

    it('should return 500 for internal server errors', async () => {
      const body = { status: 'in' };
      const request = mockRequest(body);

      (eventService.updateEventRsvp as jest.Mock).mockRejectedValueOnce(
        new Error('Database error')
      );

      const response = await POST(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(500);
    });
  });
});
