/**
 * @jest-environment node
 */
import { POST, DELETE } from '../route';
import { NextRequest } from 'next/server';
import * as authLib from '@/lib/api/auth';
import * as publicEventService from '@/lib/services/publicEventService';

jest.mock('@/lib/api/auth');
jest.mock('@/lib/services/publicEventService');

describe('/api/events/[eventId]/public-link', () => {
  const eventId = 'event-1';
  const userId = 'user-1';

  const makeRequest = () =>
    ({ nextUrl: new URL('http://localhost:3000/api/events/event-1/public-link') }) as unknown as NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

      const response = await POST(makeRequest(), { params: Promise.resolve({ eventId }) });

      expect(response.status).toBe(401);
      expect(publicEventService.generatePublicEventLink).not.toHaveBeenCalled();
    });

    it('returns 403 when the service reports FORBIDDEN', async () => {
      (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(userId);
      (publicEventService.generatePublicEventLink as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Not authorized to share this event',
        errorCode: 'FORBIDDEN',
      });

      const response = await POST(makeRequest(), { params: Promise.resolve({ eventId }) });

      expect(response.status).toBe(403);
    });

    it('returns 404 when the service reports NOT_FOUND', async () => {
      (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(userId);
      (publicEventService.generatePublicEventLink as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Event not found',
        errorCode: 'NOT_FOUND',
      });

      const response = await POST(makeRequest(), { params: Promise.resolve({ eventId }) });

      expect(response.status).toBe(404);
    });

    it('persists the token and returns an absolute link built from the request origin', async () => {
      (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(userId);
      (publicEventService.generatePublicEventLink as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Public link created successfully',
        publicToken: 'abc123',
        publicUrl: '/events/public/abc123',
      });

      const response = await POST(makeRequest(), { params: Promise.resolve({ eventId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.publicLink).toBe('http://localhost:3000/events/public/abc123');
      expect(publicEventService.generatePublicEventLink).toHaveBeenCalledWith(eventId, userId);
    });
  });

  describe('DELETE', () => {
    it('returns 401 when unauthenticated', async () => {
      (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ eventId }) });

      expect(response.status).toBe(401);
      expect(publicEventService.revokePublicEventLink).not.toHaveBeenCalled();
    });

    it('returns 403 when the service reports FORBIDDEN', async () => {
      (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(userId);
      (publicEventService.revokePublicEventLink as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Not authorized to revoke this link',
        errorCode: 'FORBIDDEN',
      });

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ eventId }) });

      expect(response.status).toBe(403);
    });

    it('revokes the link on success', async () => {
      (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(userId);
      (publicEventService.revokePublicEventLink as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Public link revoked successfully',
      });

      const response = await DELETE(makeRequest(), { params: Promise.resolve({ eventId }) });

      expect(response.status).toBe(200);
      expect(publicEventService.revokePublicEventLink).toHaveBeenCalledWith(eventId, userId);
    });
  });
});
