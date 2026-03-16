import { updateEventRsvp } from '@/lib/services/eventService';
import { getClient } from '@/lib/db/client';

// Mock the database client
jest.mock('@/lib/db/client');

describe('eventService.updateEventRsvp', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('Happy Path', () => {
    it('should create new RSVP when user has not responded', async () => {
      const eventId = 'event-123';
      const userId = 'user-123';
      const groupId = 'group-123';

      // Mock event lookup
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: eventId, group_id: groupId, threshold: 5, status: 'proposal' }],
      });

      // Mock group membership check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'membership-123' }],
      });

      // Mock RSVP upsert
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'rsvp-123',
            event_id: eventId,
            user_id: userId,
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          },
        ],
      });

      // Mock counts
      mockClient.query.mockResolvedValueOnce({
        rows: [{ status: 'in', count: '1' }],
      });

      const result = await updateEventRsvp(eventId, userId, 'in');

      expect(result.success).toBe(true);
      expect(result.data?.momentumCount.in).toBe(1);
      expect(result.data?.status).toBe('in');
    });

    it('should update existing RSVP when user changes response', async () => {
      const eventId = 'event-123';
      const userId = 'user-123';
      const groupId = 'group-123';

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: eventId, group_id: groupId, threshold: 5, status: 'proposal' }],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'membership-123' }],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'rsvp-123',
            event_id: eventId,
            user_id: userId,
            status: 'maybe',
            responded_at: '2026-03-16T10:00:00Z',
          },
        ],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [
          { status: 'in', count: '0' },
          { status: 'maybe', count: '1' },
        ],
      });

      const result = await updateEventRsvp(eventId, userId, 'maybe');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('maybe');
      expect(result.data?.momentumCount.maybe).toBe(1);
    });

    it('should auto-confirm event when threshold is reached', async () => {
      const eventId = 'event-123';
      const userId = 'user-123';
      const groupId = 'group-123';

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: eventId, group_id: groupId, threshold: 2, status: 'proposal' }],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'membership-123' }],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'rsvp-123',
            event_id: eventId,
            user_id: userId,
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          },
        ],
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [{ status: 'in', count: '2' }],
      });

      // Mock confirmation update
      mockClient.query.mockResolvedValueOnce({
        rows: [{ status: 'confirmed' }],
      });

      const result = await updateEventRsvp(eventId, userId, 'in');

      expect(result.success).toBe(true);
      expect(result.data?.eventConfirmed).toBe(true);
      expect(result.data?.autoConfirmed).toBe(true);
    });
  });

  describe('Authorization', () => {
    it('should return 403 when user is not group member', async () => {
      const eventId = 'event-123';
      const userId = 'user-123';
      const groupId = 'group-123';

      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: eventId, group_id: groupId, threshold: 5, status: 'proposal' }],
      });

      // Group membership check returns empty
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await updateEventRsvp(eventId, userId, 'in');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(result.error).toBe('NOT_GROUP_MEMBER');
    });

    it('should return 404 when event does not exist', async () => {
      const eventId = 'nonexistent';
      const userId = 'user-123';

      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await updateEventRsvp(eventId, userId, 'in');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
      expect(result.error).toBe('EVENT_NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const eventId = 'event-123';
      const userId = 'user-123';

      mockClient.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await updateEventRsvp(eventId, userId, 'in');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});
