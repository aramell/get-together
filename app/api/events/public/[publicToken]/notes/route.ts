import { NextRequest, NextResponse } from 'next/server';
import { getEventByPublicToken } from '@/lib/db/queries';
import { listPublicEventNotes } from '@/lib/services/eventNotesService';

/**
 * GET /api/events/public/[publicToken]/notes
 * Read-only notes and links for the no-login event view (Story 14.9).
 * Never returns group_id. Mirrors the 404/410/500 handling of sibling routes.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  try {
    const { publicToken } = await params;

    if (!publicToken || publicToken.length < 32) {
      return NextResponse.json(
        { success: false, message: 'Event not found or link has expired', errorCode: 'INVALID_TOKEN' },
        { status: 404 }
      );
    }

    const event = await getEventByPublicToken(publicToken);
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found or link has expired', errorCode: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }
    if (event.status === 'cancelled') {
      return NextResponse.json(
        { success: false, message: 'This event is no longer available', errorCode: 'EVENT_CANCELLED' },
        { status: 410 }
      );
    }

    const result = await listPublicEventNotes(event.id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to get notes', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error fetching public notes:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
