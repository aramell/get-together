/**
 * @jest-environment node
 */
import { PATCH, DELETE } from '../route';
import * as timelineService from '@/lib/services/eventTimelineService';
import * as authLib from '@/lib/api/auth';

jest.mock('@/lib/services/eventTimelineService');
jest.mock('@/lib/api/auth');

function makeRequest(options: { authHeader?: string; body?: any } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
    json: async () => options.body ?? {},
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1', itemId: 'item-1' });

describe('PATCH /api/groups/:groupId/events/:eventId/timeline/:itemId', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await PATCH(makeRequest({ body: { title: 'Updated' } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no valid fields are provided', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    const res = await PATCH(makeRequest({ authHeader: 'Bearer good-token', body: {} }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 200 on a successful update', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (timelineService.updateTimelineItem as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'item-1', title: 'Updated' },
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'Updated' } }),
      { params }
    );
    expect(res.status).toBe(200);
  });

  it('returns 403 when the service reports FORBIDDEN', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (timelineService.updateTimelineItem as jest.Mock).mockResolvedValue({
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
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (timelineService.updateTimelineItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Timeline item not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'x' } }),
      { params }
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 when the service reports VALIDATION_ERROR', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (timelineService.updateTimelineItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'A valid item time is required',
      errorCode: 'VALIDATION_ERROR',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { item_time: 'bad' } }),
      { params }
    );
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/groups/:groupId/events/:eventId/timeline/:itemId', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful delete', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('creator-1');
    (timelineService.deleteTimelineItem as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Timeline item deleted',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
  });

  it('returns 403 for a non-creator, non-admin', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('random-member');
    (timelineService.deleteTimelineItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Only the creator or a group admin can delete this item',
      errorCode: 'FORBIDDEN',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the item does not exist', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (timelineService.deleteTimelineItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Timeline item not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});
