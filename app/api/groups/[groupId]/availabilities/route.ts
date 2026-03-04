import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserGroupRole,
  getGroupById,
} from '@/lib/db/queries';
import {
  createAvailability,
  getGroupAvailabilities,
} from '@/lib/services/availabilityService';
import { availabilityInputSchema } from '@/lib/validation/availabilitySchema';

/**
 * POST /api/groups/{groupId}/availabilities
 * Create a new availability entry (free/busy time block)
 * Authentication: Required (x-user-id header)
 * Authorization: Must be group member
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const userId = request.headers.get('x-user-id');

    // Validate authentication
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // Validate groupId is valid UUID format
    if (
      !groupId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        groupId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid group ID format',
          errorCode: 'INVALID_GROUP_ID',
        },
        { status: 400 }
      );
    }

    // Check if group exists and not deleted
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        {
          success: false,
          error: 'Group not found',
          errorCode: 'GROUP_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if user is a member of the group
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not a member of this group',
          errorCode: 'NOT_GROUP_MEMBER',
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = availabilityInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    // Create availability using service layer
    const result = await createAvailability(userId, groupId, validationResult.data);

    if (!result.success) {
      if (result.errorCode === 'CONFLICT') {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            errorCode: result.errorCode,
            message: result.message,
            data: result.data,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          message: result.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create availability',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/groups/{groupId}/availabilities?startDate=<ISO>&endDate=<ISO>
 * Get all availabilities for a group within a date range
 * Authentication: Required (x-user-id header)
 * Authorization: Must be group member
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const userId = request.headers.get('x-user-id');

    // Validate authentication
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // Validate groupId is valid UUID format
    if (
      !groupId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        groupId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid group ID format',
          errorCode: 'INVALID_GROUP_ID',
        },
        { status: 400 }
      );
    }

    // Check if group exists and not deleted
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        {
          success: false,
          error: 'Group not found',
          errorCode: 'GROUP_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if user is a member of the group
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not a member of this group',
          errorCode: 'NOT_GROUP_MEMBER',
        },
        { status: 403 }
      );
    }

    // Get query parameters for date range
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate date parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate and endDate query parameters are required',
          errorCode: 'MISSING_PARAMS',
        },
        { status: 400 }
      );
    }

    // Validate date format (ISO 8601: YYYY-MM-DDTHH:mm:ssZ)
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$/;
    if (!iso8601Regex.test(startDate) || !iso8601Regex.test(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use ISO 8601 format (e.g., 2026-03-04T00:00:00Z)',
          errorCode: 'INVALID_DATE_FORMAT',
        },
        { status: 400 }
      );
    }

    // Validate dates are parseable
    try {
      new Date(startDate).toISOString();
      new Date(endDate).toISOString();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use ISO 8601 format (e.g., 2026-03-04T00:00:00Z)',
          errorCode: 'INVALID_DATE_FORMAT',
        },
        { status: 400 }
      );
    }

    // Fetch availabilities for the date range
    const result = await getGroupAvailabilities(groupId, startDate, endDate);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          message: result.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.data,
        count: result.data?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching availabilities:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch availabilities',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
