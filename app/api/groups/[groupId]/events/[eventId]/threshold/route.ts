import { NextRequest, NextResponse } from 'next/server';
import { updateEventThreshold } from '@/lib/services/eventService';
import { z } from 'zod';

const updateThresholdSchema = z.object({
  threshold: z.union([z.number().int().positive().max(1000), z.null()]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
) {
  try {
    const resolvedParams = await params;
    // Get user ID from header
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'NO_USER_ID',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request body
    const validatedBody = updateThresholdSchema.parse(body);
    const newThreshold = validatedBody.threshold !== undefined ? validatedBody.threshold : null;

    // Call service function
    const result = await updateEventThreshold(resolvedParams.eventId, userId, newThreshold);

    if (!result.success) {
      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(result, { status: 403 });
      }
      if (result.errorCode === 'NOT_FOUND') {
        return NextResponse.json(result, { status: 404 });
      }
      if (result.errorCode === 'CONFLICT') {
        return NextResponse.json(result, { status: 409 });
      }
      if (result.errorCode === 'VALIDATION_ERROR') {
        return NextResponse.json(result, { status: 400 });
      }
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error in PATCH /events/[eventId]/threshold:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const zodError = error as any;
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          error: zodError.errors[0].message,
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while updating the threshold',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
