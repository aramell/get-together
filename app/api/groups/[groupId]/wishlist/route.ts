import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import {
  createWishlistItemService,
  getWishlistItemsService,
  deleteWishlistItemService,
} from '@/lib/services/wishlistService';
import { createWishlistItemSchema } from '@/lib/validation/wishlistSchema';

/**
 * GET /api/groups/[groupId]/wishlist
 * Retrieve wishlist items for a group with pagination
 * Query params: limit (default 20, max 100), offset (default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const resolvedParams = await params;
    // Get user ID from JWT token
    const userId = await getUserIdFromRequest(request);
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

    // Parse pagination parameters from query string
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    let parsedLimit = 20;
    let parsedOffset = 0;

    if (limit) {
      const num = parseInt(limit);
      if (!isNaN(num)) {
        parsedLimit = Math.max(1, Math.min(100, num));
      }
    }

    if (offset) {
      const num = parseInt(offset);
      if (!isNaN(num)) {
        parsedOffset = Math.max(0, num);
      }
    }

    const result = await getWishlistItemsService(
      resolvedParams.groupId,
      userId,
      parsedLimit,
      parsedOffset
    );

    if (!result.success) {
      const statusCode = result.errorCode === 'FORBIDDEN' ? 403 : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching wishlist items:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching wishlist items',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/[groupId]/wishlist
 * Create a new wishlist item
 * Body: { title, description?, link? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    // Get user ID from JWT token
    const userId = await getUserIdFromRequest(request);
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
    let data;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body',
          error: 'INVALID_REQUEST',
          errorCode: 'BAD_REQUEST',
        },
        { status: 400 }
      );
    }

    // Validate request data (Zod will catch validation errors)
    try {
      createWishlistItemSchema.parse(data);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: error.errors?.[0]?.message || 'Validation failed',
          error: 'VALIDATION_ERROR',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    // Create the wishlist item
    const result = await createWishlistItemService(resolvedParams.groupId, userId, data);

    if (!result.success) {
      const statusCode =
        result.errorCode === 'FORBIDDEN'
          ? 403
          : result.errorCode === 'VALIDATION_ERROR'
            ? 422
            : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating wishlist item:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating the wishlist item',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[groupId]/wishlist/[itemId]
 * Delete a wishlist item (soft delete)
 * Only creator or group admin can delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const resolvedParams = await params;
    // Get user ID from JWT token
    const userId = await getUserIdFromRequest(request);
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

    // Extract item ID from URL - supports both /wishlist/[itemId] and query param
    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Item ID is required',
          errorCode: 'BAD_REQUEST',
        },
        { status: 400 }
      );
    }

    // Delete the wishlist item
    const result = await deleteWishlistItemService(itemId, userId);

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
  } catch (error: any) {
    console.error('Error deleting wishlist item:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while deleting the wishlist item',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
