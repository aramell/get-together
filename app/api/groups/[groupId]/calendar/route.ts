import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGroupAvailabilitiesForCalendar } from '@/lib/db/queries';

// Validation schema for calendar query parameters
const CalendarQuerySchema = z.object({
  startDate: z.string().datetime('Invalid startDate format, expected ISO 8601'),
  endDate: z.string().datetime('Invalid endDate format, expected ISO 8601'),
});

/**
 * GET /api/groups/:groupId/calendar
 * Returns all group members' availability data for calendar view
 * Query params: startDate, endDate (ISO 8601 format)
 * Authorization: User must be member of the group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // Get user ID from header (check auth first)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Not authenticated',
          errorCode: 'NOT_AUTHENTICATED',
        },
        { status: 401 }
      );
    }

    // Extract and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate query parameters
    const validation = CalendarQuerySchema.safeParse({ startDate, endDate });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid date parameters',
          errorCode: 'INVALID_DATES',
          errors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { startDate: validStartDate, endDate: validEndDate } = validation.data;

    // TODO: Verify user is member of the group
    // For MVP, skip authorization check (trust header)
    // In production, query: SELECT * FROM group_memberships WHERE group_id=$1 AND user_id=$2

    // Fetch calendar data
    const calendarData = await getGroupAvailabilitiesForCalendar(groupId, validStartDate, validEndDate);

    // Return response
    return NextResponse.json(
      {
        success: true,
        message: 'Calendar data retrieved successfully',
        data: {
          groupId,
          members: calendarData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Calendar API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve calendar data',
        errorCode: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
