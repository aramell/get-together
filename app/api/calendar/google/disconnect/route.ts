import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { disconnect } from '@/lib/services/calendarConnectionService';

/**
 * DELETE /api/calendar/google/disconnect
 * Disconnects the current user's Google Calendar (Story 3.8, AC1): deletes their
 * calendar_connections row and cached google_calendar_busy_blocks rows.
 */
export async function DELETE(request: NextRequest) {
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

  const result = await disconnect(userId);

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

  return NextResponse.json({ success: true, message: result.message }, { status: 200 });
}
