import { NextRequest, NextResponse } from 'next/server';
import {
  handleGetItemComments,
  handlePostItemComment,
  ItemCommentListParams,
  ItemCommentConfig,
} from '@/lib/api/itemCommentHandlers';

const config: ItemCommentConfig = { itemType: 'poll', label: 'Poll', notFoundMessage: 'Poll not found' };

// The shared handlers read `itemId`; this folder's segment is `pollId` to match
// its sibling routes.
type PollCommentParams = {
  params: Promise<{ groupId: string; eventId: string; pollId: string }>;
};

function toItemParams({ params }: PollCommentParams): ItemCommentListParams {
  return { params: params.then(({ pollId, ...rest }) => ({ ...rest, itemId: pollId })) };
}

/**
 * GET /api/groups/:groupId/events/:eventId/polls/:pollId/comments
 * Comments for a poll, oldest first, with nested `creator`. No auth required.
 */
export async function GET(_request: NextRequest, ctx: PollCommentParams): Promise<NextResponse> {
  return handleGetItemComments(config, toItemParams(ctx));
}

/**
 * POST /api/groups/:groupId/events/:eventId/polls/:pollId/comments
 * Add a comment. Requires authentication and group membership.
 */
export async function POST(request: NextRequest, ctx: PollCommentParams): Promise<NextResponse> {
  return handlePostItemComment(config, request, toItemParams(ctx));
}
