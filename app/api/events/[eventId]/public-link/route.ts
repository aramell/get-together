import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { generatePublicEventLink, revokePublicEventLink } from '@/lib/services/publicEventService';

function statusForErrorCode(errorCode?: 'NOT_FOUND' | 'FORBIDDEN'): number {
  if (errorCode === 'FORBIDDEN') return 403;
  if (errorCode === 'NOT_FOUND') return 404;
  return 500;
}

/**
 * POST /api/events/:eventId/public-link
 * Generate a public link for an event (creator or group admin only)
 * AC1: Public Event Link Generation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await generatePublicEventLink(eventId, userId);

    if (!result.success || !result.publicToken || !result.publicUrl) {
      return NextResponse.json(
        { success: false, errorCode: result.errorCode || 'PUBLIC_LINK_GENERATION_FAILED', message: result.message },
        { status: statusForErrorCode(result.errorCode) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          eventId,
          publicToken: result.publicToken,
          publicLink: `${request.nextUrl.origin}${result.publicUrl}`,
        },
        message: result.message,
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
 * Revoke a public link for an event (creator or group admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, errorCode: 'UNAUTHORIZED', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await revokePublicEventLink(eventId, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, errorCode: result.errorCode || 'PUBLIC_LINK_REVOCATION_FAILED', message: result.message },
        { status: statusForErrorCode(result.errorCode) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { eventId },
        message: result.message,
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
