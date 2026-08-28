/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import * as logisticsService from '@/lib/services/eventLogisticsService';
import * as authLib from '@/lib/api/auth';

jest.mock('@/lib/services/eventLogisticsService');
jest.mock('@/lib/api/auth');

function makeRequest(options: { authHeader?: string; body?: any } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
    json: async () => options.body ?? {},
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1' });

describe('GET /api/groups/:groupId/events/:eventId/logistics', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 with items on success', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (logisticsService.getLogisticsItems as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ id: 'item-1', category: 'bring', title: 'Speaker', claims: [], claim_count: 0 }],
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('returns 403 for a non-member', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (logisticsService.getLogisticsItems as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Not a member',
      errorCode: 'FORBIDDEN',
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the event does not exist', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (logisticsService.getLogisticsItems as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Event not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/groups/:groupId/events/:eventId/logistics', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await POST(makeRequest({ body: { category: 'bring', title: 'Speaker' } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid category', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { category: 'invalid', title: 'Speaker' } }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when title is missing', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { category: 'bring' } }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 on successful bring-item creation', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (logisticsService.addLogisticsItem as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'item-1', category: 'bring', title: 'Speaker' },
      message: 'Logistics item added',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { category: 'bring', title: 'Speaker' } }),
      { params }
    );
    expect(res.status).toBe(201);
  });

  it('returns 201 on successful carpool-item creation with capacity', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (logisticsService.addLogisticsItem as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'item-1', category: 'carpool', title: 'Ride', capacity: 4 },
      message: 'Logistics item added',
    });

    const res = await POST(
      makeRequest({
        authHeader: 'Bearer good-token',
        body: { category: 'carpool', title: 'Ride', assigned_to: 'driver-1', capacity: 4 },
      }),
      { params }
    );
    expect(res.status).toBe(201);
    expect(logisticsService.addLogisticsItem).toHaveBeenCalledWith(
      'event-1', 'group-1', 'user-1', 'carpool', 'Ride', 'driver-1', 4
    );
  });

  it('returns 400 when the service reports VALIDATION_ERROR (e.g. carpool without capacity)', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (logisticsService.addLogisticsItem as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Carpool items require a positive integer capacity',
      errorCode: 'VALIDATION_ERROR',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { category: 'carpool', title: 'Ride', assigned_to: 'driver-1' } }),
      { params }
    );
    expect(res.status).toBe(400);
  });
});
