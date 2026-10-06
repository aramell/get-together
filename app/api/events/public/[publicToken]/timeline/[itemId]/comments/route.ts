import { NextRequest, NextResponse } from 'next/server';
import { getPublicItemComments } from '@/lib/services/publicPlanningService';

/**
 * GET /api/events/public/[publicToken]/timeline/[itemId]/comments
 * Guest-readable (no auth) comments for one timeline item. The group/event
 * are resolved server-side from the public token; creators are first-name
 * only and raw user IDs are never returned. Guests cannot post/edit/delete
 * through this route.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ publicToken: string; itemId: string }> }
) {
  try {
    const { publicToken, itemId } = await params;

    if (!publicToken || publicToken.length < 32) {
      return NextResponse.json(
        { success: false, error: 'Event not found or link has expired', errorCode: 'INVALID_TOKEN' },
        { status: 404 }
      );
    }

    const result = await getPublicItemComments(publicToken, 'timeline', itemId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, errorCode: result.status === 410 ? 'EVENT_CANCELLED' : result.status === 500 ? 'INTERNAL_ERROR' : 'NOT_FOUND' },
        { status: result.status ?? 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in public GET timeline comments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
