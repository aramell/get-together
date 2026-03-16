import { NextRequest, NextResponse } from 'next/server';
import { getGroupEvents } from '@/lib/services/eventService';
import { getUserIdFromRequest } from '@/lib/api/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
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
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit)) options.limit = parsedLimit;
    }
    if (offset) {
      const parsedOffset = parseInt(offset);
      if (!isNaN(parsedOffset)) options.offset = parsedOffset;
    }

    const result = await getGroupEvents(params.groupId, userId, options);

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
