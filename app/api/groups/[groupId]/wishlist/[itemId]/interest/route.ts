import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { markInterestService, unmarkInterestService } from '@/lib/services/wishlistService';

/**
 * POST /api/groups/[groupId]/wishlist/[itemId]/interest
 * Mark interest on a wishlist item
 * Requires: JWT authentication, group membership
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; itemId: string } }
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

    // Mark interest on the item
    const result = await markInterestService(params.itemId, userId, params.groupId);

    if (!result.success) {
      const statusCode =
        result.errorCode === 'FORBIDDEN'
          ? 403
          : result.errorCode === 'NOT_FOUND'
            ? 404
            : result.errorCode === 'CONFLICT'
              ? 409
              : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error marking interest:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while marking interest',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[groupId]/wishlist/[itemId]/interest
 * Unmark interest on a wishlist item
 * Requires: JWT authentication, group membership
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; itemId: string } }
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

    // Unmark interest on the item
    const result = await unmarkInterestService(params.itemId, userId, params.groupId);

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
    console.error('Error unmarking interest:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while unmarking interest',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
