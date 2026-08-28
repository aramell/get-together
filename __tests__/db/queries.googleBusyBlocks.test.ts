import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('@/lib/db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  getClient: jest.fn(),
}));

const { query } = require('@/lib/db/client');
const { getGroupGoogleBusyBlocks, getGroupAvailabilitiesForCalendar } = require('@/lib/db/queries');

describe('getGroupGoogleBusyBlocks (Story 3.6)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes the query to the group via group_memberships and the date range', async () => {
    query.mockResolvedValueOnce([
      { user_id: 'user-1', start_time: '2026-08-27T09:00:00.000Z', end_time: '2026-08-27T10:00:00.000Z' },
    ]);

    const result = await getGroupGoogleBusyBlocks('group-1', '2026-08-01T00:00:00.000Z', '2026-08-31T00:00:00.000Z');

    expect(result).toHaveLength(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/JOIN group_memberships gm ON gm.user_id = b.user_id AND gm.group_id = \$1/);
    expect(params).toEqual(['group-1', '2026-08-01T00:00:00.000Z', '2026-08-31T00:00:00.000Z']);
  });
});

describe('getGroupAvailabilitiesForCalendar merge integration (Story 3.6, AC2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns availabilities (unchanged), google_busy_blocks, and a precedence-resolved merged_availability per member', async () => {
    // 1: members
    query.mockResolvedValueOnce([{ user_id: 'user-1', name: 'Alice' }]);
    // 2: getGroupAvailabilitiesWithRecurring's internal query (all availabilities for group)
    query.mockResolvedValueOnce([
      {
        id: 'avail-1',
        user_id: 'user-1',
        group_id: 'group-1',
        start_time: '2026-08-27T09:00:00.000Z',
        end_time: '2026-08-27T17:00:00.000Z',
        status: 'free',
        version: 1,
        created_at: '2026-08-27T08:00:00.000Z',
        updated_at: '2026-08-27T08:00:00.000Z',
        recurring_pattern: null,
        recurring_end_date: null,
        user_name: 'Alice',
        user_email: 'alice@example.com',
      },
    ]);
    // 3: getGroupGoogleBusyBlocks
    query.mockResolvedValueOnce([
      { user_id: 'user-1', start_time: '2026-08-27T12:00:00.000Z', end_time: '2026-08-27T13:00:00.000Z' },
    ]);

    const result = await getGroupAvailabilitiesForCalendar(
      'group-1',
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T00:00:00.000Z'
    );

    expect(result).toHaveLength(1);
    const member = result[0];

    // Raw manual entry is untouched -- still directly editable (id, version, etc. intact)
    expect(member.availabilities).toEqual([
      expect.objectContaining({ id: 'avail-1', status: 'free', version: 1 }),
    ]);

    expect(member.google_busy_blocks).toEqual([
      { start_time: '2026-08-27T12:00:00.000Z', end_time: '2026-08-27T13:00:00.000Z' },
    ]);

    // Merge resolves Google-busy over the overlapping manual-free window (AC2)
    expect(member.merged_availability).toEqual([
      { start_time: '2026-08-27T09:00:00.000Z', end_time: '2026-08-27T12:00:00.000Z', status: 'free', source: 'manual' },
      { start_time: '2026-08-27T12:00:00.000Z', end_time: '2026-08-27T13:00:00.000Z', status: 'busy', source: 'google' },
      { start_time: '2026-08-27T13:00:00.000Z', end_time: '2026-08-27T17:00:00.000Z', status: 'free', source: 'manual' },
    ]);
  });

  it('returns empty google_busy_blocks/merged_availability for members with no Google connection', async () => {
    query.mockResolvedValueOnce([{ user_id: 'user-1', name: 'Alice' }]);
    query.mockResolvedValueOnce([
      {
        id: 'avail-1',
        user_id: 'user-1',
        group_id: 'group-1',
        start_time: '2026-08-27T09:00:00.000Z',
        end_time: '2026-08-27T17:00:00.000Z',
        status: 'free',
        version: 1,
        created_at: '2026-08-27T08:00:00.000Z',
        updated_at: '2026-08-27T08:00:00.000Z',
        recurring_pattern: null,
        recurring_end_date: null,
        user_name: 'Alice',
        user_email: 'alice@example.com',
      },
    ]);
    query.mockResolvedValueOnce([]); // no busy blocks

    const result = await getGroupAvailabilitiesForCalendar(
      'group-1',
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T00:00:00.000Z'
    );

    expect(result[0].google_busy_blocks).toEqual([]);
    expect(result[0].merged_availability).toEqual([
      { start_time: '2026-08-27T09:00:00.000Z', end_time: '2026-08-27T17:00:00.000Z', status: 'free', source: 'manual' },
    ]);
  });
});
