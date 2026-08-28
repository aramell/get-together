import { NextRequest, NextResponse } from 'next/server';
import { syncAllConnectedUsers } from '@/lib/services/calendarSyncService';

/**
 * POST /api/calendar/sync
 * Triggers a sync pass for every connected Google Calendar user (Story 3.6, AC1).
 * Not user-facing -- invoked by a scheduled external trigger (e.g. EventBridge -> Lambda)
 * on a 2-5 minute interval per Architecture Decision 6a. Protected by a shared secret
 * rather than user auth, since there's no logged-in user driving this request.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CALENDAR_SYNC_SECRET;

  if (!expectedSecret) {
    console.error('CALENDAR_SYNC_SECRET is not configured; refusing to run sync');
    return NextResponse.json(
      {
        success: false,
        message: 'Calendar sync is not configured',
        error: 'SYNC_NOT_CONFIGURED',
        errorCode: 'SYNC_NOT_CONFIGURED',
      },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get('x-sync-secret');
  if (providedSecret !== expectedSecret) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized',
        error: 'UNAUTHORIZED',
        errorCode: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  const result = await syncAllConnectedUsers();

  return NextResponse.json(
    {
      success: true,
      message: result.message,
      data: result.data,
    },
    { status: 200 }
  );
}
