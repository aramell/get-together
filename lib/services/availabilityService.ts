import { AvailabilityInput, Availability } from '@/lib/validation/availabilitySchema';
import {
  createAvailability as createAvailabilityDb,
  checkDuplicateAvailability,
  getGroupAvailabilities as getGroupAvailabilitiesDb,
} from '@/lib/db/queries';

/**
 * Create a new availability entry (free/busy time block)
 * Handles validation, duplicate checking, and database operations
 */
export async function createAvailability(
  userId: string,
  groupId: string,
  input: AvailabilityInput
): Promise<{
  success: boolean;
  message: string;
  data?: Availability;
  error?: string;
  errorCode?: string;
}> {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        message: 'Group ID is required',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!input || typeof input !== 'object') {
      return {
        success: false,
        message: 'Invalid input provided',
        error: 'INVALID_INPUT',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Check for duplicate availability
    const duplicate = await checkDuplicateAvailability(
      userId,
      groupId,
      input.start_time,
      input.end_time
    );

    if (duplicate) {
      return {
        success: false,
        message: 'This time is already marked as ' + duplicate.status,
        error: 'DUPLICATE_AVAILABILITY',
        errorCode: 'CONFLICT',
        data: duplicate as any,
      };
    }

    // Create availability entry in database
    const availability = await createAvailabilityDb(
      userId,
      groupId,
      input.start_time,
      input.end_time,
      input.status
    );

    return {
      success: true,
      message: 'Availability created successfully',
      data: availability as Availability,
    };
  } catch (error: any) {
    console.error('Create availability error:', error);
    return {
      success: false,
      message: 'Failed to create availability',
      error: error?.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Create recurring availability entries (e.g., daily or weekly busy blocks)
 * Generates multiple availability entries based on the recurring pattern
 */
export async function createRecurringAvailability(
  userId: string,
  groupId: string,
  startTime: string,
  endTime: string,
  status: 'free' | 'busy',
  recurringPattern: 'daily' | 'weekly',
  recurringEndDate: string
): Promise<{
  success: boolean;
  message: string;
  data?: Array<{ id: string; start_time: string; end_time: string }>;
  error?: string;
  errorCode?: string;
}> {
  try {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        message: 'Group ID is required',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!recurringPattern || !['daily', 'weekly'].includes(recurringPattern)) {
      return {
        success: false,
        message: 'Recurring pattern must be daily or weekly',
        error: 'INVALID_RECURRING_PATTERN',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Validate dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const repeatUntil = new Date(recurringEndDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(repeatUntil.getTime())) {
      return {
        success: false,
        message: 'Invalid date format',
        error: 'INVALID_DATE_FORMAT',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (repeatUntil <= startDate) {
      return {
        success: false,
        message: 'Recurring end date must be after start time',
        error: 'INVALID_RECURRING_END_DATE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Generate occurrence dates
    const occurrences: { startTime: string; endTime: string }[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= repeatUntil) {
      const occurrenceStart = new Date(currentDate);
      const occurrenceEnd = new Date(currentDate);

      // Set times from original start/end
      occurrenceStart.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());
      occurrenceEnd.setHours(endDate.getHours(), endDate.getMinutes(), endDate.getSeconds());

      occurrences.push({
        startTime: occurrenceStart.toISOString(),
        endTime: occurrenceEnd.toISOString(),
      });

      // Move to next occurrence
      if (recurringPattern === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (recurringPattern === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    // Create availability entries for each occurrence
    const created: Array<{ id: string; start_time: string; end_time: string }> = [];
    const errors: Array<{ occurrence: number; error: string }> = [];

    for (let i = 0; i < occurrences.length; i++) {
      try {
        // Check for conflicts
        const duplicate = await checkDuplicateAvailability(
          userId,
          groupId,
          occurrences[i].startTime,
          occurrences[i].endTime
        );

        if (duplicate) {
          errors.push({
            occurrence: i + 1,
            error: `Time already marked as ${duplicate.status}`,
          });
          continue;
        }

        // Create the availability
        const availability = await createAvailabilityDb(
          userId,
          groupId,
          occurrences[i].startTime,
          occurrences[i].endTime,
          status
        );

        created.push({
          id: availability.id,
          start_time: availability.start_time,
          end_time: availability.end_time,
        });
      } catch (error: any) {
        errors.push({
          occurrence: i + 1,
          error: error?.message || 'Unknown error',
        });
      }
    }

    if (created.length === 0) {
      return {
        success: false,
        message: `Failed to create any recurring availability entries. Errors: ${errors
          .map((e) => `occurrence ${e.occurrence}: ${e.error}`)
          .join('; ')}`,
        error: 'ALL_OCCURRENCES_FAILED',
        errorCode: 'CONFLICT',
      };
    }

    const message =
      created.length === occurrences.length
        ? `Successfully created ${created.length} recurring availability entries`
        : `Created ${created.length} of ${occurrences.length} recurring entries. ${errors.length} failed: ${errors
            .map((e) => `occurrence ${e.occurrence}: ${e.error}`)
            .join('; ')}`;

    return {
      success: true,
      message,
      data: created,
    };
  } catch (error: any) {
    console.error('Create recurring availability error:', error);
    return {
      success: false,
      message: 'Failed to create recurring availability',
      error: error?.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get all availabilities for a group within a date range
 */
export async function getGroupAvailabilities(
  groupId: string,
  startDate: string,
  endDate: string
): Promise<{
  success: boolean;
  message: string;
  data?: any[];
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        message: 'Group ID is required',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const availabilities = await getGroupAvailabilitiesDb(groupId, startDate, endDate);

    return {
      success: true,
      message: 'Availabilities retrieved successfully',
      data: availabilities,
    };
  } catch (error: any) {
    console.error('Get group availabilities error:', error);
    return {
      success: false,
      message: 'Failed to retrieve availabilities',
      error: error?.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
