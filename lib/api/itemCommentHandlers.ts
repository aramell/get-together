import { NextRequest, NextResponse } from 'next/server';
import {
  getCommentableItemInEvent,
  getItemComments,
  addItemComment,
  getItemCommentById,
  updateItemComment,
  deleteItemComment,
  getUserGroupRole,
  isGroupMember,
} from '@/lib/db/queries';
import { CommentItemType, itemCommentSchema } from '@/lib/validation/commentSchema';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

/**
 * Shared member-facing comment handlers (Story 14.2). Each per-type route
 * file is a thin wrapper that supplies its item type and display label, so
 * URLs stay per-type while behavior is identical everywhere.
 */

export type ItemCommentListParams = {
  params: Promise<{ groupId: string; eventId: string; itemId: string }>;
};
export type ItemCommentOneParams = {
  params: Promise<{ groupId: string; eventId: string; itemId: string; commentId: string }>;
};

export interface ItemCommentConfig {
  itemType: CommentItemType;
  /** Capitalised label used in "<label> item not found" */
  label: string;
}

function fail(error: string, errorCode: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error, errorCode }, { status });
}

/** GET comments -- no auth required (mirrors the event-comments GET). */
export async function handleGetItemComments(
  { itemType, label }: ItemCommentConfig,
  { params }: ItemCommentListParams
): Promise<NextResponse> {
  try {
    const { groupId, eventId, itemId } = await params;

    const item = await getCommentableItemInEvent(itemType, itemId, eventId, groupId);
    if (!item) return fail(`${label} item not found`, 'NOT_FOUND', 404);

    const { comments, totalCount } = await getItemComments(itemType, itemId);

    return NextResponse.json({
      success: true,
      data: comments,
      totalCount,
      message: 'Comments retrieved successfully',
    });
  } catch (error) {
    console.error(`Error in GET ${itemType} comments:`, error);
    return fail('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/** POST a comment. Requires authentication and group membership. */
export async function handlePostItemComment(
  { itemType, label }: ItemCommentConfig,
  request: NextRequest,
  { params }: ItemCommentListParams
): Promise<NextResponse> {
  try {
    const { groupId, eventId, itemId } = await params;

    const userId = await getUserIdFromBearerToken(request);
    if (!userId) return fail('Missing or invalid authorization header', 'UNAUTHORIZED', 401);

    const body = await request.json().catch(() => ({}));
    const validation = itemCommentSchema.safeParse({
      content: body?.content,
      item_type: itemType,
      item_id: itemId,
      group_id: groupId,
    });
    if (!validation.success) {
      return fail(validation.error.issues[0]?.message || 'Validation failed', 'VALIDATION_ERROR', 400);
    }

    if (!(await isGroupMember(groupId, userId))) {
      return fail('You must be a group member to comment', 'FORBIDDEN', 403);
    }

    const item = await getCommentableItemInEvent(itemType, itemId, eventId, groupId);
    if (!item) return fail(`${label} item not found`, 'NOT_FOUND', 404);

    const comment = await addItemComment(
      itemType,
      itemId,
      eventId,
      groupId,
      userId,
      validation.data.content
    );

    return NextResponse.json(
      { success: true, data: comment, message: 'Comment posted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error(`Error in POST ${itemType} comments:`, error);
    return fail('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * Shared authorization: caller must be a group member and the comment's
 * author or a group admin. The comment must belong to the item in the URL.
 */
async function authorize(
  itemType: CommentItemType,
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

  const comment = await getItemCommentById(commentId);
  if (
    !comment ||
    comment.group_id !== groupId ||
    comment.item_type !== itemType ||
    comment.item_id !== itemId
  ) {
    return fail('Comment not found', 'NOT_FOUND', 404);
  }

  if (comment.created_by !== userId && role !== 'admin') {
    return fail(`You do not have permission to ${verb} this comment`, 'FORBIDDEN', 403);
  }
  return { id: comment.id };
}

/** PATCH a comment -- creator or admin only */
export async function handlePatchItemComment(
  { itemType }: ItemCommentConfig,
  request: NextRequest,
  { params }: ItemCommentOneParams
): Promise<NextResponse> {
  try {
    const { groupId, itemId, commentId } = await params;

    const auth = await authorize(itemType, request, groupId, itemId, commentId, 'edit');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) return fail('Comment content cannot be empty', 'VALIDATION_ERROR', 400);
    if (content.length > 2000) {
      return fail('Comment content exceeds 2000 character limit', 'VALIDATION_ERROR', 400);
    }

    const updated = await updateItemComment(commentId, content);
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
    console.error(`Error in PATCH ${itemType} comment:`, error);
    return fail('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/** DELETE (soft) a comment -- creator or admin only */
export async function handleDeleteItemComment(
  { itemType }: ItemCommentConfig,
  request: NextRequest,
  { params }: ItemCommentOneParams
): Promise<NextResponse> {
  try {
    const { groupId, itemId, commentId } = await params;

    const auth = await authorize(itemType, request, groupId, itemId, commentId, 'delete');
    if (auth instanceof NextResponse) return auth;

    await deleteItemComment(commentId);

    return NextResponse.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(`Error in DELETE ${itemType} comment:`, error);
    return fail('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
