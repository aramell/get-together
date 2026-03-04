import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGroupDetailsFromDb } from '@/lib/services/groupServerService';
import { updateGroup, getUserGroupRole, getGroupById, deleteGroup as deleteGroupFromDb } from '@/lib/db/queries';

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

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().nullable().optional(),
});

/**
 * PATCH /api/groups/:groupId
 * Update group information (admin only)
 * Requires user to be authenticated and an admin of the group
 */
export async function PATCH(
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

    // Check if group exists
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        {
          success: false,
          message: 'Group not found',
          error: 'NOT_FOUND',
          errorCode: 'GROUP_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if user is admin of the group
    const userRole = await getUserGroupRole(groupId, userId);
    if (userRole !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authorized',
          error: 'FORBIDDEN',
          errorCode: 'NOT_GROUP_ADMIN',
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { name, description } = updateGroupSchema.parse(body);

    // At least one field must be provided
    if (name === undefined && description === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: 'No fields to update',
          error: 'VALIDATION_ERROR',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Update group
    const updateData: { name?: string; description?: string | null } = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedGroup = await updateGroup(groupId, updateData);

    if (!updatedGroup) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update group',
          error: 'UPDATE_FAILED',
          errorCode: 'UPDATE_GROUP_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Group updated successfully',
        group: updatedGroup,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          error: 'VALIDATION_ERROR',
          errorCode: 'VALIDATION_ERROR',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

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

    // Verify user is admin of the group
    const userRole = await getUserGroupRole(groupId, userId);

    if (userRole !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Only group admins can delete groups',
          error: 'FORBIDDEN',
          errorCode: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Soft delete group by setting deleted_at timestamp (GDPR compliant)
    await deleteGroupFromDb(groupId);

    return NextResponse.json(
      {
        success: true,
        message: 'Group deleted successfully',
      },
      { status: 200 }
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
