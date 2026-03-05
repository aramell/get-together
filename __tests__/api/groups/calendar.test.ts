/**
 * @jest-environment node
 */
import { GET } from '@/app/api/groups/[groupId]/calendar/route';
import * as queriesModule from '@/lib/db/queries';

jest.mock('@/lib/db/queries');

// Helper to create mock requests
function createMockRequest(
  params: [string, string][] = [],
  searchParams: [string, string][] = []
) {
  return {
    headers: new Headers(params),
    nextUrl: {
      searchParams: new URLSearchParams(searchParams),
    },
  } as any;
}

describe('GET /api/groups/:groupId/calendar', () => {
  const mockGroupId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';

  const mockMemberData = [
    {
      user_id: 'user-1',
      user_name: 'Alice Johnson',
      availabilities: [
        {
          id: 'avail-1',
          user_id: 'user-1',
          group_id: mockGroupId,
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T17:00:00Z',
          status: 'free' as const,
          version: 1,
          created_at: '2026-03-05T08:00:00Z',
          updated_at: '2026-03-05T08:00:00Z',
        },
      ],
    },
    {
      user_id: 'user-2',
      user_name: 'Bob Smith',
      availabilities: [
        {
          id: 'avail-2',
          user_id: 'user-2',
          group_id: mockGroupId,
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
  });

  // Test: Missing authentication header
  it('should return 401 if x-user-id header is missing', async () => {
    const mockRequest = createMockRequest([]);

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('NOT_AUTHENTICATED');
  });

  // Test: Invalid date format
  it('should return 400 if dates are invalid', async () => {
    const mockRequest = createMockRequest(
      [['x-user-id', mockUserId]],
      [['startDate', 'invalid']]
    );

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errorCode).toBe('INVALID_DATES');
  });

  // Test: Successful calendar data retrieval
  it('should return calendar data when authenticated', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockResolvedValue(
      mockMemberData
    );

    const mockRequest = createMockRequest(
      [['x-user-id', mockUserId]],
      [
        ['startDate', '2026-03-01T00:00:00Z'],
        ['endDate', '2026-03-31T23:59:59Z'],
      ]
    );

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.members.length).toBe(2);
    expect(data.data.groupId).toBe(mockGroupId);
  });

  // Test: Empty group
  it('should return empty members array', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockResolvedValue([]);

    const mockRequest = createMockRequest(
      [['x-user-id', mockUserId]],
      [
        ['startDate', '2026-03-01T00:00:00Z'],
        ['endDate', '2026-03-31T23:59:59Z'],
      ]
    );

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.members).toEqual([]);
  });

  // Test: Database error
  it('should return 500 on database error', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const mockRequest = createMockRequest(
      [['x-user-id', mockUserId]],
      [
        ['startDate', '2026-03-01T00:00:00Z'],
        ['endDate', '2026-03-31T23:59:59Z'],
      ]
    );

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.errorCode).toBe('INTERNAL_SERVER_ERROR');
  });
});
