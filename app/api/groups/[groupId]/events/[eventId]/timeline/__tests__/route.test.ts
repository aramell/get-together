/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import * as timelineService from '@/lib/services/eventTimelineService';
import * as jwt from '@/lib/auth/jwt';

jest.mock('@/lib/services/eventTimelineService');
jest.mock('@/lib/auth/jwt');

function makeRequest(options: { authHeader?: string; body?: any } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
    json: async () => options.body ?? {},
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1' });

describe('GET /api/groups/:groupId/events/:eventId/timeline', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue(null);
    const res = await GET(makeRequest({ authHeader: 'Bearer bad-token' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 with items on success', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (timelineService.getTimelineItems as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ id: 'item-1', title: 'Arrive' }],
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('returns 403 when the service reports FORBIDDEN', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (timelineService.getTimelineItems as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Not a member',
      errorCode: 'FORBIDDEN',
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the event does not exist', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (timelineService.getTimelineItems as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Event not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/groups/:groupId/events/:eventId/timeline', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await POST(makeRequest({ body: { title: 'Arrive', item_time: '2026-08-15T18:00' } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { item_time: '2026-08-15T18:00' } }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when item_time is missing', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'Arrive' } }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 with the created item on success', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (timelineService.addTimelineItem as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Timeline item added',
      data: { id: 'item-1', title: 'Arrive' },
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'Arrive', item_time: '2026-08-15T18:00' } }),
      { params }
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.title).toBe('Arrive');
  });

  it('returns 400 when the service reports VALIDATION_ERROR', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (timelineService.addTimelineItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'A valid item time is required',
      errorCode: 'VALIDATION_ERROR',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { title: 'Arrive', item_time: 'bad' } }),
      { params }
    );
    expect(res.status).toBe(400);
  });
});
