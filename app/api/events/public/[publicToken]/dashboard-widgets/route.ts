import { NextRequest, NextResponse } from 'next/server';
import { getEventByPublicToken } from '@/lib/db/queries';
import { getWidgetLayout } from '@/lib/services/dashboardWidgetsService';

/**
 * GET /api/events/public/[publicToken]/dashboard-widgets
 * Read-only dashboard widget layout (position + visibility for all 5
 * widgets) for the public/no-login event view (Story 13.5). Resolves
 * group_id via the public_token server-side to call the same
 * getWidgetLayout used by the authenticated Dashboard, but never returns
 * group_id itself -- see Story 7.3's no-group-leakage stance. No auth,
 * mirrors the 404/410/500 handling of the sibling `planning` route.
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

    const result = await getWidgetLayout(event.group_id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || 'Failed to get dashboard layout', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error fetching public dashboard widget layout:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
