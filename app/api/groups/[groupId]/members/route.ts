import { NextRequest, NextResponse } from 'next/server';
import {
  getGroupMembers as getGroupMembersQuery,
} from '@/lib/db/queries';
import { getUserGroupRole } from '@/lib/db/queries';

/**
 * GET /api/groups/{groupId}/members?limit=10&offset=0
 * Get all members of a group with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { groupId } = params;
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

    // Check if user is member of group
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not a member of this group',
          errorCode: 'NOT_GROUP_MEMBER',
        },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getGroupMembersQuery(groupId, limit, offset);

    return NextResponse.json(
      {
        success: true,
        members: result.members.map((member) => ({
          id: member.id,
          email: member.email,
          username: member.username,
          role: member.role,
          joinedAt: member.joinedAt,
          isCurrentUser: member.id === userId,
        })),
        total: result.total,
        hasMore: offset + limit < result.total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting group members:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get members',
        errorCode: 'GET_MEMBERS_FAILED',
      },
      { status: 500 }
    );
  }
}
