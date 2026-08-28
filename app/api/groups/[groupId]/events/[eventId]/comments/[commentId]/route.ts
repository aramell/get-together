import { NextRequest, NextResponse } from 'next/server';
import { editEventComment, deleteEventCommentWithAuth } from '@/lib/services/commentService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

function statusForErrorCode(errorCode?: string): number {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    default:
      return 500;
  }
}

/**
 * PATCH /api/groups/:groupId/events/:eventId/comments/:commentId
 * Edit an event comment. Requires the caller to be the comment's author or a group admin.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string; commentId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, commentId } = await params;

    const userId = await getUserIdFromBearerToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const result = await editEventComment(groupId, commentId, userId, body.content ?? '');

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, errorCode: result.errorCode },
        { status: statusForErrorCode(result.errorCode) }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Comment updated successfully',
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/groups/:groupId/events/:eventId/comments/:commentId:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/:groupId/events/:eventId/comments/:commentId
 * Soft-delete an event comment. Requires the caller to be the comment's author or a group admin.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string; commentId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, commentId } = await params;

    const userId = await getUserIdFromBearerToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await deleteEventCommentWithAuth(groupId, commentId, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, errorCode: result.errorCode },
        { status: statusForErrorCode(result.errorCode) }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/groups/:groupId/events/:eventId/comments/:commentId:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
