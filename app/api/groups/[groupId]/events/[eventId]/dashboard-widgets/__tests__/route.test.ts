/**
 * @jest-environment node
 */
import { GET, PATCH, DELETE } from '../route';
import * as svc from '@/lib/services/dashboardWidgetsService';
import * as authLib from '@/lib/api/auth';

jest.mock('@/lib/services/dashboardWidgetsService');
jest.mock('@/lib/api/auth');

const makeRequest = (body?: any) => ({ headers: { get: () => null }, json: async () => body ?? {} } as any);
const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1' });
const layout = [{ widget_key: 'photos', position: 1, visible: true }];

describe('event dashboard-widgets route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
  });

  it.each([
    ['GET', GET],
    ['PATCH', PATCH],
    ['DELETE', DELETE],
  ] as const)('%s returns 401 without auth', async (_n, handler) => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue(null);
    const res = await handler(makeRequest({ widgets: [] }), { params });
    expect(res.status).toBe(401);
  });

  it('GET returns data and customized', async () => {
    (svc.getEventWidgetLayout as jest.Mock).mockResolvedValue({ success: true, data: layout, customized: true });
    const res = await GET(makeRequest(), { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(layout);
    expect(json.customized).toBe(true);
    expect(svc.getEventWidgetLayout).toHaveBeenCalledWith('group-1', 'event-1', 'user-1');
  });

  it('GET maps FORBIDDEN to 403 and NOT_FOUND to 404', async () => {
    (svc.getEventWidgetLayout as jest.Mock).mockResolvedValueOnce({ success: false, error: 'x', errorCode: 'FORBIDDEN' });
    expect((await GET(makeRequest(), { params })).status).toBe(403);
    (svc.getEventWidgetLayout as jest.Mock).mockResolvedValueOnce({ success: false, error: 'x', errorCode: 'NOT_FOUND' });
    expect((await GET(makeRequest(), { params })).status).toBe(404);
  });

  it('PATCH rejects a non-array body with 400', async () => {
    const res = await PATCH(makeRequest({ widgets: 'no' }), { params });
    expect(res.status).toBe(400);
    expect(svc.updateEventWidgetLayout).not.toHaveBeenCalled();
  });

  it('PATCH saves and returns customized true', async () => {
    (svc.updateEventWidgetLayout as jest.Mock).mockResolvedValue({ success: true, data: layout, message: 'ok' });
    const res = await PATCH(makeRequest({ widgets: layout }), { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.customized).toBe(true);
    expect(svc.updateEventWidgetLayout).toHaveBeenCalledWith('group-1', 'event-1', 'user-1', layout);
  });

  it('PATCH maps VALIDATION_ERROR to 400', async () => {
    (svc.updateEventWidgetLayout as jest.Mock).mockResolvedValue({
      success: false,
      error: 'INVALID_WIDGET_LAYOUT',
      errorCode: 'VALIDATION_ERROR',
    });
    const res = await PATCH(makeRequest({ widgets: [] }), { params });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.errorCode).toBe('VALIDATION_ERROR');
  });

  it('DELETE resets and returns customized false', async () => {
    (svc.resetEventWidgetLayout as jest.Mock).mockResolvedValue({ success: true, data: layout, message: 'reset' });
    const res = await DELETE(makeRequest(), { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.customized).toBe(false);
  });

  it('DELETE maps NOT_FOUND to 404 and internal errors to 500', async () => {
    (svc.resetEventWidgetLayout as jest.Mock).mockResolvedValueOnce({ success: false, error: 'x', errorCode: 'NOT_FOUND' });
    expect((await DELETE(makeRequest(), { params })).status).toBe(404);
    (svc.resetEventWidgetLayout as jest.Mock).mockResolvedValueOnce({ success: false, error: 'x', errorCode: 'INTERNAL_ERROR' });
    expect((await DELETE(makeRequest(), { params })).status).toBe(500);
  });
});
