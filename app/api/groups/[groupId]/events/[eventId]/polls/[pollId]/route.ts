import { NextRequest, NextResponse } from 'next/server';
import { deletePoll } from '@/lib/services/eventPollService';
import { getVerifiedSubFromJWT } from '@/lib/auth/jwt';

/**
 * DELETE /api/groups/:groupId/events/:eventId/polls/:pollId
 * Creator or group admin only. Cascades to delete options and votes.
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

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = await getVerifiedSubFromJWT(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await deletePoll(eventId, groupId, pollId, userId);

    if (!result.success) {
      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to delete poll', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Error in DELETE /api/groups/:groupId/events/:eventId/polls/:pollId:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
