import { NextRequest, NextResponse } from 'next/server';
import { updateTimelineItem, deleteTimelineItem } from '@/lib/services/eventTimelineService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

/**
 * PATCH /api/groups/:groupId/events/:eventId/timeline/:itemId
 * Edit item_time/title/description — creator or group admin only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string; itemId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId, itemId } = await Promise.resolve(params);

    if (!groupId || !eventId || !itemId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
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
    const updates: { item_time?: string; title?: string; description?: string | null } = {};

    if (typeof body.item_time === 'string') {
      updates.item_time = body.item_time;
    }
    if (typeof body.title === 'string') {
      updates.title = body.title;
    }
    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await updateTimelineItem(eventId, groupId, itemId, userId, updates);

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
        { success: false, error: result.error || 'Failed to update timeline item', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error: any) {
    console.error('Error in PATCH /api/groups/:groupId/events/:eventId/timeline/:itemId:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/:groupId/events/:eventId/timeline/:itemId
 * Creator or group admin only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string; itemId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId, itemId } = await Promise.resolve(params);

    if (!groupId || !eventId || !itemId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
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

    const result = await deleteTimelineItem(eventId, groupId, itemId, userId);

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
        { success: false, error: result.error || 'Failed to delete timeline item', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Error in DELETE /api/groups/:groupId/events/:eventId/timeline/:itemId:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
