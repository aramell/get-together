import { NextRequest, NextResponse } from 'next/server';
import { getSubFromJWT } from '@/lib/auth/jwt';
import { editWishlistComment, deleteWishlistCommentService } from '@/lib/services/commentService';

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
 * PATCH /api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]
 * Edit a wishlist comment. Requires the caller to be the comment's author or a group admin.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; itemId: string; commentId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { groupId, commentId } = await params;

    const userId = getSubFromJWT(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const result = await editWishlistComment(groupId, commentId, userId, body.content ?? '');

    if (!result.success) {
      return NextResponse.json(result, { status: statusForErrorCode(result.errorCode) });
    }

    return NextResponse.json(
      { success: true, message: 'Comment updated successfully', data: result.data },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/groups/[groupId]/wishlist/[itemId]/comments/[commentId] error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]
 * Soft-delete a wishlist comment. Requires the caller to be the comment's author or a group admin.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; itemId: string; commentId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { groupId, commentId } = await params;

    const userId = getSubFromJWT(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await deleteWishlistCommentService(groupId, commentId, userId);

    if (!result.success) {
      return NextResponse.json(result, { status: statusForErrorCode(result.errorCode) });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/groups/[groupId]/wishlist/[itemId]/comments/[commentId] error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
