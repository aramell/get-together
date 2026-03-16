import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getGroupEvents } from '@/lib/services/eventService';

jest.mock('@/lib/db/client', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getUserGroupRole: jest.fn(),
}));

const { getClient } = require('@/lib/db/client');
const { getUserGroupRole } = require('@/lib/db/queries');

describe('Event Service - getGroupEvents (with pagination and momentum)', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const validGroupId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
    mockClient.query.mockClear();
    mockClient.release.mockClear();
    getUserGroupRole.mockClear();
  });

  describe('Authorization', () => {
    it('should reject if user is not a group member', async () => {
      getUserGroupRole.mockResolvedValue(null);

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(result.message).toContain('must be a group member');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should proceed if user is a member', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await getGroupEvents(validGroupId, validUserId);

      expect(getUserGroupRole).toHaveBeenCalledWith(validGroupId, validUserId);
    });
  });

  describe('Pagination', () => {
    it('should return events with default pagination (limit=20, offset=0)', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // count query
        .mockResolvedValueOnce({ rows: [] }); // events query

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.success).toBe(true);
      // Check that the second call (events query) has parameters [groupId, 20, 0]
      const calls = mockClient.query.mock.calls;
      expect(calls[1][1]).toEqual([validGroupId, 20, 0]);
    });

    it('should support custom limit and offset parameters', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getGroupEvents(validGroupId, validUserId, { limit: 10, offset: 5 });

      const calls = mockClient.query.mock.calls;
      expect(calls[1][1]).toEqual([validGroupId, 10, 5]);
    });

    it('should return total_count for pagination', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // total count query
        .mockResolvedValueOnce({ rows: [] }); // events query

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.success).toBe(true);
      expect(result.total_count).toBe(50);
    });

    it('should clamp limit to max 100', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getGroupEvents(validGroupId, validUserId, { limit: 200 });

      const calls = mockClient.query.mock.calls;
      // Should clamp to 100
      expect(calls[1][1]).toEqual([validGroupId, 100, 0]);
    });

    it('should default to limit 20 if not specified', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getGroupEvents(validGroupId, validUserId, { offset: 0 });

      const calls = mockClient.query.mock.calls;
      expect(calls[1][1]).toEqual([validGroupId, 20, 0]);
    });
  });

  describe('Momentum Counts', () => {
    it('should include RSVP counts (momentum) for each event', async () => {
      getUserGroupRole.mockResolvedValue('member');

      const eventId1 = '770e8400-e29b-41d4-a716-446655440002';
      const eventId2 = '880e8400-e29b-41d4-a716-446655440003';

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // total count
        .mockResolvedValueOnce({
          // events with RSVP counts (using GROUP BY in SQL)
          rows: [
            {
              id: eventId1,
              group_id: validGroupId,
              created_by: validUserId,
              title: 'Pizza Night',
              date: '2026-04-20T19:00:00Z',
              threshold: 5,
              status: 'proposal',
              in_count: '3',
              maybe_count: '1',
              out_count: '0',
              created_at: '2026-03-16T10:00:00Z',
              updated_at: '2026-03-16T10:00:00Z',
            },
            {
              id: eventId2,
              group_id: validGroupId,
              created_by: validUserId,
              title: 'Hiking Trip',
              date: '2026-05-10T08:00:00Z',
              threshold: null,
              status: 'confirmed',
              in_count: '2',
              maybe_count: '0',
              out_count: '1',
              created_at: '2026-03-16T11:00:00Z',
              updated_at: '2026-03-16T11:00:00Z',
            },
          ],
        });

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(result.data?.[0]).toMatchObject({
        id: eventId1,
        title: 'Pizza Night',
        momentum: {
          in: 3,
          maybe: 1,
          out: 0,
        },
      });
      expect(result.data?.[1]).toMatchObject({
        id: eventId2,
        title: 'Hiking Trip',
        momentum: {
          in: 2,
          maybe: 0,
          out: 1,
        },
      });
    });

    it('should handle events with zero RSVPs', async () => {
      getUserGroupRole.mockResolvedValue('member');

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              group_id: validGroupId,
              created_by: validUserId,
              title: 'New Event',
              date: '2026-04-20T19:00:00Z',
              threshold: null,
              status: 'proposal',
              in_count: '0',
              maybe_count: '0',
              out_count: '0',
              created_at: '2026-03-16T10:00:00Z',
              updated_at: '2026-03-16T10:00:00Z',
            },
          ],
        });

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.success).toBe(true);
      expect(result.data?.[0].momentum).toEqual({
        in: 0,
        maybe: 0,
        out: 0,
      });
    });
  });

  describe('Sorting', () => {
    it('should sort events by date descending (most recent first)', async () => {
      getUserGroupRole.mockResolvedValue('member');

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              title: 'Later Event',
              date: '2026-05-20T19:00:00Z',
              status: 'proposal',
              in_count: '1',
              maybe_count: '0',
              out_count: '0',
              created_at: '2026-03-16T10:00:00Z',
              updated_at: '2026-03-16T10:00:00Z',
            },
            {
              id: '880e8400-e29b-41d4-a716-446655440003',
              title: 'Earlier Event',
              date: '2026-04-20T19:00:00Z',
              status: 'proposal',
              in_count: '2',
              maybe_count: '0',
              out_count: '0',
              created_at: '2026-03-16T09:00:00Z',
              updated_at: '2026-03-16T09:00:00Z',
            },
          ],
        });

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.data?.[0].date).toBe('2026-05-20T19:00:00Z');
      expect(result.data?.[1].date).toBe('2026-04-20T19:00:00Z');
    });
  });

  describe('Status Filtering', () => {
    it('should exclude deleted events (deleted_at IS NULL)', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await getGroupEvents(validGroupId, validUserId);

      // Both count and events queries should check deleted_at IS NULL
      const calls = mockClient.query.mock.calls;
      expect(calls[0][0]).toContain('deleted_at IS NULL'); // count query
      expect(calls[1][0]).toContain('deleted_at IS NULL'); // events query
    });

    it('should return both proposed and confirmed events', async () => {
      getUserGroupRole.mockResolvedValue('member');

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              title: 'Confirmed Event',
              date: '2026-04-20T19:00:00Z',
              status: 'confirmed',
              in_count: '5',
              maybe_count: '0',
              out_count: '0',
              created_at: '2026-03-16T10:00:00Z',
              updated_at: '2026-03-16T10:00:00Z',
            },
            {
              id: '880e8400-e29b-41d4-a716-446655440003',
              title: 'Proposed Event',
              date: '2026-05-20T19:00:00Z',
              status: 'proposal',
              in_count: '2',
              maybe_count: '1',
              out_count: '0',
              created_at: '2026-03-16T11:00:00Z',
              updated_at: '2026-03-16T11:00:00Z',
            },
          ],
        });

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.data?.length).toBe(2);
      expect(result.data?.some((e: any) => e.status === 'confirmed')).toBe(true);
      expect(result.data?.some((e: any) => e.status === 'proposal')).toBe(true);
    });
  });

  describe('Empty Result Handling', () => {
    it('should return empty array when no events exist', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total_count).toBe(0);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle total count query failure', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query.mockRejectedValueOnce(new Error('Database connection lost'));

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle events query failure', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockRejectedValueOnce(new Error('Database query error'));

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should always release database connection', async () => {
      getUserGroupRole.mockResolvedValue('member');
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await getGroupEvents(validGroupId, validUserId);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Data Types', () => {
    it('should convert string count values to integers', async () => {
      getUserGroupRole.mockResolvedValue('member');

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              title: 'Event',
              date: '2026-04-20T19:00:00Z',
              status: 'proposal',
              in_count: '42',
              maybe_count: '13',
              out_count: '5',
              created_at: '2026-03-16T10:00:00Z',
              updated_at: '2026-03-16T10:00:00Z',
            },
          ],
        });

      const result = await getGroupEvents(validGroupId, validUserId);

      expect(result.data?.[0].momentum.in).toBe(42);
      expect(typeof result.data?.[0].momentum.in).toBe('number');
      expect(result.total_count).toBe(100);
      expect(typeof result.total_count).toBe('number');
    });
  });
});
