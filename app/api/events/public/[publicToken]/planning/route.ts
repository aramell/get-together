import { NextRequest, NextResponse } from 'next/server';
import { getPublicEventPlanning } from '@/lib/services/publicPlanningService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

/**
 * GET /api/events/public/[publicToken]/planning
 * Read-only checklist/logistics/timeline/photos/polls data for the public
 * event page. Gated by the same public_token as the rest of the public
 * event view — no authentication required, no separate per-section
 * visibility toggle.
 *
 * An optional `Authorization: Bearer` header is honored (not required): if
 * it resolves to a verified user, the response additionally includes
 * `group_id` (see publicPlanningService's `PublicPlanningData.group_id`
 * doc) so a guest who just logged in via the public page's in-place login
 * modal (Story 13.5) can upgrade to the real per-group member endpoints
 * without navigating away. An anonymous request never gets `group_id`.
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

    const requestingUserId = await getUserIdFromBearerToken(request);

    const result = await getPublicEventPlanning(publicToken, requestingUserId);

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
