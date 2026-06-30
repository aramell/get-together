/**
 * @jest-environment node
 */
import { GET as getCalendarRoute } from '@/app/api/groups/[groupId]/calendar/route';
import * as queriesModule from '@/lib/db/queries';

jest.mock('@/lib/db/queries');

// Mock getUserGroupRole for authorization
const mockGetUserGroupRole = require('@/lib/db/queries').getUserGroupRole;

describe('Calendar Feature - Integration Tests', () => {
  const groupId = 'group-1';
  const userId = 'user-1';

  const mockMemberData = [
    {
      user_id: 'user-1',
      user_name: 'Alice Johnson',
      availabilities: [
        {
          id: 'avail-1',
          user_id: 'user-1',
          group_id: groupId,
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T17:00:00Z',
          status: 'free' as const,
          version: 1,
          created_at: '2026-03-05T08:00:00Z',
          updated_at: '2026-03-05T08:00:00Z',
        },
        {
          id: 'avail-2',
          user_id: 'user-1',
          group_id: groupId,
          start_time: '2026-03-06T14:00:00Z',
          end_time: '2026-03-06T18:00:00Z',
          status: 'busy' as const,
          version: 1,
          created_at: '2026-03-06T08:00:00Z',
          updated_at: '2026-03-06T08:00:00Z',
        },
      ],
    },
    {
      user_id: 'user-2',
      user_name: 'Bob Smith',
      availabilities: [
        {
          id: 'avail-3',
          user_id: 'user-2',
          group_id: groupId,
          start_time: '2026-03-05T14:00:00Z',
          end_time: '2026-03-05T18:00:00Z',
          status: 'busy' as const,
          version: 1,
          created_at: '2026-03-05T08:00:00Z',
          updated_at: '2026-03-05T08:00:00Z',
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock user as group member by default
    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue('member');
  });

  // Integration test 1: User views calendar and sees all members
  it('should display all group members with their availability on the calendar', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockResolvedValue(
      mockMemberData
    );

    const mockRequest = {
      headers: new Headers([['x-user-id', userId]]),
      nextUrl: {
        searchParams: new URLSearchParams([
          ['startDate', '2026-03-01T00:00:00Z'],
          ['endDate', '2026-03-31T23:59:59Z'],
        ]),
      },
    } as any;

    const response = await getCalendarRoute(mockRequest, {
      params: Promise.resolve({ groupId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Verify response structure
    expect(data.success).toBe(true);
    expect(data.data.groupId).toBe(groupId);

    // Verify all members are present
    expect(data.data.members).toHaveLength(2);
    expect(data.data.members[0].user_name).toBe('Alice Johnson');
    expect(data.data.members[1].user_name).toBe('Bob Smith');

    // Verify availability data is included
    expect(data.data.members[0].availabilities).toHaveLength(2);
    expect(data.data.members[0].availabilities[0].status).toBe('free');
    expect(data.data.members[0].availabilities[1].status).toBe('busy');
  });

  // Integration test 2: Calendar filters by date range
  it('should return only availabilities within the requested date range', async () => {
    const filteredMembers = [
      {
        user_id: 'user-1',
        user_name: 'Alice Johnson',
        availabilities: [
          mockMemberData[0].availabilities[0], // Only March 5
        ],
      },
      {
        user_id: 'user-2',
        user_name: 'Bob Smith',
        availabilities: [
          mockMemberData[1].availabilities[0], // Only March 5
        ],
      },
    ];

    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockResolvedValue(
      filteredMembers
    );

    const mockRequest = {
      headers: new Headers([['x-user-id', userId]]),
      nextUrl: {
        searchParams: new URLSearchParams([
          ['startDate', '2026-03-05T00:00:00Z'],
          ['endDate', '2026-03-05T23:59:59Z'],
        ]),
      },
    } as any;

    const response = await getCalendarRoute(mockRequest, {
      params: Promise.resolve({ groupId }),
    });

    const data = await response.json();
    expect(data.data.members[0].availabilities).toHaveLength(1);
  });

  // Integration test 3: Empty group scenario
  it('should handle empty group gracefully', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockResolvedValue([]);

    const mockRequest = {
      headers: new Headers([['x-user-id', userId]]),
      nextUrl: {
        searchParams: new URLSearchParams([
          ['startDate', '2026-03-01T00:00:00Z'],
          ['endDate', '2026-03-31T23:59:59Z'],
        ]),
      },
    } as any;

    const response = await getCalendarRoute(mockRequest, {
      params: Promise.resolve({ groupId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.members).toEqual([]);
  });

  // Integration test 4: Member with mixed availability status
  it('should display members with both free and busy slots', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockResolvedValue(
      mockMemberData
    );

    const mockRequest = {
      headers: new Headers([['x-user-id', userId]]),
      nextUrl: {
        searchParams: new URLSearchParams([
          ['startDate', '2026-03-01T00:00:00Z'],
          ['endDate', '2026-03-31T23:59:59Z'],
        ]),
      },
    } as any;

    const response = await getCalendarRoute(mockRequest, {
      params: Promise.resolve({ groupId }),
    });

    const data = await response.json();
    const alice = data.data.members[0];

    // Alice has both free and busy slots
    const freeSlots = alice.availabilities.filter(
      (a: any) => a.status === 'free'
    );
    const busySlots = alice.availabilities.filter(
      (a: any) => a.status === 'busy'
    );

    expect(freeSlots.length).toBeGreaterThan(0);
    expect(busySlots.length).toBeGreaterThan(0);
  });

  // Integration test 5: Peak times can be calculated from response
  it('should return data that allows peak time calculation', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockResolvedValue(
      mockMemberData
    );

    const mockRequest = {
      headers: new Headers([['x-user-id', userId]]),
      nextUrl: {
        searchParams: new URLSearchParams([
          ['startDate', '2026-03-01T00:00:00Z'],
          ['endDate', '2026-03-31T23:59:59Z'],
        ]),
      },
    } as any;

    const response = await getCalendarRoute(mockRequest, {
      params: Promise.resolve({ groupId }),
    });

    const data = await response.json();

    // Calculate peak times from the data
    const timeSlots = new Map<
      string,
      { count: number; members: string[] }
    >();

    data.data.members.forEach((member: any) => {
      member.availabilities
        .filter((a: any) => a.status === 'free')
        .forEach((avail: any) => {
          const timeKey = `${avail.start_time.split('T')[1]} - ${avail.end_time.split('T')[1]}`;
          if (!timeSlots.has(timeKey)) {
            timeSlots.set(timeKey, { count: 0, members: [] });
          }
          const slot = timeSlots.get(timeKey)!;
          slot.count++;
          slot.members.push(member.user_name);
        });
    });

    // Should have at least one free time slot
    expect(timeSlots.size).toBeGreaterThan(0);

    // Verify structure of peak times
    const peakTimes = Array.from(timeSlots.entries()).map(([time, data]) => ({
      time,
      ...data,
    }));
    expect(peakTimes[0]).toHaveProperty('time');
    expect(peakTimes[0]).toHaveProperty('count');
    expect(peakTimes[0]).toHaveProperty('members');
  });

  // Integration test 6: Authentication required
  it('should reject requests without authentication header', async () => {
    const mockRequest = {
      headers: new Headers(),
      nextUrl: {
        searchParams: new URLSearchParams([
          ['startDate', '2026-03-01T00:00:00Z'],
          ['endDate', '2026-03-31T23:59:59Z'],
        ]),
      },
    } as any;

    const response = await getCalendarRoute(mockRequest, {
      params: Promise.resolve({ groupId }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.errorCode).toBe('NOT_AUTHENTICATED');
  });

  // Integration test 7: Invalid date range
  it('should validate date range parameters', async () => {
    const mockRequest = {
      headers: new Headers([['x-user-id', userId]]),
      nextUrl: {
        searchParams: new URLSearchParams([
          ['startDate', 'not-a-date'],
          ['endDate', '2026-03-31T23:59:59Z'],
        ]),
      },
    } as any;

    const response = await getCalendarRoute(mockRequest, {
      params: Promise.resolve({ groupId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errorCode).toBe('INVALID_DATES');
  });

  // Integration test 8: Database errors are handled
  it('should handle database errors gracefully', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const mockRequest = {
      headers: new Headers([['x-user-id', userId]]),
      nextUrl: {
        searchParams: new URLSearchParams([
          ['startDate', '2026-03-01T00:00:00Z'],
          ['endDate', '2026-03-31T23:59:59Z'],
        ]),
      },
    } as any;

    const response = await getCalendarRoute(mockRequest, {
      params: Promise.resolve({ groupId }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect(data.success).toBe(false);
  });
});
