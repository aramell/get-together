import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateEventRsvp } from '@/lib/services/eventService';

// Validation schema for RSVP request
const rsvpSchema = z.object({
  status: z.enum(['in', 'maybe', 'out']).describe('RSVP status'),
});

type RsvpRequest = z.infer<typeof rsvpSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
) {
  try {
    const resolvedParams = await params;
    // Extract user ID from header
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    let validatedData: RsvpRequest;

    try {
      validatedData = rsvpSchema.parse(body);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error: ' + validationError.errors[0].message,
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    // Call service function to update RSVP
    const result = await updateEventRsvp(resolvedParams.eventId, userId, validatedData.status);

    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusCode =
        result.errorCode === 'NOT_FOUND'
          ? 404
          : result.errorCode === 'FORBIDDEN'
            ? 403
            : result.errorCode === 'VALIDATION_ERROR'
              ? 400
              : result.errorCode === 'CONFLICT'
                ? 409
                : 500;

      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error in RSVP endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
