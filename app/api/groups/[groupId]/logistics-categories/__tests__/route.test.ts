/**
 * @jest-environment node
 */
import { GET, PATCH } from '../route';
import * as service from '@/lib/services/logisticsCategoriesService';
import * as authLib from '@/lib/api/auth';

jest.mock('@/lib/services/logisticsCategoriesService');
jest.mock('@/lib/api/auth');

const makeRequest = (body?: any) => ({ headers: { get: () => null }, json: async () => body ?? {} }) as any;
const params = Promise.resolve({ groupId: 'group-1' });

describe('/api/groups/:groupId/logistics-categories', () => {
  beforeEach(() => jest.resetAllMocks());

  it('GET returns 401 without auth', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue(null);
    expect((await GET(makeRequest(), { params })).status).toBe(401);
  });

  it('GET returns categories and customized flag', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    (service.getLogisticsCategories as jest.Mock).mockResolvedValue({
      success: true,
      data: { categories: [{ key: 'bring', label: 'Bring List', mode: 'single' }], customized: false },
    });
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(200);
    expect((await res.json()).data.customized).toBe(false);
  });

  it('GET returns 403 for a non-member', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    (service.getLogisticsCategories as jest.Mock).mockResolvedValue({ success: false, errorCode: 'FORBIDDEN', message: 'no' });
    expect((await GET(makeRequest(), { params })).status).toBe(403);
  });

  it('PATCH returns 400 when categories is not an array', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    expect((await PATCH(makeRequest({ categories: 'x' }), { params })).status).toBe(400);
  });

  it.each([
    ['FORBIDDEN', 403, 'FORBIDDEN'],
    ['VALIDATION_ERROR', 400, 'VALIDATION_ERROR'],
    ['CATEGORY_IN_USE', 409, 'CATEGORY_IN_USE'],
    ['MODE_LOCKED', 400, 'CATEGORY_IN_USE'],
    ['INTERNAL_ERROR', 500, 'INTERNAL_ERROR'],
  ])('PATCH maps service %s to %i', async (errorCode, status, code) => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    (service.updateLogisticsCategories as jest.Mock).mockResolvedValue({ success: false, errorCode, message: 'msg' });
    const res = await PATCH(makeRequest({ categories: [{ label: 'A', mode: 'single' }] }), { params });
    expect(res.status).toBe(status);
    expect((await res.json()).errorCode).toBe(code);
  });

  it('PATCH returns the saved list', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('u1');
    (service.updateLogisticsCategories as jest.Mock).mockResolvedValue({
      success: true,
      data: { categories: [], customized: true },
      message: 'ok',
    });
    expect((await PATCH(makeRequest({ categories: [{ label: 'A', mode: 'single' }] }), { params })).status).toBe(200);
  });
});
