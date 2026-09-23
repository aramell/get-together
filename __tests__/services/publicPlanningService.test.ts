import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getPublicEventPlanning } from '@/lib/services/publicPlanningService';

jest.mock('@/lib/db/client', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getEventByPublicToken: jest.fn(),
  getGroupMemberNames: jest.fn(),
}));

const { query } = require('@/lib/db/client');
const { getEventByPublicToken, getGroupMemberNames } = require('@/lib/db/queries');

describe('getPublicEventPlanning', () => {
  const publicToken = 'a'.repeat(64);
  const eventId = 'event-1';
  const groupId = 'group-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns not-found when the token does not match an event', async () => {
    getEventByPublicToken.mockResolvedValue(null);

    const result = await getPublicEventPlanning(publicToken);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Event not found or link has expired');
  });

  it('rejects a cancelled event', async () => {
    getEventByPublicToken.mockResolvedValue({ id: eventId, group_id: groupId, status: 'cancelled' });

    const result = await getPublicEventPlanning(publicToken);

    expect(result.success).toBe(false);
    expect(result.message).toBe('This event is no longer available');
  });

  it('resolves assignees and claimants to first name only, never raw IDs', async () => {
    getEventByPublicToken.mockResolvedValue({ id: eventId, group_id: groupId, status: 'proposal' });
    getGroupMemberNames.mockResolvedValue([
      { id: 'user-andrew', displayName: 'Andrew Ramell' },
      { id: 'user-jamie', displayName: 'Jamie' },
    ]);

    query
      .mockResolvedValueOnce([
        { id: 'chk-1', assigned_to: 'user-andrew', title: 'Bring firewood', is_checked: false },
        { id: 'chk-2', assigned_to: null, title: 'Bring marshmallows', is_checked: true },
      ])
      .mockResolvedValueOnce([
        {
          id: 'log-1',
          category: 'bring',
          title: 'Tents',
          assigned_to: 'user-jamie',
          capacity: null,
          claimant_ids: [],
        },
        {
          id: 'log-2',
          category: 'carpool',
          title: 'Ride from the city',
          assigned_to: 'user-andrew',
          capacity: 4,
          claimant_ids: ['user-jamie', 'user-unknown'],
        },
      ])
      .mockResolvedValueOnce([
        { id: 'tl-1', item_time: '2026-09-20T14:00:00Z', title: 'Scavenger hunt', description: null },
      ]);

    const result = await getPublicEventPlanning(publicToken);

    expect(result.success).toBe(true);
    expect(result.data?.checklist).toEqual([
      { id: 'chk-1', title: 'Bring firewood', is_checked: false, assignee_first_name: 'Andrew' },
      { id: 'chk-2', title: 'Bring marshmallows', is_checked: true, assignee_first_name: null },
    ]);
    expect(result.data?.logistics).toEqual([
      {
        id: 'log-1',
        category: 'bring',
        title: 'Tents',
        capacity: null,
        assignee_first_name: 'Jamie',
        claim_count: 0,
        claimant_first_names: [],
      },
      {
        id: 'log-2',
        category: 'carpool',
        title: 'Ride from the city',
        capacity: 4,
        assignee_first_name: 'Andrew',
        claim_count: 2,
        claimant_first_names: ['Jamie', 'Someone'],
      },
    ]);
    expect(result.data?.timeline).toEqual([
      { id: 'tl-1', item_time: '2026-09-20T14:00:00Z', title: 'Scavenger hunt', description: null },
    ]);

    const serialized = JSON.stringify(result.data);
    expect(serialized).not.toContain('user-andrew');
    expect(serialized).not.toContain('user-jamie');
  });

  it('returns internal-error on an unexpected failure', async () => {
    getEventByPublicToken.mockRejectedValue(new Error('db down'));

    const result = await getPublicEventPlanning(publicToken);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Internal server error');
  });
});
