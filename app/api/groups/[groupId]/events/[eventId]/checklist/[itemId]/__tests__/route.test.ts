/**
 * @jest-environment node
 */
import { PATCH, DELETE } from '../route';
import * as checklistService from '@/lib/services/eventChecklistService';
import * as jwt from '@/lib/auth/jwt';

jest.mock('@/lib/services/eventChecklistService');
jest.mock('@/lib/auth/jwt');

function makeRequest(options: { authHeader?: string; body?: any } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
    json: async () => options.body ?? {},
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1', itemId: 'item-1' });

describe('PATCH /api/groups/:groupId/events/:eventId/checklist/:itemId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await PATCH(makeRequest({ body: { is_checked: true } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no valid fields are provided', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    const res = await PATCH(makeRequest({ authHeader: 'Bearer good-token', body: {} }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 200 on a successful check toggle', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (checklistService.updateChecklistItem as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'item-1', is_checked: true },
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { is_checked: true } }),
      { params }
    );
    expect(res.status).toBe(200);
  });

  it('returns 403 when the service reports FORBIDDEN', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (checklistService.updateChecklistItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Only the assignee or a group admin can check off this item',
      errorCode: 'FORBIDDEN',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { is_checked: true } }),
      { params }
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when the item does not exist', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (checklistService.updateChecklistItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Checklist item not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'x' } }),
      { params }
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/groups/:groupId/events/:eventId/checklist/:itemId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful delete', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('creator-1');
    (checklistService.deleteChecklistItem as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Checklist item deleted',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
  });

  it('returns 403 for a non-creator, non-admin', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('random-member');
    (checklistService.deleteChecklistItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Only the creator or a group admin can delete this item',
      errorCode: 'FORBIDDEN',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(403);
  });
});
