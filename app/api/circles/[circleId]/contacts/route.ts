import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { addContactByPhone, addContactByUsername } from '@/lib/services/circleService';
import { z } from 'zod';

const addContactRequestSchema = z.object({
  type: z.enum(['phone', 'user']),
  value: z.string(),
});

function statusForErrorCode(errorCode?: string): number {
  switch (errorCode) {
    case 'NOT_FOUND':
      return 404;
    case 'FORBIDDEN':
      return 403;
    case 'INTERNAL_ERROR':
      return 500;
    default:
      return 422;
  }
}

/**
 * POST /api/circles/{circleId}/contacts
 * Add a contact (by phone number or app username) to a social circle
 * Body: { type: 'phone' | 'user', value: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string }> }
) {
  try {
    const { circleId } = await params;
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
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

    const parsed = addContactRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message || 'Validation failed',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    const result =
      parsed.data.type === 'phone'
        ? await addContactByPhone(circleId, userId, parsed.data.value)
        : await addContactByUsername(circleId, userId, parsed.data.value);

    if (!result.success) {
      return NextResponse.json(result, { status: statusForErrorCode(result.errorCode) });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error adding circle contact:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while adding the contact',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
