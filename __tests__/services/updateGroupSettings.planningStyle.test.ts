import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Isolated test file (not appended to groupService.test.ts) to avoid that
// file's pre-existing mockResolvedValueOnce queue bleeding across describe
// blocks — confirmed pre-existing on a clean tree via regenerateInviteCode's
// own cascading failures.
global.fetch = jest.fn() as jest.Mock;

const { updateGroupSettings } = require('@/lib/services/groupService');

describe('Group Service - updateGroupSettings (Story 2.8: Planning Style)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PATCHes /api/groups/:groupId with planning_style and returns the updated group', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Group updated successfully',
        group: { id: 'group-1', planning_style: 'proposals-first' },
      }),
    });

    const result = await updateGroupSettings('group-1', { planning_style: 'proposals-first' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/group-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ planning_style: 'proposals-first' }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.group.planning_style).toBe('proposals-first');
  });

  it('surfaces a 403 as a failed result (AC3: non-admin cannot change)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        message: 'Not authorized',
        errorCode: 'NOT_GROUP_ADMIN',
      }),
    });

    const result = await updateGroupSettings('group-1', { planning_style: 'proposals-first' });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_GROUP_ADMIN');
  });
});
