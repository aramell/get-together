/**
 * @jest-environment node
 *
 * Overrides the project's default jsdom environment (jest.config.js) for this
 * file only -- jsdom's built-in Response has no static .json(), which
 * NextResponse.json() needs (see Story 9.1's __tests__/api/sms-request.test.ts
 * for the same override and the baseline failures it documents).
 */
import { GET, POST } from '@/app/api/circles/route';
import { NextRequest } from 'next/server';
import * as authLib from '@/lib/api/auth';
import * as circleService from '@/lib/services/circleService';

jest.mock('@/lib/api/auth');
jest.mock('@/lib/services/circleService');

describe('POST /api/circles', () => {
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a circle with valid data', async () => {
    const mockRequest = {
      json: async () => ({ name: 'Weekend Crew' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.createCircleService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Circle created',
      data: {
        id: 'circle-1',
        name: 'Weekend Crew',
        contactCount: 0,
        createdAt: '2026-06-30T10:00:00Z',
      },
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(201);
    expect(circleService.createCircleService).toHaveBeenCalledWith(mockUserId, {
      name: 'Weekend Crew',
    });
  });

  it('returns 401 when unauthenticated', async () => {
    const mockRequest = {
      json: async () => ({ name: 'Weekend Crew' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await POST(mockRequest);

    expect(response.status).toBe(401);
    expect(circleService.createCircleService).not.toHaveBeenCalled();
  });

  it('returns 422 on validation error (AC4)', async () => {
    const mockRequest = {
      json: async () => ({ name: '' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const response = await POST(mockRequest);

    expect(response.status).toBe(422);
    expect(circleService.createCircleService).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid JSON', async () => {
    const mockRequest = {
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const response = await POST(mockRequest);

    expect(response.status).toBe(400);
  });
});

describe('GET /api/circles', () => {
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists circles for the authenticated user', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.getUserCirclesService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Circles retrieved',
      data: [
        { id: 'circle-1', name: 'Weekend Crew', contactCount: 0, createdAt: '2026-06-30T10:00:00Z' },
      ],
    });

    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('returns 401 when unauthenticated', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await GET(mockRequest);

    expect(response.status).toBe(401);
  });
});
