import { NextRequest, NextResponse } from 'next/server';
import { getPublicEventPlanning } from '@/lib/services/publicPlanningService';

/**
 * GET /api/events/public/[publicToken]/planning
 * Read-only checklist/logistics/timeline data for the public event page.
 * Gated by the same public_token as the rest of the public event view — no
 * authentication, no separate per-section visibility toggle.
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

    const result = await getPublicEventPlanning(publicToken);

    if (!result.success) {
      const statusCode = result.message === 'This event is no longer available' ? 410 : 404;
      return NextResponse.json(
        { success: false, message: result.message, errorCode: statusCode === 410 ? 'EVENT_CANCELLED' : 'EVENT_NOT_FOUND' },
        { status: statusCode }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error fetching public event planning:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
