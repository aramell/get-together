import { NextRequest, NextResponse } from 'next/server';
import { getChecklistItems, addChecklistItem } from '@/lib/services/eventChecklistService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

/**
 * GET /api/groups/:groupId/events/:eventId/checklist
 * List checklist items for an event. Requires group membership.
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

    const userId = await getUserIdFromBearerToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await getChecklistItems(eventId, groupId, userId);

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
        { success: false, error: result.error || 'Failed to get checklist items', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Checklist items retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error in GET /api/groups/:groupId/events/:eventId/checklist:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/:groupId/events/:eventId/checklist
 * Create a checklist item. Requires group membership.
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

    const userId = await getUserIdFromBearerToken(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
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

    const result = await addChecklistItem(
      eventId,
      groupId,
      userId,
      body.title,
      body.assigned_to || null
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
        { success: false, error: result.error || 'Failed to create checklist item', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data, message: result.message },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/groups/:groupId/events/:eventId/checklist:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
