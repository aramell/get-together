import { NextRequest, NextResponse } from 'next/server';
import { getTimelineItems, addTimelineItem } from '@/lib/services/eventTimelineService';
import { getSubFromJWT } from '@/lib/auth/jwt';

/**
 * GET /api/groups/:groupId/events/:eventId/timeline
 * List timeline items for an event, ordered by item_time. Requires group membership.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId } = await Promise.resolve(params);

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID', errorCode: 'INVALID_GROUP_ID' },
        { status: 400 }
      );
    }

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID', errorCode: 'INVALID_EVENT_ID' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = getSubFromJWT(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await getTimelineItems(eventId, groupId, userId);

    if (!result.success) {
      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to get timeline items', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Timeline items retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error in GET /api/groups/:groupId/events/:eventId/timeline:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/:groupId/events/:eventId/timeline
 * Create a timeline item. Requires group membership.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId } = await Promise.resolve(params);

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID', errorCode: 'INVALID_GROUP_ID' },
        { status: 400 }
      );
    }

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID', errorCode: 'INVALID_EVENT_ID' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = getSubFromJWT(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.item_time || typeof body.item_time !== 'string') {
      return NextResponse.json(
        { success: false, error: 'item_time is required', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await addTimelineItem(
      eventId,
      groupId,
      userId,
      body.item_time,
      body.title,
      body.description || null
    );

    if (!result.success) {
      if (result.errorCode === 'VALIDATION_ERROR') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create timeline item', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data, message: result.message },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/groups/:groupId/events/:eventId/timeline:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
