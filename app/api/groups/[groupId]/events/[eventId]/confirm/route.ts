import { NextRequest, NextResponse } from 'next/server';
import { confirmEvent } from '@/lib/services/eventService';

/**
 * POST /api/groups/:groupId/events/:eventId/confirm
 * Manually confirm an event (creator/admin only)
 * Requires user to be event creator or group admin
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; eventId: string } }
) {
  try {
    // Extract user ID from header
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User authentication required' },
        { status: 401 }
      );
    }

    // Call service to confirm event (manual confirmation, not auto-confirmed)
    const result = await confirmEvent(params.eventId, userId, false);

    if (!result.success) {
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, message: result.message, errorCode: result.errorCode },
          { status: 404 }
        );
      }

      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, message: result.message, errorCode: result.errorCode },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, message: result.message, errorCode: result.errorCode },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error confirming event:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
