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

import { GET as connectGET } from '@/app/api/calendar/google/connect/route';
import { GET as callbackGET } from '@/app/api/calendar/google/callback/route';
import { GET as statusGET } from '@/app/api/calendar/google/status/route';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { getClient } from '@/lib/db/client';

/**
 * Integration test: full connect flow across all three real routes, with only
 * Google's OAuth endpoints and the DB client mocked (per Story 3.5 Task 6 / Dev
 * Notes -- this exercises the real initiateConnect/handleCallback/getConnectionStatus
 * service functions, not mocked service layer).
 */
describe('Google Calendar connect flow (integration)', () => {
  const mockClient = { query: jest.fn(), release: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    (global as any).fetch = jest.fn();
  });

  it('connects: initiate -> Google consent -> callback -> status reflects connected', async () => {
    // Step 1: initiate connect, capture the state cookie the app set
    const connectRequest = new NextRequest(new URL('http://localhost:3000/api/calendar/google/connect'));
    const connectResponse = await connectGET(connectRequest);

    expect(connectResponse.status).toBe(307);
    const location = connectResponse.headers.get('location') || '';
    const state = new URL(location).searchParams.get('state');
    expect(state).toBeTruthy();

    // Step 2: simulate Google redirecting back with ?code=...&state=... plus the state cookie
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'access-token-xyz',
          refresh_token: 'refresh-token-abc',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/calendar.readonly',
          token_type: 'Bearer',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ email: 'user@example.com' }),
      });
    mockClient.query.mockResolvedValueOnce({ rows: [] }); // upsert

    const callbackRequest = new NextRequest(
      new URL(`http://localhost:3000/api/calendar/google/callback?code=auth-code-123&state=${state}`)
    );
    callbackRequest.cookies.set('google_oauth_state', state as string);

    const callbackResponse = await callbackGET(callbackRequest);
    expect(callbackResponse.status).toBe(307);
    expect(callbackResponse.headers.get('location')).toContain('calendar_status=connected');

    // Verify the refresh token was encrypted before storage, never stored in plaintext (AC2)
    const [, upsertParams] = mockClient.query.mock.calls[0];
    expect(upsertParams[1]).not.toContain('refresh-token-abc');

    // Step 3: status endpoint now reflects the connection (AC3)
    mockClient.query.mockResolvedValueOnce({
      rows: [{ connected_email: 'user@example.com', needs_reauth: false }],
    });
    const statusResponse = await statusGET(
      new NextRequest(new URL('http://localhost:3000/api/calendar/google/status'))
    );
    const statusData = await statusResponse.json();

    expect(statusData.data).toEqual({
      connected: true,
      connectedEmail: 'user@example.com',
      needsReauth: false,
    });
  });

  it('rejects a callback whose state does not match the cookie (CSRF protection)', async () => {
    const callbackRequest = new NextRequest(
      new URL('http://localhost:3000/api/calendar/google/callback?code=auth-code-123&state=attacker-state')
    );
    callbackRequest.cookies.set('google_oauth_state', 'real-state');

    const response = await callbackGET(callbackRequest);

    expect(response.headers.get('location')).toContain('calendar_status=error');
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('does not create a connection when the user denies consent (AC4)', async () => {
    const callbackRequest = new NextRequest(
      new URL('http://localhost:3000/api/calendar/google/callback?error=access_denied')
    );

    const response = await callbackGET(callbackRequest);

    expect(response.headers.get('location')).toContain('calendar_status=denied');
    expect(mockClient.query).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
