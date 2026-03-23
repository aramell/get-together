import { NextRequest, NextResponse } from 'next/server';
import { editWishlistComment, deleteWishlistCommentService } from '@/lib/services/commentService';
import { getSubFromJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

const editCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(2000, 'Content exceeds 2000 characters'),
});

/**
 * PUT /api/groups/:groupId/wishlist/:itemId/comments/:commentId
 * Edit a wishlist comment
 *
 * Authorization: Comment author or group admin
 * Body: { content: string (1-2000 chars) }
 *
 * Responses:
 * - 200: Comment edited successfully
 * - 400: Invalid request format
 * - 403: Unauthorized (not author or admin, not group member)
 * - 404: Comment not found
 * - 409: Concurrent edit conflict
 * - 422: Validation error
 * - 500: Server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { groupId: string; itemId: string; commentId: string } }
) {
  try {
    // Extract user ID from JWT
    const userId = getSubFromJWT(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { groupId, commentId } = params;

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body', errorCode: 'BAD_REQUEST' },
        { status: 422 }
      );
    }

    const validation = editCommentSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(', ');
      return NextResponse.json(
        { success: false, message: errors, errorCode: 'VALIDATION_ERROR' },
        { status: 422 }
      );
    }

    const { content } = validation.data;

    // Call service layer
    const result = await editWishlistComment(groupId, commentId, userId, content);

    // Map service response to HTTP response
    if (!result.success) {
      const statusMap: { [key: string]: number } = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 422,
        BAD_REQUEST: 400,
        INTERNAL_ERROR: 500,
      };

      const status = statusMap[result.errorCode || 'INTERNAL_ERROR'] || 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to edit comment';
    console.error('Error in PUT /api/groups/:groupId/wishlist/:itemId/comments/:commentId:', error);

    return NextResponse.json(
      { success: false, message, errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/:groupId/wishlist/:itemId/comments/:commentId
 * Delete a wishlist comment (soft delete)
 *
 * Authorization: Comment author or group admin
 * Body: (empty)
 *
 * Responses:
 * - 200: Comment deleted successfully
 * - 401: Unauthorized (no JWT token)
 * - 403: Forbidden (not author or admin, not group member)
 * - 404: Comment not found
 * - 409: Conflict (comment already deleted)
 * - 500: Server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; itemId: string; commentId: string } }
) {
  try {
    // Extract user ID from JWT
    const userId = getSubFromJWT(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { groupId, commentId } = params;

    // Call service layer
    const result = await deleteWishlistCommentService(groupId, commentId, userId);

    // Map service response to HTTP response
    if (!result.success) {
      const statusMap: { [key: string]: number } = {
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        VALIDATION_ERROR: 422,
        BAD_REQUEST: 400,
        INTERNAL_ERROR: 500,
      };

      const status = statusMap[result.errorCode || 'INTERNAL_ERROR'] || 500;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete comment';
    console.error('Error in DELETE /api/groups/:groupId/wishlist/:itemId/comments/:commentId:', error);

    return NextResponse.json(
      { success: false, message, errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
