import { NextRequest, NextResponse } from 'next/server';
import {
  handlePatchItemComment,
  handleDeleteItemComment,
  ItemCommentOneParams,
  ItemCommentConfig,
} from '@/lib/api/itemCommentHandlers';

const config: ItemCommentConfig = { itemType: 'poll', label: 'Poll' };

// The shared handlers read `itemId`; this folder's segment is `pollId` to match
// its sibling routes.
type PollCommentOneParams = {
  params: Promise<{ groupId: string; eventId: string; pollId: string; commentId: string }>;
};

function toItemParams({ params }: PollCommentOneParams): ItemCommentOneParams {
  return { params: params.then(({ pollId, ...rest }) => ({ ...rest, itemId: pollId })) };
}

/** PATCH .../polls/:pollId/comments/:commentId -- creator or admin only */
export async function PATCH(request: NextRequest, ctx: PollCommentOneParams): Promise<NextResponse> {
  return handlePatchItemComment(config, request, toItemParams(ctx));
}

/** DELETE .../polls/:pollId/comments/:commentId -- creator or admin only */
export async function DELETE(request: NextRequest, ctx: PollCommentOneParams): Promise<NextResponse> {
  return handleDeleteItemComment(config, request, toItemParams(ctx));
}
