import { NextRequest, NextResponse } from 'next/server';
import {
  removeUserFromGroup,
  getUserGroupRole,
  updateMemberRole,
  getAdminCount,
} from '@/lib/db/queries';
import { z } from 'zod';

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
});

/**
 * DELETE /api/groups/{groupId}/members/{memberId}
 * Remove a member from the group (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  try {
    const { groupId, memberId } = await params;
    const userId = request.headers.get('x-user-id');

    // Validate auth
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // Check if user is admin of group
    const userRole = await getUserGroupRole(groupId, userId);
    if (userRole !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authorized',
          errorCode: 'NOT_GROUP_ADMIN',
        },
        { status: 403 }
      );
    }

    // Prevent removing self
    if (memberId === userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot remove yourself from group',
          errorCode: 'CANNOT_REMOVE_SELF',
        },
        { status: 400 }
      );
    }

    // Check if member exists
    const memberRole = await getUserGroupRole(groupId, memberId);
    if (!memberRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'Member not found',
          errorCode: 'MEMBER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Prevent removing last admin
    if (memberRole === 'admin') {
      const adminCount = await getAdminCount(groupId);
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot remove the last admin from the group',
            errorCode: 'CONFLICT',
            message: 'Please promote another member to admin first',
          },
          { status: 409 }
        );
      }
    }

    // Remove member
    await removeUserFromGroup(groupId, memberId);

    return NextResponse.json(
      {
        success: true,
        message: 'Member removed from group',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove member',
        errorCode: 'REMOVE_MEMBER_FAILED',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/{groupId}/members/{memberId}
 * Update member role (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  try {
    const { groupId, memberId } = await params;
    const userId = request.headers.get('x-user-id');

    // Validate auth
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // Check if user is admin of group
    const userRole = await getUserGroupRole(groupId, userId);
    if (userRole !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authorized',
          errorCode: 'NOT_GROUP_ADMIN',
        },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { role } = updateMemberSchema.parse(body);

    // Check if member exists
    const memberRole = await getUserGroupRole(groupId, memberId);
    if (!memberRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'Member not found',
          errorCode: 'MEMBER_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Prevent demoting last admin
    if (memberRole === 'admin' && role === 'member') {
      const adminCount = await getAdminCount(groupId);
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot demote last admin',
            errorCode: 'LAST_ADMIN_CANNOT_DEMOTE',
          },
          { status: 400 }
        );
      }
    }

    // Update role
    await updateMemberRole(groupId, memberId, role);

    return NextResponse.json(
      {
        success: true,
        message: 'Member role updated',
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          errorCode: 'VALIDATION_ERROR',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error updating member role:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update member role',
        errorCode: 'UPDATE_MEMBER_FAILED',
      },
      { status: 500 }
    );
  }
}
