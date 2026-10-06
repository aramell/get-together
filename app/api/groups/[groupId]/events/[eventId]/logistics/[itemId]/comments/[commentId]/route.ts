import { NextRequest, NextResponse } from 'next/server';
import {
  handlePatchItemComment,
  handleDeleteItemComment,
  ItemCommentOneParams,
  ItemCommentConfig,
} from '@/lib/api/itemCommentHandlers';

const config: ItemCommentConfig = { itemType: 'logistics', label: 'Logistics' };

/** PATCH .../logistics/:itemId/comments/:commentId -- creator or admin only */
export async function PATCH(request: NextRequest, ctx: ItemCommentOneParams): Promise<NextResponse> {
  return handlePatchItemComment(config, request, ctx);
}

/** DELETE .../logistics/:itemId/comments/:commentId -- creator or admin only */
export async function DELETE(request: NextRequest, ctx: ItemCommentOneParams): Promise<NextResponse> {
  return handleDeleteItemComment(config, request, ctx);
}
