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

/**
 * Get all groups for a user
 * Returns groups sorted by last activity date (most recent first)
 * Includes member count and user's role in each group
 */
export async function getGroupsByUser(userId: string): Promise<{
  success: boolean;
  message: string;
  groups?: any[];
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/groups?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || 'Failed to retrieve groups',
        error: errorData.error,
        errorCode: errorData.errorCode || 'GET_GROUPS_ERROR',
      };
    }

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: 'Groups retrieved successfully',
        groups: data.groups || [],
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to retrieve groups',
        error: data.error,
        errorCode: data.errorCode || 'GET_GROUPS_ERROR',
      };
    }
  } catch (error: any) {
    console.error('Get groups error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while retrieving groups',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Join a group using an invite code
 * Sends POST request to /api/groups/join/:inviteCode
 *
 * @param inviteCode 16-character hex invite code
 * @returns JoinGroupResponse with success status and group details
 */
export async function joinGroup(inviteCode: string): Promise<{
  success: boolean;
  message: string;
  group?: {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
    invite_code: string;
    created_at: string;
    updated_at: string;
  };
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!inviteCode || typeof inviteCode !== 'string') {
      return {
        success: false,
        message: 'Invite code is required',
        error: 'INVALID_INVITE_CODE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Validate invite code format (16 hex characters)
    if (!/^[a-f0-9]{16}$/.test(inviteCode)) {
      return {
        success: false,
        message: 'Invalid invite code format',
        error: 'INVALID_INVITE_CODE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/groups/join/${inviteCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED',
        errorCode: 'UNAUTHORIZED',
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        message: 'Invalid or expired invite code',
        error: 'INVALID_INVITE_CODE',
        errorCode: 'NOT_FOUND',
      };
    }

    if (response.status === 409) {
      return {
        success: false,
        message: 'You are already a member of this group',
        error: 'ALREADY_MEMBER',
        errorCode: 'CONFLICT',
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || 'Failed to join group',
        error: errorData.error,
        errorCode: errorData.errorCode || 'JOIN_GROUP_ERROR',
      };
    }

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: data.message || 'Successfully joined group',
        group: data.group,
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to join group',
        error: data.error,
        errorCode: data.errorCode || 'JOIN_GROUP_ERROR',
      };
    }
  } catch (error: any) {
    console.error('Join group error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while joining the group',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get detailed group information with member list
 * Requires user to be authenticated and a member of the group
 * Returns group info, member list, and user's role in the group
 *
 * @param groupId Group ID to fetch details for
 * @returns GroupDetailsResponse with group, members, and currentUserRole
 */
export async function getGroupDetails(groupId: string): Promise<{
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

    if (response.status === 401) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED',
        errorCode: 'UNAUTHORIZED',
      };
    }

    if (response.status === 403) {
      return {
        success: false,
        message: 'You do not have access to this group',
        error: 'FORBIDDEN',
        errorCode: 'FORBIDDEN',
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        message: 'Group not found',
        error: 'NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || 'Failed to retrieve group details',
        error: errorData.error,
        errorCode: errorData.errorCode || 'GET_GROUP_DETAILS_ERROR',
      };
    }

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        message: 'Group details retrieved successfully',
        data: {
          group: data.data?.group,
          members: data.data?.members || [],
          currentUserRole: data.data?.currentUserRole,
        },
      };
    } else {
      return {
        success: false,
        message: data.message || 'Failed to retrieve group details',
        error: data.error,
        errorCode: data.errorCode || 'GET_GROUP_DETAILS_ERROR',
      };
    }
  } catch (error: any) {
    console.error('Get group details error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred while retrieving group details',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Search users for inviting to a group
 * Returns list of users with membership status
 */
export async function searchUsersForInvite(
  groupId: string,
  query: string
): Promise<{
  success: boolean;
  users?: Array<{
    id: string;
    email: string;
    username: string;
    alreadyMember: boolean;
    hasPendingInvite: boolean;
  }>;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!groupId || !query) {
      return {
        success: false,
        error: 'Group ID and search query required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(
      `/api/groups/${groupId}/invite-search?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Search failed',
        errorCode: errorData.errorCode || 'SEARCH_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      users: data.users,
    };
  } catch (error: any) {
    console.error('Search users error:', error);
    return {
      success: false,
      error: 'Search failed',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Invite a user to a group
 */
export async function inviteUserToGroup(
  groupId: string,
  userId: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!groupId || !userId) {
      return {
        success: false,
        error: 'Group ID and user ID required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/groups/${groupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invitedUserId: userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Invitation failed',
        errorCode: errorData.errorCode || 'INVITATION_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Invite user error:', error);
    return {
      success: false,
      error: 'Invitation failed',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get pending invitations for a group (admin only)
 */
export async function getPendingInvitations(groupId: string): Promise<{
  success: boolean;
  invitations?: any[];
  total?: number;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!groupId) {
      return {
        success: false,
        error: 'Group ID required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/groups/${groupId}/invitations`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to get invitations',
        errorCode: errorData.errorCode || 'GET_INVITATIONS_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      invitations: data.invitations,
      total: data.total,
    };
  } catch (error: any) {
    console.error('Get invitations error:', error);
    return {
      success: false,
      error: 'Failed to get invitations',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!invitationId) {
      return {
        success: false,
        error: 'Invitation ID required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/invitations/${invitationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to revoke invitation',
        errorCode: errorData.errorCode || 'REVOKE_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Revoke invitation error:', error);
    return {
      success: false,
      error: 'Failed to revoke invitation',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get user's invitations
 */
export async function getUserInvitations(): Promise<{
  success: boolean;
  invitations?: any[];
  total?: number;
  error?: string;
  errorCode?: string;
}> {
  try {
    const response = await fetch('/api/user/invitations');

    if (response.status === 401) {
      return {
        success: false,
        error: 'Authentication required',
        errorCode: 'UNAUTHORIZED',
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to get invitations',
        errorCode: errorData.errorCode || 'GET_INVITATIONS_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      invitations: data.invitations,
      total: data.total,
    };
  } catch (error: any) {
    console.error('Get user invitations error:', error);
    return {
      success: false,
      error: 'Failed to get invitations',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Respond to an invitation (accept or decline)
 */
export async function respondToInvitation(
  invitationId: string,
  action: 'accept' | 'decline'
): Promise<{
  success: boolean;
  message?: string;
  groupId?: string;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!invitationId || !action) {
      return {
        success: false,
        error: 'Invitation ID and action required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (response.status === 401) {
      return {
        success: false,
        error: 'Authentication required',
        errorCode: 'UNAUTHORIZED',
      };
    }

    if (response.status === 410) {
      return {
        success: false,
        error: 'Invitation has expired',
        errorCode: 'INVITATION_EXPIRED',
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to respond to invitation',
        errorCode: errorData.errorCode || 'RESPOND_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message,
      groupId: data.groupId,
    };
  } catch (error: any) {
    console.error('Respond to invitation error:', error);
    return {
      success: false,
      error: 'Failed to respond to invitation',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get all members of a group
 */
export async function getMembers(groupId: string, limit?: number, offset?: number): Promise<{
  success: boolean;
  members?: Array<{
    id: string;
    email: string;
    username: string;
    role: 'admin' | 'member';
    joinedAt: string;
    isCurrentUser?: boolean;
  }>;
  total?: number;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!groupId) {
      return {
        success: false,
        error: 'Group ID required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await fetch(`/api/groups/${groupId}/members?${params}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to get members',
        errorCode: errorData.errorCode || 'GET_MEMBERS_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      members: data.members,
      total: data.total,
    };
  } catch (error: any) {
    console.error('Get members error:', error);
    return {
      success: false,
      error: 'Failed to get members',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Remove a member from a group
 */
export async function removeMember(groupId: string, memberId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!groupId || !memberId) {
      return {
        success: false,
        error: 'Group ID and member ID required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to remove member',
        errorCode: errorData.errorCode || 'REMOVE_MEMBER_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Remove member error:', error);
    return {
      success: false,
      error: 'Failed to remove member',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  groupId: string,
  memberId: string,
  role: 'admin' | 'member'
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!groupId || !memberId || !role) {
      return {
        success: false,
        error: 'Group ID, member ID, and role required',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to update member role',
        errorCode: errorData.errorCode || 'UPDATE_MEMBER_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message,
    };
  } catch (error: any) {
    console.error('Update member role error:', error);
    return {
      success: false,
      error: 'Failed to update member role',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

