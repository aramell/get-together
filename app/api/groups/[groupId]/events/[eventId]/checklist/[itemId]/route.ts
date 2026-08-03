import { NextRequest, NextResponse } from 'next/server';
import { updateChecklistItem, deleteChecklistItem } from '@/lib/services/eventChecklistService';
import { getSubFromJWT } from '@/lib/auth/jwt';

/**
 * PATCH /api/groups/:groupId/events/:eventId/checklist/:itemId
 * Toggle is_checked, or edit title/assigned_to. Authorization differs per
 * field — see eventChecklistService.updateChecklistItem.
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
    const updates: { is_checked?: boolean; title?: string; assigned_to?: string | null } = {};

    if (typeof body.is_checked === 'boolean') {
      updates.is_checked = body.is_checked;
    }
    if (typeof body.title === 'string') {
      updates.title = body.title;
    }
    if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await updateChecklistItem(eventId, groupId, itemId, userId, updates);

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
        { success: false, error: result.error || 'Failed to update checklist item', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error: any) {
    console.error('Error in PATCH /api/groups/:groupId/events/:eventId/checklist/:itemId:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/:groupId/events/:eventId/checklist/:itemId
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

    const result = await deleteChecklistItem(eventId, groupId, itemId, userId);

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
        { success: false, error: result.error || 'Failed to delete checklist item', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Error in DELETE /api/groups/:groupId/events/:eventId/checklist/:itemId:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
