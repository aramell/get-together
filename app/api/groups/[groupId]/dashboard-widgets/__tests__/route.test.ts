/**
 * @jest-environment node
 */
import { GET, PATCH } from '../route';
import * as dashboardWidgetsService from '@/lib/services/dashboardWidgetsService';
import * as queries from '@/lib/db/queries';
import * as authLib from '@/lib/api/auth';

jest.mock('@/lib/services/dashboardWidgetsService');
jest.mock('@/lib/db/queries');
jest.mock('@/lib/api/auth');

function makeRequest(options: { authHeader?: string; body?: any } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
    json: async () => options.body ?? {},
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1' });

describe('GET /api/groups/:groupId/dashboard-widgets', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-member', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (queries.getUserGroupRole as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });

    expect(res.status).toBe(403);
    expect(dashboardWidgetsService.getWidgetLayout).not.toHaveBeenCalled();
  });

  it('returns 200 with the layout for a group member', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (queries.getUserGroupRole as jest.Mock).mockResolvedValue('member');
    (dashboardWidgetsService.getWidgetLayout as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ widget_key: 'photos', position: 1, visible: true }],
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('returns 500 when the service reports failure', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (queries.getUserGroupRole as jest.Mock).mockResolvedValue('admin');
    (dashboardWidgetsService.getWidgetLayout as jest.Mock).mockResolvedValue({
      success: false,
      error: 'db down',
      errorCode: 'INTERNAL_ERROR',
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/groups/:groupId/dashboard-widgets', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await PATCH(makeRequest({ body: { widgets: [] } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when widgets is not an array', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { widgets: 'not-an-array' } }),
      { params }
    );

    expect(res.status).toBe(400);
    expect(dashboardWidgetsService.updateWidgetLayout).not.toHaveBeenCalled();
  });

  it('returns 403 when the service reports FORBIDDEN (non-member)', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (dashboardWidgetsService.updateWidgetLayout as jest.Mock).mockResolvedValue({
      success: false,
      error: 'You must be a group member to change the dashboard layout',
      errorCode: 'FORBIDDEN',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { widgets: [{ widget_key: 'photos', position: 1, visible: true }] } }),
      { params }
    );

    expect(res.status).toBe(403);
  });

  it('returns 400 when the service reports VALIDATION_ERROR', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (dashboardWidgetsService.updateWidgetLayout as jest.Mock).mockResolvedValue({
      success: false,
      error: 'All 5 widgets must be present',
      errorCode: 'VALIDATION_ERROR',
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { widgets: [{ widget_key: 'photos', position: 1, visible: true }] } }),
      { params }
    );

    expect(res.status).toBe(400);
  });

  it('returns 200 with the updated layout on success', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    const updated = [{ widget_key: 'photos', position: 2, visible: true }];
    (dashboardWidgetsService.updateWidgetLayout as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Dashboard layout updated',
      data: updated,
    });

    const res = await PATCH(
      makeRequest({ authHeader: 'Bearer good-token', body: { widgets: updated } }),
      { params }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(updated);
  });
});
