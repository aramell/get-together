import { confirmEvent, getEventConfirmationStatus } from '@/lib/services/eventService';
import { getClient } from '@/lib/db/client';

jest.mock('@/lib/db/client');

describe('Event Confirmation Service Functions', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('confirmEvent()', () => {
    it('should manually confirm an event if user is creator', async () => {
      const eventId = 'event-123';
      const userId = 'user-creator';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: eventId, group_id: 'group-1', created_by: userId, status: 'proposal' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: eventId, status: 'confirmed', confirmed_at: '2026-03-16T10:00:00Z' }],
        });

      const result = await confirmEvent(eventId, userId, false);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('confirmed');
      expect(result.data?.confirmedAt).toBe('2026-03-16T10:00:00Z');
      expect(result.data?.autoConfirmed).toBe(false);
    });

    it('should reject manual confirmation if user is not creator or admin', async () => {
      const eventId = 'event-123';
      const userId = 'user-member';
      const creatorId = 'user-creator';

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: eventId, group_id: 'group-1', created_by: creatorId, status: 'proposal' }],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [], // Not admin
      });

      const result = await confirmEvent(eventId, userId, false);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('should allow admin to confirm event even if not creator', async () => {
      const eventId = 'event-123';
      const userId = 'user-admin';
      const creatorId = 'user-creator';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: eventId, group_id: 'group-1', created_by: creatorId, status: 'proposal' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'membership-1' }], // Is admin
        })
        .mockResolvedValueOnce({
          rows: [{ id: eventId, status: 'confirmed', confirmed_at: '2026-03-16T10:00:00Z' }],
        });

      const result = await confirmEvent(eventId, userId, false);

      expect(result.success).toBe(true);
    });

    it('should set confirmed_at timestamp when confirming', async () => {
      const eventId = 'event-123';
      const userId = 'user-creator';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: eventId, group_id: 'group-1', created_by: userId, status: 'proposal' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: eventId, status: 'confirmed', confirmed_at: '2026-03-16T10:00:00Z' }],
        });

      const result = await confirmEvent(eventId, userId, false);

      expect(result.success).toBe(true);
      expect(result.data?.confirmedAt).not.toBeNull();
    });

    it('should mark as autoConfirmed when called with autoConfirmed=true', async () => {
      const eventId = 'event-123';
      const userId = 'user-member';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: eventId, group_id: 'group-1', created_by: 'other-user', status: 'proposal' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: eventId, status: 'confirmed', confirmed_at: '2026-03-16T10:00:00Z' }],
        });

      const result = await confirmEvent(eventId, userId, true);

      expect(result.success).toBe(true);
      expect(result.data?.autoConfirmed).toBe(true);
    });

    it('should return 404 if event not found', async () => {
      const eventId = 'event-notfound';
      const userId = 'user-creator';

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await confirmEvent(eventId, userId, false);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('getEventConfirmationStatus()', () => {
    it('should return event confirmation status with momentum counts', async () => {
      const eventId = 'event-123';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              status: 'confirmed',
              threshold: 5,
              confirmed_at: '2026-03-16T10:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { status: 'in', count: '3' },
            { status: 'maybe', count: '1' },
            { status: 'out', count: '2' },
          ],
        });

      const result = await getEventConfirmationStatus(eventId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('confirmed');
      expect(result.data?.confirmedAt).toBe('2026-03-16T10:00:00Z');
      expect(result.data?.threshold).toBe(5);
      expect(result.data?.momentumCount.in).toBe(3);
      expect(result.data?.momentumCount.maybe).toBe(1);
      expect(result.data?.momentumCount.out).toBe(2);
    });

    it('should return null confirmedAt if event not confirmed', async () => {
      const eventId = 'event-123';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              status: 'proposal',
              threshold: 5,
              confirmed_at: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'in', count: '2' }],
        });

      const result = await getEventConfirmationStatus(eventId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('proposal');
      expect(result.data?.confirmedAt).toBeNull();
    });

    it('should return 404 if event not found', async () => {
      const eventId = 'event-notfound';

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await getEventConfirmationStatus(eventId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should handle database errors gracefully', async () => {
      const eventId = 'event-123';

      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await getEventConfirmationStatus(eventId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});
