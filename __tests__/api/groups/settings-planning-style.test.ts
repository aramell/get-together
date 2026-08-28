import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/groups/[groupId]/route';

// Mock the database queries module
jest.mock('@/lib/services/groupServerService', () => ({
  getGroupDetailsFromDb: jest.fn(),
}));
jest.mock('@/lib/db/queries', () => ({
  updateGroup: jest.fn(),
  getUserGroupRole: jest.fn(),
  getGroupById: jest.fn(),
  deleteGroup: jest.fn(),
}));

import { updateGroup, getUserGroupRole, getGroupById } from '@/lib/db/queries';

function patchRequest(body: unknown, userId: string | null) {
  return new NextRequest(new URL('http://localhost:3000/api/groups/group-123'), {
    method: 'PATCH',
    headers: new Headers(userId ? { 'x-user-id': userId } : {}),
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/groups/:groupId — planning_style (Story 2.8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getGroupById as jest.Mock).mockResolvedValue({
      id: 'group-123',
      name: 'Existing Group',
      description: null,
      created_by: 'admin-user',
      invite_code: 'abc123',
      planning_style: 'availability-first',
    });
  });

  it('AC2: allows an admin to update planning_style', async () => {
    (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
    (updateGroup as jest.Mock).mockResolvedValue({
      id: 'group-123',
      name: 'Existing Group',
      description: null,
      created_by: 'admin-user',
      invite_code: 'abc123',
      planning_style: 'proposals-first',
      updated_at: '2026-08-27T00:00:00.000Z',
    });

    const response = await PATCH(patchRequest({ planning_style: 'proposals-first' }, 'admin-user'), {
      params: Promise.resolve({ groupId: 'group-123' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.group.planning_style).toBe('proposals-first');
    expect(updateGroup).toHaveBeenCalledWith('group-123', { planning_style: 'proposals-first' });
  });

  it('AC3: rejects a non-admin with 403 and does not update', async () => {
    (getUserGroupRole as jest.Mock).mockResolvedValue('member');

    const response = await PATCH(patchRequest({ planning_style: 'proposals-first' }, 'member-user'), {
      params: Promise.resolve({ groupId: 'group-123' }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('NOT_GROUP_ADMIN');
    expect(updateGroup).not.toHaveBeenCalled();
  });

  it('rejects an invalid planning_style value with 400', async () => {
    (getUserGroupRole as jest.Mock).mockResolvedValue('admin');

    const response = await PATCH(patchRequest({ planning_style: 'proposal-mode' }, 'admin-user'), {
      params: Promise.resolve({ groupId: 'group-123' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
    expect(updateGroup).not.toHaveBeenCalled();
  });
});
