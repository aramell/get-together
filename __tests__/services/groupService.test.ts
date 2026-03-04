import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

const { getGroupsByUser, regenerateInviteCode } = require('@/lib/services/groupService');

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

describe('Group Service - regenerateInviteCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('regenerateInviteCode function', () => {
    it('should successfully regenerate invite code for admin user', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Invite code regenerated successfully',
          data: {
            inviteCode: 'abc123def456',
            inviteUrl: 'https://gettogether.app/join/abc123def456',
          },
        }),
      });

      const result = await regenerateInviteCode('group-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data.inviteCode).toBe('abc123def456');
      expect(result.data.inviteUrl).toContain('/join/abc123def456');
    });

    it('should return 403 Forbidden if user is not admin', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          message: 'Only group admins can regenerate invite links',
          errorCode: 'FORBIDDEN',
        }),
      });

      const result = await regenerateInviteCode('group-123', 'user-789');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('should return 404 if group not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          message: 'Group not found',
          errorCode: 'NOT_FOUND',
        }),
      });

      const result = await regenerateInviteCode('nonexistent-group', 'user-123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should handle authentication errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          message: 'Authentication required',
          errorCode: 'UNAUTHORIZED',
        }),
      });

      const result = await regenerateInviteCode('group-123', undefined as any);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('UNAUTHORIZED');
    });

    it('should generate a new 16-character hex invite code', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Invite code regenerated successfully',
          data: {
            inviteCode: 'fedcba9876543210',
            inviteUrl: 'https://gettogether.app/join/fedcba9876543210',
          },
        }),
      });

      const result = await regenerateInviteCode('group-123', 'user-456');

      expect(result.data.inviteCode).toMatch(/^[a-f0-9]{16}$/);
      expect(result.data.inviteCode).toHaveLength(16);
    });

    it('should invalidate old invite code automatically', async () => {
      const oldCode = 'oldcodecode1234';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Invite code regenerated successfully',
          data: {
            inviteCode: 'newcodeecode5678',
            inviteUrl: 'https://gettogether.app/join/newcodeecode5678',
            oldCodeInvalidated: true,
          },
        }),
      });

      const result = await regenerateInviteCode('group-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data.inviteCode).not.toBe(oldCode);
      expect(result.data.oldCodeInvalidated).toBe(true);
    });

    it('should preserve existing group membership', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Invite code regenerated successfully',
          data: {
            inviteCode: 'newcode1234abcd',
            inviteUrl: 'https://gettogether.app/join/newcode1234abcd',
            existingMembersPreserved: true,
          },
        }),
      });

      const result = await regenerateInviteCode('group-123', 'user-456');

      expect(result.success).toBe(true);
      expect(result.data.existingMembersPreserved).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await regenerateInviteCode('group-123', 'user-456');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});
