import { GET } from '@/app/api/groups/[groupId]/events/[eventId]/rsvp-status/route';
import { NextRequest } from 'next/server';
import { getClient } from '@/lib/db/client';

jest.mock('@/lib/db/client');

describe('GET /api/groups/:groupId/events/:eventId/rsvp-status', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockRequest = (userId?: string): Partial<NextRequest> => ({
    headers: new Map([['x-user-id', userId || 'user-123']]),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('Successful Requests', () => {
    it('should return user current RSVP status', async () => {
      const request = mockRequest('user-123');

      mockClient.query.mockResolvedValueOnce({
        rows: [{ status: 'in' }],
      });

      const response = await GET(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('in');
    });

    it('should return null status when user has not RSVPed', async () => {
      const request = mockRequest('user-123');

      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const response = await GET(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBeNull();
    });

    it('should return maybe status', async () => {
      const request = mockRequest('user-456');

      mockClient.query.mockResolvedValueOnce({
        rows: [{ status: 'maybe' }],
      });

      const response = await GET(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.status).toBe('maybe');
    });

    it('should return out status', async () => {
      const request = mockRequest('user-789');

      mockClient.query.mockResolvedValueOnce({
        rows: [{ status: 'out' }],
      });

      const response = await GET(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.status).toBe('out');
    });
  });

  describe('Authentication', () => {
    it('should return 401 when user ID is missing', async () => {
      const request = {
        headers: new Map(),
      };

      const response = await GET(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for database errors', async () => {
      const request = mockRequest('user-123');

      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await GET(request as NextRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});
