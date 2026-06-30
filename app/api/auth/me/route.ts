import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';

/**
 * GET /api/auth/me
 * Returns current user info if authenticated via cookies
 * Used by frontend to verify authentication when tokens aren't in localStorage
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          authenticated: false,
          message: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        userId,
        message: 'User is authenticated',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Auth ME] Error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        message: 'Error checking authentication',
      },
      { status: 500 }
    );
  }
}
