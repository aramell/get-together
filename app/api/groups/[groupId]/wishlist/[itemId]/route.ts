import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { getWishlistItemService } from '@/lib/services/wishlistService';

/**
 * GET /api/groups/[groupId]/wishlist/[itemId]
 * Retrieve a single wishlist item with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; itemId: string }> }
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

    // Get the wishlist item
    const result = await getWishlistItemService(resolvedParams.itemId, userId);

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
    console.error('Error fetching wishlist item:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching the wishlist item',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
