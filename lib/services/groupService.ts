import { CreateGroupInput, CreateGroupResponse, Group } from '@/lib/validation/groupSchema';
import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure, non-guessable invite code
 * Uses 8 random bytes converted to 16-character hex string
 */
function generateInviteCode(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Construct invite URL from invite code
 */
function constructInviteUrl(inviteCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gettogether.app';
  return `${baseUrl}/join/${inviteCode}`;
}

/**
 * Create a new group
 * Handles transactional creation: group + add creator as admin member
 *
 * @param userId User ID of the group creator
 * @param input Group creation input (name, description)
 * @returns CreateGroupResponse with created group or error details
 */
export async function createGroup(
  userId: string,
  input: CreateGroupInput
): Promise<CreateGroupResponse> {
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

    if (!input || typeof input !== 'object') {
      return {
        success: false,
        message: 'Invalid input provided',
        error: 'INVALID_INPUT',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Validate input against schema (redundant but good practice)
    const validatedInput = {
      name: input.name?.trim() || '',
      description: input.description?.trim() || null,
    };

    if (!validatedInput.name) {
      return {
        success: false,
        message: 'Group name is required',
        error: 'MISSING_NAME',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (validatedInput.name.length > 100) {
      return {
        success: false,
        message: 'Group name must be 100 characters or less',
        error: 'NAME_TOO_LONG',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (validatedInput.description && validatedInput.description.length > 500) {
      return {
        success: false,
        message: 'Description must be 500 characters or less',
        error: 'DESCRIPTION_TOO_LONG',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Generate invite code (cryptographically secure)
    const inviteCode = generateInviteCode();
    const inviteUrl = constructInviteUrl(inviteCode);

    // Create group via API call
    // In production, this would be a database transaction
    // For MVP, we call the API endpoint which handles the database operations
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: validatedInput.name,
        description: validatedInput.description,
        invite_code: inviteCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to create group',
        error: errorData.error,
        errorCode: errorData.errorCode || 'CREATE_GROUP_ERROR',
      };
    }

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: 'Group created successfully',
        group: data.group,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to create group',
        error: data.error,
        errorCode: data.errorCode || 'CREATE_GROUP_ERROR',
      };
    }
  } catch (error: any) {
    console.error('Group creation error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while creating the group',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get group by ID
 * Requires authentication - user must be a member of the group
 */
export async function getGroup(groupId: string): Promise<CreateGroupResponse> {
  try {
    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        message: 'Group ID is required',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/groups/${groupId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || 'Failed to retrieve group',
        error: errorData.error,
        errorCode: errorData.errorCode || 'GET_GROUP_ERROR',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Group retrieved successfully',
      group: data.group,
    };
  } catch (error: any) {
    console.error('Get group error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while retrieving the group',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
