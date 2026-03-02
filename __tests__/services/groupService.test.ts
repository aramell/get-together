import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

const { getGroupsByUser } = require('@/lib/services/groupService');

describe('Group Service - getGroupsByUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGroupsByUser function', () => {
    it('should retrieve all groups for a user with correct properties', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Groups retrieved',
          groups: [
            {
              id: 'group-1',
              name: 'Weekend Hikers',
              member_count: 5,
              last_activity_date: '2026-03-02T10:30:00Z',
              role: 'admin',
            },
            {
              id: 'group-2',
              name: 'Board Game Night',
              member_count: 3,
              last_activity_date: '2026-03-01T20:15:00Z',
              role: 'member',
            },
          ],
        }),
      });

      const result = await getGroupsByUser('user-123');

      expect(result.success).toBe(true);
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].name).toBe('Weekend Hikers');
      expect(result.groups[0].role).toBe('admin');
      expect(result.groups[1].role).toBe('member');
    });

    it('should return empty array when user has no groups', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Groups retrieved',
          groups: [],
        }),
      });

      const result = await getGroupsByUser('user-456');

      expect(result.success).toBe(true);
      expect(result.groups).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: 'Unauthorized',
          errorCode: 'UNAUTHORIZED',
        }),
      });

      const result = await getGroupsByUser('user-789');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNAUTHORIZED');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await getGroupsByUser('user-123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should sort groups by last_activity_date descending', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Groups retrieved',
          groups: [
            {
              id: 'group-1',
              name: 'Group A',
              member_count: 2,
              last_activity_date: '2026-03-02T15:00:00Z',
              role: 'member',
            },
            {
              id: 'group-2',
              name: 'Group B',
              member_count: 4,
              last_activity_date: '2026-03-01T12:00:00Z',
              role: 'admin',
            },
            {
              id: 'group-3',
              name: 'Group C',
              member_count: 3,
              last_activity_date: '2026-03-02T18:00:00Z',
              role: 'member',
            },
          ],
        }),
      });

      const result = await getGroupsByUser('user-123');

      // API should return already sorted, but verify order
      expect(result.groups[0].id).toBe('group-3'); // Most recent
      expect(result.groups[1].id).toBe('group-1');
      expect(result.groups[2].id).toBe('group-2'); // Least recent
    });

    it('should include member count and role in each group', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Groups retrieved',
          groups: [
            {
              id: 'group-1',
              name: 'Test Group',
              member_count: 7,
              last_activity_date: '2026-03-02T10:00:00Z',
              role: 'admin',
            },
          ],
        }),
      });

      const result = await getGroupsByUser('user-123');

      expect(result.groups[0].member_count).toBe(7);
      expect(result.groups[0].role).toBeDefined();
      expect(['admin', 'member']).toContain(result.groups[0].role);
    });

    it('should handle last_activity_date properly as ISO string', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Groups retrieved',
          groups: [
            {
              id: 'group-1',
              name: 'Test',
              member_count: 2,
              last_activity_date: '2026-03-02T14:30:45.123Z',
              role: 'member',
            },
          ],
        }),
      });

      const result = await getGroupsByUser('user-123');

      expect(result.groups[0].last_activity_date).toBe('2026-03-02T14:30:45.123Z');
    });
  });
});
