import { updateEventThreshold, getEventThreshold } from '@/lib/services/eventService';
import { getClient } from '@/lib/db/client';

// Mock the database client
jest.mock('@/lib/db/client');

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockResolvedValue(mockClient);
});

describe('updateEventThreshold', () => {
  const eventId = 'event-123';
  const userId = 'user-456';
  const groupId = 'group-789';

  describe('Successful threshold updates', () => {
    it('should update threshold with valid value (1-1000)', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              created_by: userId,
              threshold: 5,
              status: 'proposal',
              version: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              created_by: userId,
              title: 'Test Event',
              description: null,
              date: '2026-03-20T10:00:00Z',
              threshold: 10,
              status: 'proposal',
              created_at: '2026-03-16T00:00:00Z',
              updated_at: '2026-03-16T01:00:00Z',
              version: 2,
            },
          ],
        });

      const result = await updateEventThreshold(eventId, userId, 10);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Threshold updated successfully');
      expect(result.data?.event.threshold).toBe(10);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE event_proposals'),
        [10, eventId, 1]
      );
    });

    it('should remove threshold by setting to null', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              created_by: userId,
              threshold: 5,
              status: 'proposal',
              version: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              created_by: userId,
              title: 'Test Event',
              description: null,
              date: '2026-03-20T10:00:00Z',
              threshold: null,
              status: 'proposal',
              created_at: '2026-03-16T00:00:00Z',
              updated_at: '2026-03-16T01:00:00Z',
            },
          ],
        });

      const result = await updateEventThreshold(eventId, userId, null);

      expect(result.success).toBe(true);
      expect(result.data?.event.threshold).toBeNull();
    });

    it('should auto-confirm event when threshold is met', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              created_by: userId,
              threshold: 5,
              status: 'proposal',
              version: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              created_by: userId,
              title: 'Test Event',
              description: null,
              date: '2026-03-20T10:00:00Z',
              threshold: 2,
              status: 'proposal',
              created_at: '2026-03-16T00:00:00Z',
              updated_at: '2026-03-16T01:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '5' }],
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'confirmed' }],
        });

      const result = await updateEventThreshold(eventId, userId, 2);

      expect(result.success).toBe(true);
      expect(result.data?.autoConfirmed).toBe(true);
      expect(result.data?.event.status).toBe('confirmed');
    });

    it('should NOT auto-confirm if threshold is not yet met', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              created_by: userId,
              threshold: 5,
              status: 'proposal',
              version: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              created_by: userId,
              title: 'Test Event',
              description: null,
              date: '2026-03-20T10:00:00Z',
              threshold: 10,
              status: 'proposal',
              created_at: '2026-03-16T00:00:00Z',
              updated_at: '2026-03-16T01:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '2' }],
        });

      const result = await updateEventThreshold(eventId, userId, 10);

      expect(result.success).toBe(true);
      expect(result.data?.autoConfirmed).toBe(false);
    });

    it('should keep confirmed status when increasing threshold', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              created_by: userId,
              threshold: 3,
              status: 'confirmed',
              version: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              created_by: userId,
              title: 'Test Event',
              description: null,
              date: '2026-03-20T10:00:00Z',
              threshold: 5,
              status: 'confirmed',
              created_at: '2026-03-16T00:00:00Z',
              updated_at: '2026-03-16T01:00:00Z',
            },
          ],
        });

      const result = await updateEventThreshold(eventId, userId, 5);

      expect(result.success).toBe(true);
      expect(result.data?.event.status).toBe('confirmed');
      expect(result.data?.autoConfirmed).toBe(false);
    });
  });

  describe('Validation errors', () => {
    it('should reject threshold of 0', async () => {
      const result = await updateEventThreshold(eventId, userId, 0);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('between 1 and 1000');
    });

    it('should reject negative threshold', async () => {
      const result = await updateEventThreshold(eventId, userId, -5);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject threshold over 1000', async () => {
      const result = await updateEventThreshold(eventId, userId, 1001);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject non-integer threshold', async () => {
      const result = await updateEventThreshold(eventId, userId, 5.5);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authorization checks', () => {
    it('should reject update from non-creator', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: eventId,
            created_by: 'other-user-id',
            threshold: 5,
            status: 'proposal',
            version: 1,
          },
        ],
      });

      const result = await updateEventThreshold(eventId, userId, 10);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(result.message).toContain('permission');
    });
  });

  describe('Error cases', () => {
    it('should return 404 when event not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await updateEventThreshold(eventId, userId, 5);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
      expect(result.message).toContain('not found');
    });

    it('should handle version conflict (optimistic locking)', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              created_by: userId,
              threshold: 5,
              status: 'proposal',
              version: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [], // Simulates version mismatch
        });

      const result = await updateEventThreshold(eventId, userId, 10);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFLICT');
      expect(result.message).toContain('conflict');
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await updateEventThreshold(eventId, userId, 10);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});

describe('getEventThreshold', () => {
  const eventId = 'event-123';

  describe('Successful retrieval', () => {
    it('should return threshold and confirmation count', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              threshold: 5,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              count: '3',
            },
          ],
        });

      const result = await getEventThreshold(eventId);

      expect(result.success).toBe(true);
      expect(result.data?.threshold).toBe(5);
      expect(result.data?.inCount).toBe(3);
    });

    it('should handle null threshold', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              threshold: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              count: '2',
            },
          ],
        });

      const result = await getEventThreshold(eventId);

      expect(result.success).toBe(true);
      expect(result.data?.threshold).toBeNull();
      expect(result.data?.inCount).toBe(2);
    });

    it('should handle zero in confirmations', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              threshold: 5,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              count: '0',
            },
          ],
        });

      const result = await getEventThreshold(eventId);

      expect(result.success).toBe(true);
      expect(result.data?.inCount).toBe(0);
    });
  });

  describe('Error cases', () => {
    it('should return 404 when event not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await getEventThreshold(eventId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await getEventThreshold(eventId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});
