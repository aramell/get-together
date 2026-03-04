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
