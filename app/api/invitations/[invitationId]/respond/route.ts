import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getInvitationById,
  updateInvitationStatus,
} from '@/lib/db/queries/invitations';
import { addUserToGroup } from '@/lib/db/queries';

const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

/**
 * POST /api/invitations/{invitationId}/respond
 * Accept or decline an invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params;
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

    // Validate request body
    const body = await request.json();
    const { action } = respondSchema.parse(body);

    // Get invitation
    const invitation = await getInvitationById(invitationId);
    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation not found',
          errorCode: 'INVITATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if invitation is for this user
    if (invitation.invited_user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authorized',
          errorCode: 'NOT_AUTHORIZED',
        },
        { status: 403 }
      );
    }

    // Check if invitation is pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation already responded to',
          errorCode: 'ALREADY_RESPONDED',
        },
        { status: 409 }
      );
    }

    // Check if invitation expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invitation has expired',
          errorCode: 'INVITATION_EXPIRED',
        },
        { status: 410 }
      );
    }

    if (action === 'accept') {
      // Add user to group
      await addUserToGroup(invitation.group_id, userId, 'member');

      // Update invitation status
      await updateInvitationStatus(invitationId, 'accepted');

      return NextResponse.json(
        {
          success: true,
          message: 'Invitation accepted',
          groupId: invitation.group_id,
        },
        { status: 200 }
      );
    } else {
      // Just decline, don't add to group
      await updateInvitationStatus(invitationId, 'declined');

      return NextResponse.json(
        {
          success: true,
          message: 'Invitation declined',
        },
        { status: 200 }
      );
    }
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

    console.error('Error responding to invitation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to respond to invitation',
        errorCode: 'RESPOND_FAILED',
      },
      { status: 500 }
    );
  }
}
