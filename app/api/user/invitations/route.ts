import { NextRequest, NextResponse } from 'next/server';
import { getUserInvitations } from '@/lib/db/queries/invitations';

/**
 * GET /api/user/invitations?status=pending&limit=10&offset=0
 * Get user's invitations
 */
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get('status') || 'pending') as
      | 'pending'
      | 'accepted'
      | 'declined';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate status
    if (!['pending', 'accepted', 'declined'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status',
          errorCode: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    const result = await getUserInvitations(userId, status, limit, offset);

    return NextResponse.json(
      {
        success: true,
        invitations: result.invitations.map((inv) => ({
          id: inv.id,
          groupId: inv.group_id,
          groupName: inv.groupName,
          groupDescription: inv.groupDescription,
          memberCount: inv.memberCount,
          invitedBy: inv.invitedByUsername,
          status: inv.status,
          invitedAt: inv.invited_at,
          expiresAt: inv.expires_at,
        })),
        total: result.total,
        hasMore: offset + limit < result.total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting user invitations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get invitations',
        errorCode: 'GET_INVITATIONS_FAILED',
      },
      { status: 500 }
    );
  }
}
