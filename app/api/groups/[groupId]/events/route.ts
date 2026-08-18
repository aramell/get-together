import { NextRequest, NextResponse } from 'next/server';
import { createEvent, getGroupEvents } from '@/lib/services/eventService';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { eventCreateSchema } from '@/lib/validation/eventSchema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const resolvedParams = await params;
    // Get user ID from JWT token
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Parse pagination parameters from query string
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    const options: { limit?: number; offset?: number } = {};
    if (limit) {
      let parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit)) {
        // Validate bounds: min 1, max 100 to prevent DOS
        parsedLimit = Math.max(1, Math.min(100, parsedLimit));
        options.limit = parsedLimit;
      }
    }
    if (offset) {
      let parsedOffset = parseInt(offset);
      if (!isNaN(parsedOffset)) {
        // Validate bounds: min 0, prevent negative offsets
        parsedOffset = Math.max(0, parsedOffset);
        options.offset = parsedOffset;
      }
    }

    const result = await getGroupEvents(resolvedParams.groupId, userId, options);

    if (!result.success) {
      // Return appropriate status code based on error type
      const statusCode = result.errorCode === 'FORBIDDEN' ? 403 : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching group events:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching events',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/[groupId]/events
 * Propose a new event in the group; auto-RSVPs the creator as "in"
 * Body: { title, date, threshold?, description? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    let data;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON in request body',
          error: 'INVALID_REQUEST',
          errorCode: 'BAD_REQUEST',
        },
        { status: 400 }
      );
    }

    const validation = eventCreateSchema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.issues[0]?.message || 'Validation failed',
          error: 'VALIDATION_ERROR',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    const result = await createEvent(groupId, userId, validation.data);

    if (!result.success) {
      const statusCode = result.errorCode === 'FORBIDDEN' ? 403 : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating the event',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
