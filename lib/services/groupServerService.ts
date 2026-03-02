'use server';

/**
 * Server-only group service functions
 * Uses database queries and other server-side operations
 * This file should only be imported in server components or API routes
 */

import { getGroupDetailsWithMembers } from '@/lib/db/queries';

/**
 * Fetch group details from database (server-only)
 * Used by API routes to query the database directly
 *
 * @param groupId Group ID to fetch details for
 * @param userId Current user ID (for permission checks)
 * @returns Group details with members list
 */
export async function getGroupDetailsFromDb(
  groupId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  data?: {
    group: any;
    members: any[];
    currentUserRole: 'admin' | 'member' | null;
  };
  error?: string;
  errorCode?: string;
}> {
  try {
    const result = await getGroupDetailsWithMembers(groupId, userId);

    if (!result) {
      return {
        success: false,
        message: 'Group not found',
        error: 'NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    // Check if user is a member of the group
    if (!result.currentUserRole) {
      return {
        success: false,
        message: 'You do not have access to this group',
        error: 'FORBIDDEN',
        errorCode: 'FORBIDDEN',
      };
    }

    return {
      success: true,
      message: 'Group details retrieved successfully',
      data: result,
    };
  } catch (error: any) {
    console.error('Get group details from DB error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while retrieving group details',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
