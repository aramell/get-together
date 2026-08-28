import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/api/auth', () => ({
  getUserIdFromRequest: jest.fn(),
}));

jest.mock('@/lib/services/calendarConnectionService', () => ({
  disconnect: jest.fn(),
}));

import { DELETE } from '@/app/api/calendar/google/disconnect/route';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { disconnect } from '@/lib/services/calendarConnectionService';

describe('DELETE /api/calendar/google/disconnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue(null);

    const response = await DELETE(
      new NextRequest(new URL('http://localhost:3000/api/calendar/google/disconnect'), { method: 'DELETE' })
    );

    expect(response.status).toBe(401);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('disconnects the authenticated user (AC1)', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (disconnect as jest.Mock).mockResolvedValue({ success: true, message: 'Google Calendar disconnected' });

    const response = await DELETE(
      new NextRequest(new URL('http://localhost:3000/api/calendar/google/disconnect'), { method: 'DELETE' })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(disconnect).toHaveBeenCalledWith('user-1');
  });

  it('returns 500 when the service call fails', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (disconnect as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to disconnect Google Calendar',
      errorCode: 'INTERNAL_ERROR',
    });

    const response = await DELETE(
      new NextRequest(new URL('http://localhost:3000/api/calendar/google/disconnect'), { method: 'DELETE' })
    );

    expect(response.status).toBe(500);
  });
});
