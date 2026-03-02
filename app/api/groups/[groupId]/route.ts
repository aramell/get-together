import { NextRequest, NextResponse } from 'next/server';
import { getGroupDetailsFromDb } from '@/lib/services/groupServerService';

/**
 * GET /api/groups/:groupId
 * Retrieve detailed group information with member list
 * Requires user to be authenticated and a member of the group
 *
 * Query parameters:
 * - (none)
 *
 * Headers:
 * - Authorization: Bearer <JWT token> or Cookie with auth token
 *
 * Response:
 * - 200: Group details with members list
 * - 400: Invalid group ID
 * - 401: User not authenticated
 * - 403: User is not a member of the group
 * - 404: Group not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // Validate groupId
    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Group ID is required',
          error: 'INVALID_GROUP_ID',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Extract userId from JWT token
    // For MVP, we'll extract from Authorization header or use placeholder
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      // In production, verify JWT token and extract userId
      // For now, use a placeholder that would be set by middleware
      userId = (request as any).userId || request.headers.get('x-user-id');
    }

    // Check if user_id is available from middleware
    if (!userId) {
      userId = (request as any).userId || request.headers.get('x-user-id');
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Fetch group details from database
    const result = await getGroupDetailsFromDb(groupId, userId);

    // Return appropriate response based on result
    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: result.message,
          data: result.data,
        },
        { status: 200 }
      );
    }

    // Handle error responses
    let statusCode = 500;

    if (result.errorCode === 'NOT_FOUND') {
      statusCode = 404;
    } else if (result.errorCode === 'FORBIDDEN') {
      statusCode = 403;
    } else if (result.errorCode === 'UNAUTHORIZED') {
      statusCode = 401;
    }

    return NextResponse.json(
      {
        success: false,
        message: result.message,
        error: result.error,
        errorCode: result.errorCode,
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('Get group details API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred while retrieving group details',
        error: (error as any)?.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/groups/:groupId
 * Update group information (admin only)
 * Requires user to be authenticated and an admin of the group
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // Validate groupId
    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Group ID is required',
          error: 'INVALID_GROUP_ID',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Extract userId from request
    const userId = (request as any).userId || request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // TODO: Implement group update functionality
    // 1. Verify user is admin of the group
    // 2. Parse and validate request body (name, description)
    // 3. Update group in database
    // 4. Return updated group details

    return NextResponse.json(
      {
        success: false,
        message: 'Group update is not yet implemented',
        errorCode: 'NOT_IMPLEMENTED',
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Update group API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred while updating the group',
        error: (error as any)?.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/:groupId
 * Delete a group (admin only)
 * Requires user to be authenticated and an admin of the group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // Validate groupId
    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Group ID is required',
          error: 'INVALID_GROUP_ID',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Extract userId from request
    const userId = (request as any).userId || request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // TODO: Implement group deletion
    // 1. Verify user is admin of the group
    // 2. Delete group from database (cascade will delete memberships)
    // 3. Return success response

    return NextResponse.json(
      {
        success: false,
        message: 'Group deletion is not yet implemented',
        errorCode: 'NOT_IMPLEMENTED',
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Delete group API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred while deleting the group',
        error: (error as any)?.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
