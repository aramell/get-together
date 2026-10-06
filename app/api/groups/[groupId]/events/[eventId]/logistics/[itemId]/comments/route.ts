import { NextRequest, NextResponse } from 'next/server';
import {
  getLogisticsItemInEvent,
  getLogisticsComments,
  addLogisticsComment,
  isGroupMember,
} from '@/lib/db/queries';
import { logisticsCommentSchema } from '@/lib/validation/commentSchema';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

type Params = { params: Promise<{ groupId: string; eventId: string; itemId: string }> };

/**
 * GET /api/groups/:groupId/events/:eventId/logistics/:itemId/comments
 * Comments for a logistics item, oldest first, with nested `creator`.
 * No auth required -- mirrors the sibling event-comments GET.
 */
export async function GET(_request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { groupId, eventId, itemId } = await params;

    const item = await getLogisticsItemInEvent(itemId, eventId, groupId);
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Logistics item not found', errorCode: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const { comments, totalCount } = await getLogisticsComments(itemId);

    return NextResponse.json({
      success: true,
      data: comments,
      totalCount,
      message: 'Comments retrieved successfully',
    });
  } catch (error) {
    console.error('Error in GET logistics comments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/:groupId/events/:eventId/logistics/:itemId/comments
 * Add a comment. Requires authentication and group membership.
 */
export async function POST(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const { groupId, eventId, itemId } = await params;

    const userId = await getUserIdFromBearerToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const validation = logisticsCommentSchema.safeParse({
      content: body?.content,
      logistics_item_id: itemId,
      group_id: groupId,
    });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0]?.message || 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (!(await isGroupMember(groupId, userId))) {
      return NextResponse.json(
        { success: false, error: 'You must be a group member to comment', errorCode: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const item = await getLogisticsItemInEvent(itemId, eventId, groupId);
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Logistics item not found', errorCode: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const comment = await addLogisticsComment(itemId, groupId, userId, validation.data.content);

    return NextResponse.json(
      { success: true, data: comment, message: 'Comment posted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST logistics comments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
