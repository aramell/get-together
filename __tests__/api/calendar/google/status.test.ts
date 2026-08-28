import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/api/auth', () => ({
  getUserIdFromRequest: jest.fn(),
}));

jest.mock('@/lib/services/calendarConnectionService', () => ({
  getConnectionStatus: jest.fn(),
}));

import { GET } from '@/app/api/calendar/google/status/route';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { getConnectionStatus } from '@/lib/services/calendarConnectionService';

describe('GET /api/calendar/google/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await GET(new NextRequest(new URL('http://localhost:3000/api/calendar/google/status')));

    expect(response.status).toBe(401);
  });

  it('returns connection status for the authenticated user (AC3)', async () => {
    (getUserIdFromRequest as jest.Mock).mockResolvedValue('user-1');
    (getConnectionStatus as jest.Mock).mockResolvedValue({
      success: true,
      data: { connected: true, connectedEmail: 'user@example.com', needsReauth: false },
    });

    const response = await GET(new NextRequest(new URL('http://localhost:3000/api/calendar/google/status')));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toEqual({ connected: true, connectedEmail: 'user@example.com', needsReauth: false });
    expect(getConnectionStatus).toHaveBeenCalledWith('user-1');
  });

  it('returns 500 when the service call fails', async () => {
    (getUserIdFromRequest as jest.Mock).mockResolvedValue('user-1');
    (getConnectionStatus as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to fetch calendar connection status',
      errorCode: 'INTERNAL_ERROR',
    });

    const response = await GET(new NextRequest(new URL('http://localhost:3000/api/calendar/google/status')));

    expect(response.status).toBe(500);
  });
});
