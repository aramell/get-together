/**
 * @jest-environment node
 */
import { POST, DELETE } from '../route';
import * as logisticsService from '@/lib/services/eventLogisticsService';
import * as jwt from '@/lib/auth/jwt';

jest.mock('@/lib/services/eventLogisticsService');
jest.mock('@/lib/auth/jwt');

function makeRequest(options: { authHeader?: string } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1', itemId: 'item-1' });

describe('POST /api/groups/:groupId/events/:eventId/logistics/:itemId/claims', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await POST(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 201 on a successful claim', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('rider-1');
    (logisticsService.claimLogisticsSeat as jest.Mock).mockResolvedValue({
      success: true,
      data: { user_id: 'rider-1', claimed_at: 'now' },
      message: 'Seat claimed',
    });

    const res = await POST(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(201);
  });

  it('returns 409 when capacity is already reached', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('rider-1');
    (logisticsService.claimLogisticsSeat as jest.Mock).mockResolvedValue({
      success: false,
      message: 'All seats have already been claimed',
      errorCode: 'CAPACITY_REACHED',
    });

    const res = await POST(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(409);
  });

  it('returns 409 for a duplicate claim', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('rider-1');
    (logisticsService.claimLogisticsSeat as jest.Mock).mockResolvedValue({
      success: false,
      message: 'You have already claimed a seat on this item',
      errorCode: 'CONFLICT',
    });

    const res = await POST(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(409);
  });

  it('returns 400 when claiming a non-carpool item', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('rider-1');
    (logisticsService.claimLogisticsSeat as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Only carpool items can be claimed',
      errorCode: 'VALIDATION_ERROR',
    });

    const res = await POST(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the item does not exist', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('rider-1');
    (logisticsService.claimLogisticsSeat as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Logistics item not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await POST(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/groups/:groupId/events/:eventId/logistics/:itemId/claims', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 on a successful unclaim', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('rider-1');
    (logisticsService.unclaimLogisticsSeat as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Seat unclaimed',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
  });

  it('returns 404 when the caller has no claim to remove', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('rider-1');
    (logisticsService.unclaimLogisticsSeat as jest.Mock).mockResolvedValue({
      success: false,
      message: "You haven't claimed a seat on this item",
      errorCode: 'NOT_FOUND',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});
