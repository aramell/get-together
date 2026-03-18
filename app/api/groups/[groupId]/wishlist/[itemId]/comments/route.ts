import { NextRequest, NextResponse } from 'next/server';
import { getSubFromJWT } from '@/lib/auth/jwt';
import {
  createWishlistCommentService,
  getWishlistCommentsService,
} from '@/lib/services/wishlistService';
import { validateWishlistCommentInput } from '@/lib/validation/commentSchema';

/**
 * POST /api/groups/[groupId]/wishlist/[itemId]/comments
 * Create a comment on a wishlist item
 *
 * Request body:
 * {
 *   "content": "This would be great for the team!"
 * }
 *
 * Success response (201):
 * {
 *   "success": true,
 *   "message": "Comment posted",
 *   "data": {
 *     "id": "uuid",
 *     "content": "This would be great for the team!",
 *     "created_by": "user-sub",
 *     "created_at": "2026-03-18T10:30:00Z"
 *   }
 * }
 *
 * Error responses:
 * - 400: Validation error (empty comment, too long, invalid data)
 * - 403: Forbidden (not a group member)
 * - 404: Item not found
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; itemId: string } }
) {
  try {
    // Extract user from JWT token
    const userId = await getSubFromJWT(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input using Zod schema
    const validationResult = validateWishlistCommentInput({
      content: body.content,
      wishlist_item_id: params.itemId,
      group_id: params.groupId,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: validationResult.error || 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Call service to create comment
    const result = await createWishlistCommentService(
      params.groupId,
      params.itemId,
      userId,
      validationResult.data!.content
    );

    if (!result.success) {
      const statusCode =
        result.errorCode === 'FORBIDDEN'
          ? 403
          : result.errorCode === 'NOT_FOUND'
            ? 404
            : result.errorCode === 'VALIDATION_ERROR'
              ? 400
              : 500;

      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/groups/[groupId]/wishlist/[itemId]/comments error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/groups/[groupId]/wishlist/[itemId]/comments?limit=50&offset=0
 * Fetch comments for a wishlist item
 *
 * Query parameters:
 * - limit: Number of comments to return (default: 50, max: 100)
 * - offset: Number of comments to skip (default: 0)
 *
 * Success response (200):
 * {
 *   "success": true,
 *   "message": "Comments fetched",
 *   "data": {
 *     "comments": [
 *       {
 *         "id": "uuid",
 *         "content": "Great idea!",
 *         "created_by": "user-sub",
 *         "display_name": "John Doe",
 *         "avatar_url": "https://...",
 *         "created_at": "2026-03-18T10:30:00Z"
 *       }
 *     ],
 *     "totalCount": 1,
 *     "hasMore": false
 *   }
 * }
 *
 * Error responses:
 * - 403: Forbidden (not a group member)
 * - 404: Item not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; itemId: string } }
) {
  try {
    // Extract user from JWT token
    const userId = await getSubFromJWT(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Call service to fetch comments
    const result = await getWishlistCommentsService(
      params.groupId,
      params.itemId,
      userId,
      limit,
      offset
    );

    if (!result.success) {
      const statusCode =
        result.errorCode === 'FORBIDDEN'
          ? 403
          : result.errorCode === 'NOT_FOUND'
            ? 404
            : 500;

      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('GET /api/groups/[groupId]/wishlist/[itemId]/comments error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
