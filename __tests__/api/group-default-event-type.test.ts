/** @jest-environment node */
import { PATCH } from '@/app/api/groups/[groupId]/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/groupServerService', () => ({ getGroupDetailsFromDb: jest.fn() }));
jest.mock('@/lib/db/queries', () => ({
  updateGroup: jest.fn(),
  getUserGroupRole: jest.fn(),
  getGroupById: jest.fn(),
  deleteGroup: jest.fn(),
}));

const q = require('@/lib/db/queries');

const patch = (body: any) =>
  PATCH(
    { json: async () => body, headers: new Headers({ 'x-user-id': 'u1' }) } as unknown as NextRequest,
    { params: Promise.resolve({ groupId: 'g1' }) }
  );

describe('PATCH /api/groups/[groupId] default_event_type (Story 14.7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    q.getGroupById.mockResolvedValue({ id: 'g1' });
    q.getUserGroupRole.mockResolvedValue('admin');
    q.updateGroup.mockResolvedValue({ id: 'g1', default_event_type: 'dinner' });
  });

  it('stores a valid type for an admin', async () => {
    const res = await patch({ default_event_type: 'dinner' });
    expect(res.status).toBe(200);
    expect(q.updateGroup).toHaveBeenCalledWith('g1', { default_event_type: 'dinner' });
  });

  it('null clears the default', async () => {
    const res = await patch({ default_event_type: null });
    expect(res.status).toBe(200);
    expect(q.updateGroup).toHaveBeenCalledWith('g1', { default_event_type: null });
  });

  it('rejects an unknown type with 400', async () => {
    const res = await patch({ default_event_type: 'rave' });
    expect(res.status).toBe(400);
    expect(q.updateGroup).not.toHaveBeenCalled();
  });

  it('rejects a non-admin with 403', async () => {
    q.getUserGroupRole.mockResolvedValue('member');
    const res = await patch({ default_event_type: 'dinner' });
    expect(res.status).toBe(403);
    expect(q.updateGroup).not.toHaveBeenCalled();
  });
});
