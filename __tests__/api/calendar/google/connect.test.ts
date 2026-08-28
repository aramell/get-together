import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/api/auth', () => ({
  getUserIdFromRequest: jest.fn(),
}));

jest.mock('@/lib/services/calendarConnectionService', () => ({
  initiateConnect: jest.fn(),
}));

import { GET } from '@/app/api/calendar/google/connect/route';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { initiateConnect } from '@/lib/services/calendarConnectionService';

describe('GET /api/calendar/google/connect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when the user is not authenticated', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue(null);

    const request = new NextRequest(new URL('http://localhost:3000/api/calendar/google/connect'));
    const response = await GET(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.errorCode).toBe('UNAUTHORIZED');
    expect(initiateConnect).not.toHaveBeenCalled();
  });

  it('redirects to the Google consent URL and sets a state cookie (AC1)', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (initiateConnect as jest.Mock).mockReturnValue({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&state=xyz',
      state: 'xyz',
    });

    const request = new NextRequest(new URL('http://localhost:3000/api/calendar/google/connect'));
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&state=xyz'
    );

    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/google_oauth_state=xyz/);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it('returns 500 when Google OAuth is not configured', async () => {
    (getUserIdFromRequest as jest.Mock).mockReturnValue('user-1');
    (initiateConnect as jest.Mock).mockImplementation(() => {
      throw new Error('Google OAuth is not configured');
    });

    const request = new NextRequest(new URL('http://localhost:3000/api/calendar/google/connect'));
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.errorCode).toBe('OAUTH_CONFIG_ERROR');
  });
});
