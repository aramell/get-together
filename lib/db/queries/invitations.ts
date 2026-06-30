import { query, queryOne } from '../client';

export interface Invitation {
  id: string;
  group_id: string;
  invited_user_id: string;
  invited_by_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  responded_at: string | null;
  expires_at: string;
}

/**
 * Create a new invitation
 */
export async function createInvitation(
  groupId: string,
  invitedUserId: string,
  invitedByUserId: string
): Promise<Invitation> {
  const sql = `
    INSERT INTO group_invitations (
      group_id, invited_user_id, invited_by_user_id,
      status, expires_at
    )
    VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP + INTERVAL '30 days')
    RETURNING *;
  `;

  const result = await queryOne<Invitation>(sql, [
    groupId,
    invitedUserId,
    invitedByUserId,
  ]);

  if (!result) {
    throw new Error('Failed to create invitation');
  }

  return result;
}

/**
 * Get pending invitations for a group
 */
export async function getPendingInvitationsForGroup(
  groupId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{
  invitations: (Invitation & { invitedUser?: { id: string; email: string; username: string } })[];
  total: number;
}> {
  // Get count
  const countSql = `
    SELECT COUNT(*) as count FROM group_invitations
    WHERE group_id = $1 AND status = 'pending'
    AND expires_at > CURRENT_TIMESTAMP;
  `;
  const countResult = await queryOne<{ count: number }>(countSql, [groupId]);
  const total = countResult?.count || 0;

  // Get invitations with user info
  const sql = `
    SELECT
      gi.id, gi.group_id, gi.invited_user_id, gi.invited_by_user_id,
      gi.status, gi.invited_at, gi.responded_at, gi.expires_at,
      u.email, u.username
    FROM group_invitations gi
    LEFT JOIN users u ON gi.invited_user_id = u.id
    WHERE gi.group_id = $1 AND gi.status = 'pending'
    AND gi.expires_at > CURRENT_TIMESTAMP
    ORDER BY gi.invited_at DESC
    LIMIT $2 OFFSET $3;
  `;

  const results = await query<
    Invitation & { email: string; username: string }
  >(sql, [groupId, limit, offset]);

  const invitations = results.map((row) => ({
    id: row.id,
    group_id: row.group_id,
    invited_user_id: row.invited_user_id,
    invited_by_user_id: row.invited_by_user_id,
    status: row.status,
    invited_at: row.invited_at,
    responded_at: row.responded_at,
    expires_at: row.expires_at,
    invitedUser: row.email
      ? {
          id: row.invited_user_id,
          email: row.email,
          username: row.username,
        }
      : undefined,
  }));

  return { invitations, total };
}

/**
 * Check if user has pending invitation for group
 */
export async function hasPendingInvitation(
  groupId: string,
  userId: string
): Promise<boolean> {
  const sql = `
    SELECT COUNT(*) as count FROM group_invitations
    WHERE group_id = $1 AND invited_user_id = $2
    AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP;
  `;

  const result = await queryOne<{ count: number }>(sql, [groupId, userId]);
  return (result?.count || 0) > 0;
}

/**
 * Get user's invitations
 */
export async function getUserInvitations(
  userId: string,
  status: 'pending' | 'accepted' | 'declined' = 'pending',
  limit: number = 10,
  offset: number = 0
): Promise<{
  invitations: Array<
    Invitation & {
      groupName: string;
      groupDescription: string | null;
      memberCount: number;
      invitedByUsername: string;
    }
  >;
  total: number;
}> {
  // Get count
  const countSql = `
    SELECT COUNT(*) as count FROM group_invitations
    WHERE invited_user_id = $1 AND status = $2;
  `;
  const countResult = await queryOne<{ count: number }>(countSql, [
    userId,
    status,
  ]);
  const total = countResult?.count || 0;

  // Get invitations with group info
  const sql = `
    SELECT
      gi.id, gi.group_id, gi.invited_user_id, gi.invited_by_user_id,
      gi.status, gi.invited_at, gi.responded_at, gi.expires_at,
      g.name as group_name, g.description as group_description,
      (SELECT COUNT(*) FROM group_memberships WHERE group_id = g.id) as member_count,
      u.username as invited_by_username
    FROM group_invitations gi
    JOIN groups g ON gi.group_id = g.id
    JOIN users u ON gi.invited_by_user_id = u.id
    WHERE gi.invited_user_id = $1 AND gi.status = $2
    ORDER BY gi.invited_at DESC
    LIMIT $3 OFFSET $4;
  `;

  const results = await query<
    Invitation & {
      group_name: string;
      group_description: string | null;
      member_count: number;
      invited_by_username: string;
    }
  >(sql, [userId, status, limit, offset]);

  const invitations = results.map((row) => ({
    id: row.id,
    group_id: row.group_id,
    invited_user_id: row.invited_user_id,
    invited_by_user_id: row.invited_by_user_id,
    status: row.status,
    invited_at: row.invited_at,
    responded_at: row.responded_at,
    expires_at: row.expires_at,
    groupName: row.group_name,
    groupDescription: row.group_description,
    memberCount: row.member_count,
    invitedByUsername: row.invited_by_username,
  }));

  return { invitations, total };
}

/**
 * Update invitation status (accept/decline)
 */
export async function updateInvitationStatus(
  invitationId: string,
  status: 'accepted' | 'declined'
): Promise<Invitation> {
  const sql = `
    UPDATE group_invitations
    SET status = $1, responded_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND status = 'pending'
    RETURNING *;
  `;

  const result = await queryOne<Invitation>(sql, [status, invitationId]);

  if (!result) {
    throw new Error('Invitation not found or already responded to');
  }

  return result;
}

/**
 * Revoke invitation (admin)
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const sql = `
    DELETE FROM group_invitations
    WHERE id = $1 AND status = 'pending';
  `;

  await query(sql, [invitationId]);
}

/**
 * Get invitation by ID
 */
export async function getInvitationById(invitationId: string): Promise<Invitation | null> {
  const sql = `
    SELECT * FROM group_invitations WHERE id = $1;
  `;

  return await queryOne<Invitation>(sql, [invitationId]);
}

/**
 * Search users (for inviting to group)
 */
export async function searchUsers(
  query_str: string,
  groupId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  users: Array<{
    id: string;
    email: string;
    username: string;
    alreadyMember: boolean;
    hasPendingInvite: boolean;
  }>;
  total: number;
}> {
  // Get count
  const countSql = `
    SELECT COUNT(*) as count FROM users
    WHERE (email ILIKE $1 OR username ILIKE $1);
  `;
  const searchTerm = `%${query_str}%`;
  const countResult = await queryOne<{ count: number }>(countSql, [searchTerm]);
  const total = countResult?.count || 0;

  // Get users
  const sql = `
    SELECT
      u.id, u.email, u.username,
      EXISTS(
        SELECT 1 FROM group_memberships
        WHERE group_id = $2 AND user_id = u.id
      ) as already_member,
      EXISTS(
        SELECT 1 FROM group_invitations
        WHERE group_id = $2 AND invited_user_id = u.id AND status = 'pending'
      ) as has_pending_invite
    FROM users u
    WHERE (u.email ILIKE $1 OR u.username ILIKE $1)
    ORDER BY u.username ASC
    LIMIT $3 OFFSET $4;
  `;

  const results = await query<{
    id: string;
    email: string;
    username: string;
    already_member: boolean;
    has_pending_invite: boolean;
  }>(sql, [searchTerm, groupId, limit, offset]);

  const users = results.map((row) => ({
    id: row.id,
    email: row.email,
    username: row.username,
    alreadyMember: row.already_member,
    hasPendingInvite: row.has_pending_invite,
  }));

  return { users, total };
}
