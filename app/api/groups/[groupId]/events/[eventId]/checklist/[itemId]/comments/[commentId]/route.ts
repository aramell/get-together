import { NextRequest, NextResponse } from 'next/server';
import {
  getUserGroupRole,
  getChecklistCommentById,
  updateChecklistComment,
  deleteChecklistComment,
} from '@/lib/db/queries';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

type Params = {
  params: Promise<{ groupId: string; eventId: string; itemId: string; commentId: string }>;
};

function fail(error: string, errorCode: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error, errorCode }, { status });
}

/**
 * Shared authorization: caller must be a group member and the comment's
 * author or a group admin. Returns an error response, or the loaded comment.
 */
async function authorize(
  request: NextRequest,
  groupId: string,
  itemId: string,
  commentId: string,
  verb: 'edit' | 'delete'
): Promise<NextResponse | { id: string }> {
  const userId = await getUserIdFromBearerToken(request);
  if (!userId) return fail('Invalid or expired token', 'UNAUTHORIZED', 401);

  const role = await getUserGroupRole(groupId, userId);
  if (!role) return fail('Not a member of this group', 'FORBIDDEN', 403);

  const comment = await getChecklistCommentById(commentId);
  if (!comment || comment.group_id !== groupId || comment.checklist_item_id !== itemId) {
    return fail('Comment not found', 'NOT_FOUND', 404);
  }

  if (comment.created_by !== userId && role !== 'admin') {
    return fail(`You do not have permission to ${verb} this comment`, 'FORBIDDEN', 403);
  }
  return { id: comment.id };
}

/**
 * PATCH .../checklist/:itemId/comments/:commentId -- creator or admin only
 */
export async function PATCH(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { groupId, itemId, commentId } = await params;

    const auth = await authorize(request, groupId, itemId, commentId, 'edit');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) return fail('Comment content cannot be empty', 'VALIDATION_ERROR', 400);
    if (content.length > 2000) {
      return fail('Comment content exceeds 2000 character limit', 'VALIDATION_ERROR', 400);
    }

    const updated = await updateChecklistComment(commentId, content);
    if (!updated) {
      return fail(
        'Comment was deleted or edited by another user. Please refresh and try again.',
        'CONFLICT',
        409
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH checklist comment:', error);
    return fail('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * DELETE .../checklist/:itemId/comments/:commentId -- creator or admin only
 */
export async function DELETE(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { groupId, itemId, commentId } = await params;

    const auth = await authorize(request, groupId, itemId, commentId, 'delete');
    if (auth instanceof NextResponse) return auth;

    await deleteChecklistComment(commentId);

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE checklist comment:', error);
    return fail('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
