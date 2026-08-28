import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { handleCallback } from '@/lib/services/calendarConnectionService';

const STATE_COOKIE = 'google_oauth_state';
const SETTINGS_PATH = '/profile';

function redirectToSettings(
  request: NextRequest,
  status: 'connected' | 'denied' | 'error',
  message?: string
): NextResponse {
  const url = new URL(SETTINGS_PATH, request.url);
  url.searchParams.set('calendar_status', status);
  if (message) {
    url.searchParams.set('calendar_message', message);
  }

  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

/**
 * GET /api/calendar/google/callback
 * Validates the CSRF `state` param, exchanges the authorization code for tokens,
 * and redirects back to settings with a success/denial message (AC2, AC4).
 */
export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  const searchParams = request.nextUrl.searchParams;

  // Google redirects with `error=access_denied` (or similar) when the user declines consent (AC4)
  const oauthError = searchParams.get('error');
  if (oauthError) {
    return redirectToSettings(request, 'denied', 'Calendar connection was not completed');
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectToSettings(request, 'error', 'Your connection request expired or was invalid. Please try again.');
  }

  const result = await handleCallback(code, userId);

  if (!result.success) {
    return redirectToSettings(request, 'error', result.message || 'Failed to connect Google Calendar');
  }

  return redirectToSettings(request, 'connected');
}
