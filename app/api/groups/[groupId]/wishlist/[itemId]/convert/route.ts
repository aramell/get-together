import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { convertItemToEvent } from '@/lib/services/wishlistService';
import { validateConvertToEventRequest } from '@/lib/validation/convertToEventSchema';

/**
 * POST /api/groups/[groupId]/wishlist/[itemId]/convert
 * Convert a wishlist item to an event proposal
 * Requires: date (ISO 8601), optionally description and threshold
 * Returns: 201 Created with event and conversion link
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; itemId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { groupId, itemId } = resolvedParams;

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
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body',
          error: 'INVALID_JSON',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = validateConvertToEventRequest(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error || 'Validation failed',
          error: validation.error,
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Call service to convert item to event
    const result = await convertItemToEvent(groupId, itemId, userId, validation.data);

    if (!result.success) {
      const statusCode =
        result.errorCode === 'FORBIDDEN'
          ? 403
          : result.errorCode === 'NOT_FOUND'
            ? 404
            : result.errorCode === 'CONFLICT'
              ? 409
              : result.errorCode === 'VALIDATION_ERROR'
                ? 400
                : 500;

      return NextResponse.json(result, { status: statusCode });
    }

    // Success: return 201 Created
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error converting wishlist item to event:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while converting the item',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
