import { NextRequest, NextResponse } from 'next/server';
import {
  handleGetItemComments,
  handlePostItemComment,
  ItemCommentListParams,
  ItemCommentConfig,
} from '@/lib/api/itemCommentHandlers';

const config: ItemCommentConfig = { itemType: 'checklist', label: 'Checklist' };

/**
 * GET /api/groups/:groupId/events/:eventId/checklist/:itemId/comments
 * Comments for a checklist item, oldest first, with nested `creator`. No auth required.
 */
export async function GET(_request: NextRequest, ctx: ItemCommentListParams): Promise<NextResponse> {
  return handleGetItemComments(config, ctx);
}

/**
 * POST /api/groups/:groupId/events/:eventId/checklist/:itemId/comments
 * Add a comment. Requires authentication and group membership.
 */
export async function POST(request: NextRequest, ctx: ItemCommentListParams): Promise<NextResponse> {
  return handlePostItemComment(config, request, ctx);
}
