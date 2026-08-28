import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/calendar/google/callback';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

jest.mock('@/lib/api/auth', () => ({
  getUserIdFromRequest: jest.fn(),
}));

jest.mock('@/lib/db/client', () => ({
  getClient: jest.fn(),
}));

import { DELETE as disconnectDELETE } from '@/app/api/calendar/google/disconnect/route';
import { GET as statusGET } from '@/app/api/calendar/google/status/route';
import { syncUserAvailability } from '@/lib/services/calendarSyncService';
import { encrypt } from '@/lib/encryption/crypto';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { getClient } from '@/lib/db/client';

/**
 * Integration test: full disconnect flow (real disconnect + status routes, mocked DB
 * client) and the refresh-failure -> needs_reauth flow (Story 3.8 Task 5), exercising
 * the real service functions rather than mocking the service layer.
 */
describe('Google Calendar disconnect / re-auth flow (integration)', () => {
  const mockClient = { query: jest.fn(), release: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    (global as any).fetch = jest.fn();
  });

  it('disconnect -> deletes connection + cached blocks -> status reflects not connected (AC1)', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // DELETE calendar_connections
      .mockResolvedValueOnce(undefined) // DELETE google_calendar_busy_blocks
      .mockResolvedValueOnce(undefined); // COMMIT

    const disconnectResponse = await disconnectDELETE(
      new NextRequest(new URL('http://localhost:3000/api/calendar/google/disconnect'), { method: 'DELETE' })
    );
    expect(disconnectResponse.status).toBe(200);

    const deleteCalls = mockClient.query.mock.calls.map((call: any[]) => call[0]);
    expect(deleteCalls.some((sql: string) => /DELETE FROM calendar_connections/.test(sql))).toBe(true);
    expect(deleteCalls.some((sql: string) => /DELETE FROM google_calendar_busy_blocks/.test(sql))).toBe(true);

    mockClient.query.mockResolvedValueOnce({ rows: [] }); // status: no connection row
    const statusResponse = await statusGET(
      new NextRequest(new URL('http://localhost:3000/api/calendar/google/status'))
    );
    const statusData = await statusResponse.json();

    expect(statusData.data).toEqual({ connected: false });
  });

  it('a failed token refresh during sync sets needs_reauth, surfaced by the status endpoint', async () => {
    // syncUserAvailability: look up the active connection (a genuinely encrypted refresh
    // token, so decrypt() succeeds), then fail to refresh the access token against Google.
    mockClient.query.mockResolvedValueOnce({
      rows: [{ refresh_token_encrypted: encrypt('stale-refresh-token') }],
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });
    mockClient.query.mockResolvedValueOnce(undefined); // UPDATE needs_reauth = true

    const syncResult = await syncUserAvailability('user-1');
    expect(syncResult.success).toBe(false);

    const updateCall = mockClient.query.mock.calls.find((call: any[]) =>
      typeof call[0] === 'string' && call[0].includes('SET needs_reauth = true')
    );
    expect(updateCall).toBeTruthy();
    expect(updateCall![1]).toEqual(['user-1']);

    // Status endpoint now reflects needs_reauth (AC3/AC4)
    mockClient.query.mockResolvedValueOnce({
      rows: [{ connected_email: 'user@example.com', needs_reauth: true }],
    });
    const statusResponse = await statusGET(
      new NextRequest(new URL('http://localhost:3000/api/calendar/google/status'))
    );
    const statusData = await statusResponse.json();

    expect(statusData.data.needsReauth).toBe(true);
  });
});
