import { NextRequest, NextResponse } from 'next/server';
import { getEventConfirmationStatus } from '@/lib/services/eventService';
import { getUserGroupRole } from '@/lib/db/queries';

/**
 * GET /api/groups/:groupId/events/:eventId/confirmation
 * Returns the current confirmation status of an event
 */
export async function GET(
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

    // Verify user is a member of the group
    const userRole = await getUserGroupRole(params.groupId, userId);
    if (!userRole) {
      return NextResponse.json(
        { success: false, message: 'You must be a group member to view event details' },
        { status: 403 }
      );
    }

    const result = await getEventConfirmationStatus(params.eventId);

    if (!result.success) {
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, message: 'Event not found', errorCode: result.errorCode },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, message: 'Failed to get event confirmation status', errorCode: result.errorCode },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching event confirmation status:', error);
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
