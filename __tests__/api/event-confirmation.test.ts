import { GET as getConfirmation } from '@/app/api/groups/[groupId]/events/[eventId]/confirmation/route';
import { POST as postConfirm } from '@/app/api/groups/[groupId]/events/[eventId]/confirm/route';
import { NextRequest } from 'next/server';
import { getEventConfirmationStatus, confirmEvent } from '@/lib/services/eventService';

jest.mock('@/lib/services/eventService');

describe('Event Confirmation API Endpoints', () => {
  describe('GET /api/groups/[groupId]/events/[eventId]/confirmation', () => {
    it('should return event confirmation status when authenticated', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', 'user-123']]),
      } as unknown as NextRequest;

      (getEventConfirmationStatus as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          eventId: 'event-123',
          status: 'confirmed',
          confirmedAt: '2026-03-16T10:00:00Z',
          threshold: 5,
          momentumCount: { in: 5, maybe: 0, out: 0 },
        },
      });

      const response = await getConfirmation(mockRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('confirmed');
      expect(data.data.confirmedAt).toBe('2026-03-16T10:00:00Z');
    });

    it('should return 401 when user ID is missing', async () => {
      const mockRequest = {
        headers: new Map(),
      } as unknown as NextRequest;

      const response = await getConfirmation(mockRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 when event not found', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', 'user-123']]),
      } as unknown as NextRequest;

      (getEventConfirmationStatus as jest.Mock).mockResolvedValueOnce({
        success: false,
        errorCode: 'NOT_FOUND',
      });

      const response = await getConfirmation(mockRequest, {
        params: { groupId: 'group-123', eventId: 'event-notfound' },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/groups/[groupId]/events/[eventId]/confirm', () => {
    it('should confirm event when user is creator', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', 'user-123']]),
      } as unknown as NextRequest;

      (confirmEvent as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          eventId: 'event-123',
          status: 'confirmed',
          confirmedAt: '2026-03-16T10:00:00Z',
          autoConfirmed: false,
        },
      });

      const response = await postConfirm(mockRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('confirmed');
    });

    it('should return 401 when user ID is missing', async () => {
      const mockRequest = {
        headers: new Map(),
      } as unknown as NextRequest;

      const response = await postConfirm(mockRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not authorized to confirm', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', 'user-member']]),
      } as unknown as NextRequest;

      (confirmEvent as jest.Mock).mockResolvedValueOnce({
        success: false,
        errorCode: 'FORBIDDEN',
        message: 'You do not have permission to confirm this event',
      });

      const response = await postConfirm(mockRequest, {
        params: { groupId: 'group-123', eventId: 'event-123' },
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 when event not found', async () => {
      const mockRequest = {
        headers: new Map([['x-user-id', 'user-123']]),
      } as unknown as NextRequest;

      (confirmEvent as jest.Mock).mockResolvedValueOnce({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Event not found',
      });

      const response = await postConfirm(mockRequest, {
        params: { groupId: 'group-123', eventId: 'event-notfound' },
      });

      expect(response.status).toBe(404);
    });
  });
});
