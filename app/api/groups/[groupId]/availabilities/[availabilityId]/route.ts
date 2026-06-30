import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserGroupRole, getGroupById } from '@/lib/db/queries';
import { updateAvailability, deleteAvailability } from '@/lib/services/availabilityService';
import { getAvailabilityById } from '@/lib/db/queries';

/**
 * PATCH /api/groups/{groupId}/availabilities/{availabilityId}
 * Update an existing availability entry (times, status)
 * Authentication: Required (x-user-id header)
 * Authorization: Must be group member and availability owner
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ groupId: string; availabilityId: string }>;
  }
) {
  try {
    const { groupId, availabilityId } = await params;
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

    // Validate groupId and availabilityId are valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!groupId || !uuidRegex.test(groupId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid group ID format',
          errorCode: 'INVALID_GROUP_ID',
        },
        { status: 400 }
      );
    }

    if (!availabilityId || !uuidRegex.test(availabilityId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid availability ID format',
          errorCode: 'INVALID_AVAILABILITY_ID',
        },
        { status: 400 }
      );
    }

    // Check if group exists
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

    // Get the current availability to check ownership
    const currentAvailability = await getAvailabilityById(availabilityId);
    if (!currentAvailability) {
      return NextResponse.json(
        {
          success: false,
          error: 'Availability not found',
          errorCode: 'AVAILABILITY_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Verify the availability belongs to this group
    if (currentAvailability.group_id !== groupId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Availability does not belong to this group',
          errorCode: 'INVALID_AVAILABILITY',
        },
        { status: 400 }
      );
    }

    // Parse and validate request body with comprehensive validation
    const updateSchema = z
      .object({
        startTime: z
          .string()
          .datetime()
          .refine((val) => /Z$|[+-]\d{2}:\d{2}$/.test(val), {
            message: 'Start time must include timezone info (Z or ±HH:MM)',
          }),
        endTime: z
          .string()
          .datetime()
          .refine((val) => /Z$|[+-]\d{2}:\d{2}$/.test(val), {
            message: 'End time must include timezone info (Z or ±HH:MM)',
          }),
        status: z.enum(['free', 'busy']),
        version: z.number().int().positive(),
      })
      .refine((data) => {
        const startDate = new Date(data.startTime);
        const endDate = new Date(data.endTime);
        return endDate > startDate;
      }, {
        message: 'End time must be after start time',
        path: ['endTime'],
      })
      .refine((data) => {
        const startDate = new Date(data.startTime);
        const endDate = new Date(data.endTime);
        const durationHours =
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        return durationHours <= 24;
      }, {
        message: 'Availability duration cannot exceed 24 hours',
        path: ['endTime'],
      });

    const body = await request.json();
    const validationResult = updateSchema.safeParse(body);

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

    const { startTime, endTime, status, version } = validationResult.data;

    // Call service layer to update
    const result = await updateAvailability(
      availabilityId,
      userId,
      startTime,
      endTime,
      status,
      version,
      currentAvailability
    );

    if (!result.success) {
      if (result.errorCode === 'CONFLICT') {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            errorCode: result.errorCode,
            message: result.message,
          },
          { status: 409 }
        );
      }

      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            errorCode: result.errorCode,
            message: result.message,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          message: result.message,
        },
        { status: result.errorCode === 'VALIDATION_ERROR' ? 422 : 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update availability',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/{groupId}/availabilities/{availabilityId}
 * Delete an availability entry
 * Authentication: Required (x-user-id header)
 * Authorization: Must be group member and availability owner
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ groupId: string; availabilityId: string }>;
  }
) {
  try {
    const { groupId, availabilityId } = await params;
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

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!groupId || !uuidRegex.test(groupId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid group ID format',
          errorCode: 'INVALID_GROUP_ID',
        },
        { status: 400 }
      );
    }

    if (!availabilityId || !uuidRegex.test(availabilityId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid availability ID format',
          errorCode: 'INVALID_AVAILABILITY_ID',
        },
        { status: 400 }
      );
    }

    // Check if group exists
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

    // Get the current availability to check ownership
    const currentAvailability = await getAvailabilityById(availabilityId);
    if (!currentAvailability) {
      return NextResponse.json(
        {
          success: false,
          error: 'Availability not found',
          errorCode: 'AVAILABILITY_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Verify the availability belongs to this group
    if (currentAvailability.group_id !== groupId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Availability does not belong to this group',
          errorCode: 'INVALID_AVAILABILITY',
        },
        { status: 400 }
      );
    }

    // Call service layer to delete
    const result = await deleteAvailability(availabilityId, userId, currentAvailability);

    if (!result.success) {
      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            errorCode: result.errorCode,
            message: result.message,
          },
          { status: 403 }
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
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting availability:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete availability',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
