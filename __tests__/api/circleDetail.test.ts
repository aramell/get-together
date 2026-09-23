/**
 * @jest-environment node
 *
 * Overrides the project's default jsdom environment (jest.config.js) for this
 * file only -- jsdom's built-in Response has no static .json(), which
 * NextResponse.json() needs (see __tests__/api/circles.test.ts for the same
 * override).
 */
import { GET, PATCH, DELETE } from '@/app/api/circles/[circleId]/route';
import { NextRequest } from 'next/server';
import * as authLib from '@/lib/api/auth';
import * as circleService from '@/lib/services/circleService';

jest.mock('@/lib/api/auth');
jest.mock('@/lib/services/circleService');

describe('GET /api/circles/[circleId]', () => {
  const mockUserId = 'user-456';
  const circleId = 'circle-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the circle detail (AC3)', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.getCircleDetailService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Circle retrieved',
      data: {
        id: circleId,
        name: 'Weekend Crew',
        contacts: [],
        createdAt: '2026-06-30T10:00:00Z',
        updatedAt: '2026-06-30T10:00:00Z',
      },
    });

    const response = await GET(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(200);
    expect(circleService.getCircleDetailService).toHaveBeenCalledWith(circleId, mockUserId);
  });

  it('returns 401 when unauthenticated', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await GET(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(401);
    expect(circleService.getCircleDetailService).not.toHaveBeenCalled();
  });

  it('returns 404 when the circle is not found', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.getCircleDetailService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Circle not found',
      errorCode: 'NOT_FOUND',
    });

    const response = await GET(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(404);
  });

  it('returns 403 when the circle belongs to another user (AC6)', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.getCircleDetailService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Not authorized',
      errorCode: 'FORBIDDEN',
    });

    const response = await GET(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(403);
  });
});

describe('PATCH /api/circles/[circleId]', () => {
  const mockUserId = 'user-456';
  const circleId = 'circle-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renames the circle (AC4)', async () => {
    const mockRequest = {
      json: async () => ({ name: 'Trivia Night Crew' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.updateCircleNameService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Circle name updated',
      data: { id: circleId, name: 'Trivia Night Crew', updatedAt: '2026-07-01T09:00:00Z' },
    });

    const response = await PATCH(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(200);
    expect(circleService.updateCircleNameService).toHaveBeenCalledWith(circleId, mockUserId, {
      name: 'Trivia Night Crew',
    });
  });

  it('returns 401 when unauthenticated', async () => {
    const mockRequest = { json: async () => ({ name: 'x' }) } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await PATCH(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(401);
    expect(circleService.updateCircleNameService).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid JSON', async () => {
    const mockRequest = {
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const response = await PATCH(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(400);
  });

  it('returns 422 on a validation error', async () => {
    const mockRequest = { json: async () => ({ name: '' }) } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.updateCircleNameService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Circle name is required',
      errorCode: 'VALIDATION_ERROR',
    });

    const response = await PATCH(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(422);
  });

  it('returns 403 when the circle belongs to another user (AC6)', async () => {
    const mockRequest = { json: async () => ({ name: 'x' }) } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.updateCircleNameService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Not authorized',
      errorCode: 'FORBIDDEN',
    });

    const response = await PATCH(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/circles/[circleId]', () => {
  const mockUserId = 'user-456';
  const circleId = 'circle-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the circle (AC5)', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.deleteCircleService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Circle deleted',
    });

    const response = await DELETE(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(200);
    expect(circleService.deleteCircleService).toHaveBeenCalledWith(circleId, mockUserId);
  });

  it('returns 401 when unauthenticated', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await DELETE(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(401);
    expect(circleService.deleteCircleService).not.toHaveBeenCalled();
  });

  it('returns 404 when the circle is not found', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.deleteCircleService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Circle not found',
      errorCode: 'NOT_FOUND',
    });

    const response = await DELETE(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(404);
  });

  it('returns 403 when the circle belongs to another user (AC6)', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.deleteCircleService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Not authorized',
      errorCode: 'FORBIDDEN',
    });

    const response = await DELETE(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(403);
  });
});
