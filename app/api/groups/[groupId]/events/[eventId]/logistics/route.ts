import { NextRequest, NextResponse } from 'next/server';
import { getLogisticsItems, addLogisticsItem } from '@/lib/services/eventLogisticsService';
import { getVerifiedSubFromJWT } from '@/lib/auth/jwt';

/**
 * GET /api/groups/:groupId/events/:eventId/logistics
 * List logistics items (with joined claim data) for an event. Requires group membership.
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
    const userId = await getVerifiedSubFromJWT(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await getLogisticsItems(eventId, groupId, userId);

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
        { success: false, error: result.error || 'Failed to get logistics items', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Logistics items retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error in GET /api/groups/:groupId/events/:eventId/logistics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/:groupId/events/:eventId/logistics
 * Create a logistics item ('bring' or 'carpool'). Requires group membership.
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
    const userId = await getVerifiedSubFromJWT(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();

    if (body.category !== 'bring' && body.category !== 'carpool') {
      return NextResponse.json(
        { success: false, error: "Category must be 'bring' or 'carpool'", errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await addLogisticsItem(
      eventId,
      groupId,
      userId,
      body.category,
      body.title,
      body.assigned_to || null,
      typeof body.capacity === 'number' ? body.capacity : undefined
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
        { success: false, error: result.error || 'Failed to create logistics item', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data, message: result.message },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/groups/:groupId/events/:eventId/logistics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
