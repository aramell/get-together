import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db/client';

/**
 * GET /api/groups/:groupId/events/:eventId/rsvp-status
 * Returns the current user's RSVP status for an event
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

    const client = await getClient();

    try {
      // Get user's current RSVP status for this event
      const result = await client.query(
        `SELECT status FROM event_rsvps
         WHERE event_id = $1 AND user_id = $2`,
        [params.eventId, userId]
      );

      if (result.rows.length === 0) {
        // User hasn't RSVPed yet
        return NextResponse.json(
          {
            success: true,
            data: {
              status: null,
            },
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            status: result.rows[0].status,
          },
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching RSVP status:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
