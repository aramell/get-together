import { NextRequest, NextResponse } from 'next/server';
import {
  revokeInvitation,
  getInvitationById,
} from '@/lib/db/queries/invitations';
import { getUserGroupRole } from '@/lib/db/queries/groups';

/**
 * DELETE /api/groups/{groupId}/invitations/{invitationId}
 * Revoke an invitation (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; invitationId: string } }
) {
  try {
    const { groupId, invitationId } = params;
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

    // Check if invitation exists
    const invitation = await getInvitationById(invitationId);
    if (!invitation || invitation.group_id !== groupId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation not found',
          errorCode: 'INVITATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Revoke invitation
    await revokeInvitation(invitationId);

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation revoked',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to revoke invitation',
        errorCode: 'REVOKE_FAILED',
      },
      { status: 500 }
    );
  }
}
