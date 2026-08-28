import { NextRequest, NextResponse } from 'next/server';
import { castVote, removeVote } from '@/lib/services/eventPollService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

function statusForErrorCode(errorCode?: string): number {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    default:
      return 500;
  }
}

/**
 * POST /api/groups/:groupId/events/:eventId/polls/:pollId/vote
 * Cast or change a vote (body: option_id). Upserts on (poll_id, user_id).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string; pollId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId, pollId } = await Promise.resolve(params);

    if (!groupId || !eventId || !pollId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const userId = await getUserIdFromBearerToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (!body.option_id || typeof body.option_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'option_id is required', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await castVote(eventId, groupId, pollId, userId, body.option_id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, errorCode: result.errorCode },
        { status: statusForErrorCode(result.errorCode) }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data, message: result.message },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/groups/:groupId/events/:eventId/polls/:pollId/vote:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/:groupId/events/:eventId/polls/:pollId/vote
 * Remove the caller's own vote (abstain). Claimant derived from the JWT.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string; pollId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId, pollId } = await Promise.resolve(params);

    if (!groupId || !eventId || !pollId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const userId = await getUserIdFromBearerToken(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await removeVote(eventId, groupId, pollId, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, errorCode: result.errorCode },
        { status: statusForErrorCode(result.errorCode) }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Error in DELETE /api/groups/:groupId/events/:eventId/polls/:pollId/vote:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
