import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { getConnectionStatus } from '@/lib/services/calendarConnectionService';

/**
 * GET /api/calendar/google/status
 * Returns the current user's Google Calendar connection state (AC3), so settings UI
 * can render "Connected" + email vs. a "Connect" button without the connect/callback
 * routes themselves returning JSON (they redirect the browser through Google).
 */
export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
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

  const result = await getConnectionStatus(userId);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: result.message,
        error: result.error,
        errorCode: result.errorCode,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: result.data }, { status: 200 });
}
