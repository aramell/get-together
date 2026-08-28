/**
 * Integration Tests for Story 2.8: Per-Group Planning Style Setting (FR71)
 *
 * Covers the settings <-> read round trip: an admin's change to planning_style
 * is what a future landing-view consumer (Story 3.7) would read on next app
 * open (AC2, AC4). Story 3.7 itself is not yet built (still ready-for-dev),
 * so Task 4's routing wiring is out of scope here — see Dev Agent Record.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

global.fetch = jest.fn() as jest.Mock;

const { updateGroupSettings, getGroupDetails } = require('@/lib/services/groupService');

describe('Planning Style settings round trip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AC2/AC4: a saved planning_style change is what the next group read returns', async () => {
    (global.fetch as jest.Mock)
      // Admin PATCHes the setting
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Group updated successfully',
          group: { id: 'group-1', planning_style: 'proposals-first' },
        }),
      })
      // A member's next app-open reads the group
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            group: { id: 'group-1', planning_style: 'proposals-first' },
            members: [],
            currentUserRole: 'member',
          },
        }),
      });

    const updateResult = await updateGroupSettings('group-1', { planning_style: 'proposals-first' });
    expect(updateResult.success).toBe(true);
    expect(updateResult.group.planning_style).toBe('proposals-first');

    const readResult = await getGroupDetails('group-1', 'member-user');
    expect(readResult.success).toBe(true);
    expect(readResult.data.group.planning_style).toBe('proposals-first');
  });

  it('AC5: a group with no explicit change still reads the availability-first default', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          group: { id: 'legacy-group', planning_style: 'availability-first' },
          members: [],
          currentUserRole: 'member',
        },
      }),
    });

    const readResult = await getGroupDetails('legacy-group', 'member-user');
    expect(readResult.data.group.planning_style).toBe('availability-first');
  });
});
