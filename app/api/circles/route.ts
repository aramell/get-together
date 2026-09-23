import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { createCircleService, getUserCirclesService } from '@/lib/services/circleService';
import { createCircleSchema } from '@/lib/validation/circleSchema';

/**
 * GET /api/circles
 * List the current user's social circles
 */
export async function GET(request: NextRequest) {
  try {
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

    const result = await getUserCirclesService(userId);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching social circles:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching circles',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/circles
 * Create a new social circle
 * Body: { name: string }
 */
export async function POST(request: NextRequest) {
  try {
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

    try {
      createCircleSchema.parse(data);
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          message: error.errors?.[0]?.message || 'Validation failed',
          error: 'VALIDATION_ERROR',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    const result = await createCircleService(userId, data);

    if (!result.success) {
      const statusCode = result.errorCode === 'VALIDATION_ERROR' ? 422 : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error creating social circle:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating the circle',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
