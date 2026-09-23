import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import {
  getCircleDetailService,
  updateCircleNameService,
  deleteCircleService,
} from '@/lib/services/circleService';

function statusForErrorCode(errorCode: string | undefined, defaultStatus: number): number {
  switch (errorCode) {
    case 'NOT_FOUND':
      return 404;
    case 'FORBIDDEN':
      return 403;
    case 'VALIDATION_ERROR':
      return 422;
    default:
      return defaultStatus;
  }
}

/**
 * GET /api/circles/{circleId}
 * Fetch a circle's details, including its contacts (Story 10.3, AC3)
 */
export async function GET(
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

    const result = await getCircleDetailService(circleId, userId);

    if (!result.success) {
      return NextResponse.json(result, { status: statusForErrorCode(result.errorCode, 500) });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching circle detail:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching the circle',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/circles/{circleId}
 * Rename a circle (Story 10.3, AC4)
 * Body: { name: string }
 */
export async function PATCH(
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

    const result = await updateCircleNameService(circleId, userId, body);

    if (!result.success) {
      return NextResponse.json(result, { status: statusForErrorCode(result.errorCode, 422) });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error renaming circle:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while renaming the circle',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/circles/{circleId}
 * Delete a circle and its contacts (Story 10.3, AC5)
 */
export async function DELETE(
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

    const result = await deleteCircleService(circleId, userId);

    if (!result.success) {
      return NextResponse.json(result, { status: statusForErrorCode(result.errorCode, 500) });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting circle:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while deleting the circle',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
