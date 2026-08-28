import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { initiateConnect } from '@/lib/services/calendarConnectionService';

const STATE_COOKIE = 'google_oauth_state';
const STATE_COOKIE_MAX_AGE_SECONDS = 600; // 10 minutes -- long enough for a user to complete Google's consent screen

/**
 * GET /api/calendar/google/connect
 * Initiates Google Calendar OAuth: redirects to Google's consent screen with a signed
 * CSRF `state` param (AC1), stored in a short-lived httpOnly cookie for callback validation.
 */
export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED',
        errorCode: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  try {
    const { url, state } = initiateConnect();

    const response = NextResponse.redirect(url);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
      path: '/',
    });
    return response;
  } catch (error: any) {
    console.error('Error initiating Google Calendar OAuth connect:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to start Google Calendar connection',
        error: error.message,
        errorCode: 'OAUTH_CONFIG_ERROR',
      },
      { status: 500 }
    );
  }
}
