import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/api/auth', () => ({
  getUserIdFromRequest: jest.fn(),
}));

jest.mock('@/lib/services/calendarConnectionService', () => ({
  handleCallback: jest.fn(),
}));

import { GET } from '@/app/api/calendar/google/callback/route';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { handleCallback } from '@/lib/services/calendarConnectionService';

function makeRequest(query: string, cookies?: Record<string, string>) {
  const request = new NextRequest(new URL(`http://localhost:3000/api/calendar/google/callback${query}`));
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      request.cookies.set(name, value);
    }
  }
  return request;
}

describe('GET /api/calendar/google/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to login when the user is not authenticated', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue(null);

    const response = await GET(makeRequest('?code=abc&state=xyz'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/login');
  });

  it('redirects with calendar_status=denied when Google reports a consent denial (AC4)', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');

    const response = await GET(makeRequest('?error=access_denied'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location') || '';
    expect(location).toContain('/profile');
    expect(location).toContain('calendar_status=denied');
    expect(handleCallback).not.toHaveBeenCalled();
  });

  it('does not create a partial connection record on denial (AC4)', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');

    await GET(makeRequest('?error=access_denied'));

    expect(handleCallback).not.toHaveBeenCalled();
  });

  it('redirects with calendar_status=error when state is missing or mismatched (CSRF protection, AC1)', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');

    const response = await GET(
      makeRequest('?code=abc&state=wrong-state', { google_oauth_state: 'expected-state' })
    );

    expect(response.status).toBe(307);
    const location = response.headers.get('location') || '';
    expect(location).toContain('calendar_status=error');
    expect(handleCallback).not.toHaveBeenCalled();
  });

  it('redirects with calendar_status=error when the state cookie is absent', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');

    const response = await GET(makeRequest('?code=abc&state=some-state'));

    const location = response.headers.get('location') || '';
    expect(location).toContain('calendar_status=error');
    expect(handleCallback).not.toHaveBeenCalled();
  });

  it('exchanges the code and redirects with calendar_status=connected on success', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (handleCallback as jest.Mock).mockResolvedValue({
      success: true,
      data: { connectedEmail: 'user@example.com' },
    });

    const response = await GET(
      makeRequest('?code=auth-code&state=matching-state', { google_oauth_state: 'matching-state' })
    );

    expect(handleCallback).toHaveBeenCalledWith('auth-code', 'user-1');
    const location = response.headers.get('location') || '';
    expect(location).toContain('calendar_status=connected');
  });

  it('redirects with calendar_status=error when handleCallback fails', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (handleCallback as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to connect Google Calendar',
    });

    const response = await GET(
      makeRequest('?code=auth-code&state=matching-state', { google_oauth_state: 'matching-state' })
    );

    const location = response.headers.get('location') || '';
    expect(location).toContain('calendar_status=error');
  });

  it('clears the state cookie after processing the callback', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (handleCallback as jest.Mock).mockResolvedValue({
      success: true,
      data: { connectedEmail: 'user@example.com' },
    });

    const response = await GET(
      makeRequest('?code=auth-code&state=matching-state', { google_oauth_state: 'matching-state' })
    );

    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/google_oauth_state=;/);
  });
});
