import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

/**
 * Generate a cryptographically secure invite code (16 hex characters)
 */
function generateInviteCode(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Construct invite URL from invite code
 */
function constructInviteUrl(inviteCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gettogether.app';
  return `${baseUrl}/join/${inviteCode}`;
}

/**
 * POST /api/groups/{groupId}/regenerate-invite
 * Regenerate invite code for a group (admin only)
 * Old code becomes inactive immediately
 * Existing members retain access (tracked separately in group_memberships)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const client = await getClient();

  try {
    const { groupId } = await params;
    const userId = request.headers.get('x-user-id');

    // Validate authentication
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          errorCode: 'UNAUTHORIZED',
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
          message: 'Only group admins can regenerate invite links',
          error: 'NOT_ADMIN',
          errorCode: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Verify group exists
    const groupResult = await client.query(
      'SELECT id, invite_code FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Group not found',
          error: 'NOT_FOUND',
          errorCode: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Generate new invite code
    const newInviteCode = generateInviteCode();
    const newInviteUrl = constructInviteUrl(newInviteCode);

    // Update group with new invite code (old code becomes inactive)
    const updateResult = await client.query(
      `UPDATE groups
       SET invite_code = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, invite_code, created_at, updated_at`,
      [newInviteCode, groupId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to update group',
          error: 'UPDATE_FAILED',
          errorCode: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Invite code regenerated successfully',
        data: {
          inviteCode: newInviteCode,
          inviteUrl: newInviteUrl,
          oldCodeInvalidated: true,
          existingMembersPreserved: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error regenerating invite code:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while regenerating the invite code',
        error: 'INTERNAL_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
