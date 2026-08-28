/**
 * @jest-environment node
 */
import { PATCH, DELETE } from '../route';
import * as logisticsService from '@/lib/services/eventLogisticsService';
import * as jwt from '@/lib/auth/jwt';

jest.mock('@/lib/services/eventLogisticsService');
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

describe('PATCH /api/groups/:groupId/events/:eventId/logistics/:itemId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await PATCH(makeRequest({ body: { title: 'x' } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no valid fields are provided', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    const res = await PATCH(makeRequest({ authHeader: 'Bearer good-token', body: {} }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 200 on a successful metadata edit', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('creator-1');
    (logisticsService.updateLogisticsItem as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'item-1', title: 'New title' },
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'New title' } }),
      { params }
    );
    expect(res.status).toBe(200);
  });

  it('returns 200 on a successful self-claim (assigned_to only)', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('random-member');
    (logisticsService.updateLogisticsItem as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'item-1', assigned_to: 'random-member' },
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { assigned_to: 'random-member' } }),
      { params }
    );
    expect(res.status).toBe(200);
  });

  it('returns 403 when the service reports FORBIDDEN', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('random-member');
    (logisticsService.updateLogisticsItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Only the creator or a group admin can edit this item',
      errorCode: 'FORBIDDEN',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'Hijacked' } }),
      { params }
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when the item does not exist', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (logisticsService.updateLogisticsItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Logistics item not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'x' } }),
      { params }
    );
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/groups/:groupId/events/:eventId/logistics/:itemId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful delete', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('creator-1');
    (logisticsService.deleteLogisticsItem as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Logistics item deleted',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
  });

  it('returns 403 for a non-creator, non-admin', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('random-member');
    (logisticsService.deleteLogisticsItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Only the creator or a group admin can delete this item',
      errorCode: 'FORBIDDEN',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the item does not exist', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (logisticsService.deleteLogisticsItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Logistics item not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});
