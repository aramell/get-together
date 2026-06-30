import { PATCH } from '@/app/api/groups/[groupId]/events/[eventId]/threshold/route';
import { updateEventThreshold } from '@/lib/services/eventService';
import { NextRequest } from 'next/server';

// Mock the service
jest.mock('@/lib/services/eventService');

const mockUpdateEventThreshold = updateEventThreshold as jest.Mock;

describe('PATCH /api/groups/[groupId]/events/[eventId]/threshold', () => {
  const groupId = 'group-789';
  const eventId = 'event-123';
  const userId = 'user-456';

  function createRequest(body: any, headers: Record<string, string> = {}) {
    const request = new NextRequest('http://localhost:3000/api/groups/group-789/events/event-123/threshold', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        ...headers,
      },
      body: JSON.stringify(body),
    });
    return request;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when x-user-id header is missing', async () => {
      const request = createRequest({ threshold: 5 }, { 'x-user-id': '' });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('UNAUTHORIZED');
    });
  });

  describe('Successful updates', () => {
    it('should update threshold with valid value', async () => {
      mockUpdateEventThreshold.mockResolvedValueOnce({
        success: true,
        message: 'Threshold updated successfully',
        data: {
          event: {
            id: eventId,
            group_id: groupId,
            created_by: userId,
            title: 'Test Event',
            description: null,
            date: '2026-03-20T10:00:00Z',
            threshold: 5,
            status: 'proposal',
            created_at: '2026-03-16T00:00:00Z',
            updated_at: '2026-03-16T01:00:00Z',
          },
        },
      });

      const request = createRequest({ threshold: 5 });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockUpdateEventThreshold).toHaveBeenCalledWith(eventId, userId, 5);
    });

    it('should remove threshold by passing null', async () => {
      mockUpdateEventThreshold.mockResolvedValueOnce({
        success: true,
        message: 'Threshold updated successfully',
        data: {
          event: {
            id: eventId,
            threshold: null,
          },
        },
      });

      const request = createRequest({ threshold: null });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(200);
      expect(mockUpdateEventThreshold).toHaveBeenCalledWith(eventId, userId, null);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 for invalid threshold (zero)', async () => {
      const request = createRequest({ threshold: 0 });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for threshold over 1000', async () => {
      const request = createRequest({ threshold: 1001 });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(400);
    });

    it('should return 400 for non-integer threshold', async () => {
      const request = createRequest({ threshold: 5.5 });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(400);
    });
  });

  describe('Authorization errors', () => {
    it('should return 403 when user is not creator', async () => {
      mockUpdateEventThreshold.mockResolvedValueOnce({
        success: false,
        message: 'You do not have permission',
        error: 'NOT_CREATOR',
        errorCode: 'FORBIDDEN',
      });

      const request = createRequest({ threshold: 5 });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('Not found errors', () => {
    it('should return 404 when event not found', async () => {
      mockUpdateEventThreshold.mockResolvedValueOnce({
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      });

      const request = createRequest({ threshold: 5 });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('Conflict errors', () => {
    it('should return 409 for version conflict', async () => {
      mockUpdateEventThreshold.mockResolvedValueOnce({
        success: false,
        message: 'Failed to update threshold (conflict detected)',
        error: 'CONFLICT',
        errorCode: 'CONFLICT',
      });

      const request = createRequest({ threshold: 5 });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.errorCode).toBe('CONFLICT');
    });
  });

  describe('Server errors', () => {
    it('should return 500 for internal errors', async () => {
      mockUpdateEventThreshold.mockResolvedValueOnce({
        success: false,
        message: 'An error occurred',
        error: 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      });

      const request = createRequest({ threshold: 5 });
      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(500);
    });

    it('should handle JSON parse errors', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/groups/group-789/events/event-123/threshold',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: 'invalid json',
        }
      );

      const response = await PATCH(request, { params: { groupId, eventId } });

      expect(response.status).toBe(400);
    });
  });
});
