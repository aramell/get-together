import { NextRequest, NextResponse } from 'next/server';
import { getEventComments, addEventComment } from '@/lib/services/eventService';
import { commentSchema } from '@/lib/validation/commentSchema';
import { getSubFromJWT } from '@/lib/auth/jwt';

/**
 * GET /api/groups/:groupId/events/:eventId/comments
 * Retrieve comments for an event
 * Returns comments in chronological order with creator info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; eventId: string } }
): Promise<NextResponse> {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { groupId, eventId } = resolvedParams;

    // Validate parameters
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

    // Get comments
    const result = await getEventComments(eventId, groupId);

    if (!result.success) {
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: result.error || 'Failed to get comments', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Comments retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error in GET /api/groups/:groupId/events/:eventId/comments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/:groupId/events/:eventId/comments
 * Add a comment to an event
 * Requires authentication (JWT) and group membership
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; eventId: string } }
): Promise<NextResponse> {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { groupId, eventId } = resolvedParams;

    // Validate parameters
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

    // Get user from JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = getSubFromJWT(token);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = commentSchema.safeParse({
      content: body.content,
      event_id: eventId,
      group_id: groupId,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError?.message || 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Add comment
    const result = await addEventComment(eventId, groupId, userId, validationResult.data.content);

    if (!result.success) {
      // Map error codes to HTTP status codes
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
        { success: false, error: result.error || 'Failed to create comment', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: result.message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/groups/:groupId/events/:eventId/comments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
