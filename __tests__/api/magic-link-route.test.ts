/**
 * @jest-environment node
 *
 * Overrides the project's default jsdom environment (jest.config.js) for this
 * file only -- jsdom's built-in Response has no static .json(), which
 * NextResponse.json() needs. Pre-existing gap in the default test env (see
 * Story 9.1's __tests__/api/sms-request.test.ts for the same override and
 * the baseline failures it documents).
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/magicLinkService', () => ({
  signInViaMagicLink: jest.fn(),
}));

import { POST } from '@/app/api/auth/magic/route';
import { signInViaMagicLink } from '@/lib/services/magicLinkService';

const mockSignInViaMagicLink = signInViaMagicLink as jest.MockedFunction<typeof signInViaMagicLink>;

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/auth/magic', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/magic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200, sets session cookies, and returns the redirect path on success (AC7)', async () => {
    mockSignInViaMagicLink.mockResolvedValue({
      success: true,
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      redirectPath: '/groups/group-1',
    });

    const response = await POST(makeRequest({ token: 'raw-token' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.redirectPath).toBe('/groups/group-1');

    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain('accessToken=access-token');
  });

  it('sets accessToken, idToken, and refreshToken as HttpOnly cookies', async () => {
    mockSignInViaMagicLink.mockResolvedValue({
      success: true,
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      redirectPath: '/groups',
    });

    const response = await POST(makeRequest({ token: 'raw-token' }));

    expect(response.cookies.get('accessToken')?.value).toBe('access-token');
    expect(response.cookies.get('idToken')?.value).toBe('id-token');
    expect(response.cookies.get('refreshToken')?.value).toBe('refresh-token');
  });

  it('returns 410 for an invalid/used/expired token without setting cookies (AC6)', async () => {
    mockSignInViaMagicLink.mockResolvedValue({
      success: false,
      errorCode: 'INVALID_OR_EXPIRED_TOKEN',
    });

    const response = await POST(makeRequest({ token: 'bad-token' }));
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.success).toBe(false);
    expect(response.cookies.get('accessToken')).toBeUndefined();
  });

  it('returns 422 for a missing token', async () => {
    const response = await POST(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
    expect(mockSignInViaMagicLink).not.toHaveBeenCalled();
  });

  it('returns 500 when the sign-in flow throws unexpectedly', async () => {
    mockSignInViaMagicLink.mockRejectedValue(new Error('cognito unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(makeRequest({ token: 'raw-token' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);

    consoleSpy.mockRestore();
  });

  it('returns 500 for an internal error result from the service', async () => {
    mockSignInViaMagicLink.mockResolvedValue({
      success: false,
      errorCode: 'INTERNAL_SERVER_ERROR',
    });

    const response = await POST(makeRequest({ token: 'raw-token' }));

    expect(response.status).toBe(500);
  });
});
