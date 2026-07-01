import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/events/:eventId/public-link
 * Generate a public link for an event (creator or admin only)
 * AC1: Public Event Link Generation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;

    // TODO: Add authentication and authorization check
    // - Extract user from JWT
    // - Verify user is event creator or group admin
    // - Return 403 if not authorized

    // Generate unique public token (32+ chars, URL-safe)
    const publicToken = crypto.randomBytes(24).toString('hex');

    // TODO: Update event_proposals table
    // - Set public_token = publicToken for this event
    // - Handle if token already exists (return existing link)

    const publicLink = `${process.env.NEXT_PUBLIC_BASE_URL}/events/public/${publicToken}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          eventId,
          publicToken,
          publicLink,
        },
        message: 'Public link generated successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating public link:', error);
    return NextResponse.json(
      {
        success: false,
        errorCode: 'PUBLIC_LINK_GENERATION_FAILED',
        message: 'Failed to generate public link',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/:eventId/public-link
 * Revoke a public link for an event (creator or admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;

    // TODO: Add authentication and authorization check
    // - Extract user from JWT
    // - Verify user is event creator or group admin
    // - Return 403 if not authorized

    // TODO: Update event_proposals table
    // - Set public_token = null for this event
    // - Effectively disables the public link

    return NextResponse.json(
      {
        success: true,
        data: { eventId },
        message: 'Public link revoked successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error revoking public link:', error);
    return NextResponse.json(
      {
        success: false,
        errorCode: 'PUBLIC_LINK_REVOCATION_FAILED',
        message: 'Failed to revoke public link',
      },
      { status: 500 }
    );
  }
}
