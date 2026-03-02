import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createInvitation,
  hasPendingInvitation,
  getPendingInvitationsForGroup,
} from '@/lib/db/queries/invitations';
import { isGroupMember, getUserGroupRole } from '@/lib/db/queries/groups';

const inviteSchema = z.object({
  invitedUserId: z.string().uuid('Invalid user ID'),
});

/**
 * POST /api/groups/{groupId}/invitations
 * Send invitation to user to join group
 */
export async function POST(
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
    const { invitedUserId } = inviteSchema.parse(body);

    // Cannot invite self
    if (invitedUserId === userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot invite yourself',
          errorCode: 'CANNOT_INVITE_SELF',
        },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const isMember = await isGroupMember(groupId, invitedUserId);
    if (isMember) {
      return NextResponse.json(
        {
          success: false,
          error: 'User is already a member',
          errorCode: 'USER_ALREADY_MEMBER',
        },
        { status: 400 }
      );
    }

    // Check if invitation already pending
    const hasPending = await hasPendingInvitation(groupId, invitedUserId);
    if (hasPending) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation already pending',
          errorCode: 'INVITE_ALREADY_PENDING',
        },
        { status: 400 }
      );
    }

    // Create invitation
    const invitation = await createInvitation(groupId, invitedUserId, userId);

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sent',
        invitation: {
          id: invitation.id,
          groupId: invitation.group_id,
          invitedUserId: invitation.invited_user_id,
          status: invitation.status,
          expiresAt: invitation.expires_at,
        },
      },
      { status: 201 }
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

    console.error('Error creating invitation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send invitation',
        errorCode: 'INVITATION_FAILED',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/groups/{groupId}/invitations?status=pending&limit=10&offset=0
 * Get pending invitations for group
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

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getPendingInvitationsForGroup(groupId, limit, offset);

    return NextResponse.json(
      {
        success: true,
        invitations: result.invitations,
        total: result.total,
        hasMore: offset + limit < result.total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting invitations:', error);
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
