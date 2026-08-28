import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/calendarSyncService', () => ({
  syncAllConnectedUsers: jest.fn(),
}));

import { POST } from '@/app/api/calendar/sync/route';
import { syncAllConnectedUsers } from '@/lib/services/calendarSyncService';

describe('POST /api/calendar/sync', () => {
  const originalSecret = process.env.CALENDAR_SYNC_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CALENDAR_SYNC_SECRET = 'test-shared-secret';
  });

  afterAll(() => {
    process.env.CALENDAR_SYNC_SECRET = originalSecret;
  });

  function makeRequest(secretHeader?: string) {
    return new NextRequest(new URL('http://localhost:3000/api/calendar/sync'), {
      method: 'POST',
      headers: secretHeader ? new Headers({ 'x-sync-secret': secretHeader }) : new Headers(),
    });
  }

  it('returns 401 when the shared secret header is missing', async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(syncAllConnectedUsers).not.toHaveBeenCalled();
  });

  it('returns 401 when the shared secret header is wrong', async () => {
    const response = await POST(makeRequest('wrong-secret'));

    expect(response.status).toBe(401);
    expect(syncAllConnectedUsers).not.toHaveBeenCalled();
  });

  it('returns 500 when CALENDAR_SYNC_SECRET is not configured server-side', async () => {
    delete process.env.CALENDAR_SYNC_SECRET;

    const response = await POST(makeRequest('anything'));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.errorCode).toBe('SYNC_NOT_CONFIGURED');
    expect(syncAllConnectedUsers).not.toHaveBeenCalled();
  });

  it('runs the sync and returns its result when the secret matches', async () => {
    (syncAllConnectedUsers as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Synced 2 user(s), 0 failed',
      data: { synced: 2, failed: 0, results: [] },
    });

    const response = await POST(makeRequest('test-shared-secret'));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toEqual({ synced: 2, failed: 0, results: [] });
    expect(syncAllConnectedUsers).toHaveBeenCalledTimes(1);
  });
});
