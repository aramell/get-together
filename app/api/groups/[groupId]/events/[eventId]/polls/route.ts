import { NextRequest, NextResponse } from 'next/server';
import { getPolls, createPoll } from '@/lib/services/eventPollService';
import { getVerifiedSubFromJWT } from '@/lib/auth/jwt';

/**
 * GET /api/groups/:groupId/events/:eventId/polls
 * List polls (with aggregated vote counts and the caller's current vote) for
 * an event. Requires group membership.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId } = await Promise.resolve(params);

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID', errorCode: 'INVALID_GROUP_ID' },
        { status: 400 }
      );
    }

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID', errorCode: 'INVALID_EVENT_ID' },
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

    const result = await getPolls(eventId, groupId, userId);

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
        { success: false, error: result.error || 'Failed to get polls', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Polls retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error in GET /api/groups/:groupId/events/:eventId/polls:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/:groupId/events/:eventId/polls
 * Create a poll (question + 2 or more options). Requires group membership.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId } = await Promise.resolve(params);

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID', errorCode: 'INVALID_GROUP_ID' },
        { status: 400 }
      );
    }

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID', errorCode: 'INVALID_EVENT_ID' },
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

    const body = await request.json();

    if (!body.question || typeof body.question !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Question is required', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.options) || body.options.length < 2) {
      return NextResponse.json(
        { success: false, error: 'At least 2 options are required', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await createPoll(eventId, groupId, userId, body.question, body.options);

    if (!result.success) {
      if (result.errorCode === 'VALIDATION_ERROR') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
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
        { success: false, error: result.error || 'Failed to create poll', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data, message: result.message },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/groups/:groupId/events/:eventId/polls:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
