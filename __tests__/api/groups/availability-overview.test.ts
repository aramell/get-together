/**
 * @jest-environment node
 */
import { GET } from '@/app/api/groups/[groupId]/availability-overview/route';
import * as queriesModule from '@/lib/db/queries';
import * as eventServiceModule from '@/lib/services/eventService';

jest.mock('@/lib/db/queries');
jest.mock('@/lib/services/eventService');

function createMockRequest(headers: [string, string][] = []) {
  return { headers: new Headers(headers) } as any;
}

describe('GET /api/groups/:groupId/availability-overview', () => {
  const mockGroupId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-01T12:00:00.000Z'));
    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue('member');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 401 if x-user-id header is missing', async () => {
    const response = await GET(createMockRequest(), { params: Promise.resolve({ groupId: mockGroupId }) });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.errorCode).toBe('NOT_AUTHENTICATED');
  });

  it('returns 403 if the user is not a group member', async () => {
    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue(null);
    const response = await GET(createMockRequest([['x-user-id', mockUserId]]), {
      params: Promise.resolve({ groupId: mockGroupId }),
    });
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.errorCode).toBe('FORBIDDEN');
  });

  it('returns a 14-day window with per-day merged status and only active proposals', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockResolvedValue([
      {
        user_id: mockUserId,
        user_name: 'Alice',
        availabilities: [],
        google_busy_blocks: [],
        merged_availability: [
          { start_time: '2026-09-01T09:00:00Z', end_time: '2026-09-01T17:00:00Z', status: 'free', source: 'manual' },
          { start_time: '2026-09-02T09:00:00Z', end_time: '2026-09-02T10:00:00Z', status: 'busy', source: 'google' },
        ],
      },
    ]);
    (eventServiceModule.getGroupEvents as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        { id: 'e1', status: 'proposal', title: 'Hiking Trip' },
        { id: 'e2', status: 'confirmed', title: 'Dinner' },
      ],
    });

    const response = await GET(createMockRequest([['x-user-id', mockUserId]]), {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.days).toHaveLength(14);
    expect(data.data.days[0]).toBe('2026-09-01');
    expect(data.data.members[0].availability[0]).toBe('free');
    expect(data.data.members[0].availability[1]).toBe('busy');
    expect(data.data.members[0].isCurrentUser).toBe(true);
    expect(data.data.activeProposals).toEqual([{ id: 'e1', status: 'proposal', title: 'Hiking Trip' }]);
  });

  it('returns 500 on database error', async () => {
    (queriesModule.getGroupAvailabilitiesForCalendar as jest.Mock).mockRejectedValue(new Error('db error'));
    const response = await GET(createMockRequest([['x-user-id', mockUserId]]), {
      params: Promise.resolve({ groupId: mockGroupId }),
    });
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.errorCode).toBe('INTERNAL_SERVER_ERROR');
  });
});
