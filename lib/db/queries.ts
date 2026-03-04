import { query, queryOne, getClient } from './client';

/**
 * Create a new group and add creator as admin
 * Handles transaction: creates group then adds user as admin member
 */
export async function createGroupWithMembership(
  name: string,
  description: string | null,
  createdBy: string,
  inviteCode: string
): Promise<{ id: string; name: string; description: string | null; created_by: string; invite_code: string; created_at: string; updated_at: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Insert group
    const groupResult = await client.query(
      `INSERT INTO groups (name, description, created_by, invite_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, created_by, invite_code, created_at, updated_at`,
      [name, description, createdBy, inviteCode]
    );

    const group = groupResult.rows[0];
    const groupId = group.id;

    // Add creator as admin member
    await client.query(
      `INSERT INTO group_memberships (group_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [groupId, createdBy, 'admin']
    );

    await client.query('COMMIT');
    return group;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get group by ID with full details
 */
export async function getGroupById(groupId: string): Promise<{
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
} | null> {
  return queryOne(
    `SELECT id, name, description, created_by, invite_code, created_at, updated_at
     FROM groups
     WHERE id = $1`,
    [groupId]
  );
}

/**
 * Get group details with member list and current user's role
 */
export async function getGroupDetailsWithMembers(
  groupId: string,
  userId: string
): Promise<{
  group: {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
    invite_code: string;
    created_at: string;
    updated_at: string;
  };
  members: Array<{
    user_id: string;
    name: string;
    email: string;
    role: 'admin' | 'member';
    joined_at: string;
  }>;
  currentUserRole: 'admin' | 'member' | null;
} | null> {
  const client = await getClient();
  try {
    // Get group
    const groupResult = await client.query(
      `SELECT id, name, description, created_by, invite_code, created_at, updated_at
       FROM groups
       WHERE id = $1`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return null;
    }

    const group = groupResult.rows[0];

    // Get all members with user info (name, email)
    const membersResult = await client.query(
      `SELECT gm.user_id, u.name, u.email, gm.role, gm.joined_at
       FROM group_memberships gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.joined_at ASC`,
      [groupId]
    );

    // Get current user's role
    const userRoleResult = await client.query(
      `SELECT role
       FROM group_memberships
       WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    const currentUserRole = userRoleResult.rows.length > 0
      ? (userRoleResult.rows[0].role as 'admin' | 'member')
      : null;

    return {
      group,
      members: membersResult.rows.map((row) => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        joined_at: row.joined_at,
      })),
      currentUserRole,
    };
  } finally {
    client.release();
  }
}

/**
 * Get all groups for a user, sorted by last activity
 */
export async function getGroupsByUserId(userId: string): Promise<Array<{
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  member_count: number;
  user_role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}>> {
  return query(
    `SELECT
       g.id,
       g.name,
       g.description,
       g.created_by,
       COUNT(gm.id) as member_count,
       gm.role as user_role,
       g.created_at,
       g.updated_at
     FROM groups g
     INNER JOIN group_memberships gm ON g.id = gm.group_id
     WHERE gm.user_id = $1
     GROUP BY g.id, gm.role
     ORDER BY g.updated_at DESC`,
    [userId]
  );
}

/**
 * Check if user is a member of a group and get their role
 */
export async function getUserGroupRole(
  groupId: string,
  userId: string
): Promise<'admin' | 'member' | null> {
  const result = await queryOne<{ role: 'admin' | 'member' }>(
    `SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  return result ? result.role : null;
}

/**
 * Get group by invite code
 */
export async function getGroupByInviteCode(inviteCode: string): Promise<{
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
} | null> {
  return queryOne(
    `SELECT id, name, description, created_by, invite_code, created_at, updated_at
     FROM groups
     WHERE invite_code = $1`,
    [inviteCode]
  );
}

/**
 * Add user to group
 */
export async function addUserToGroup(
  groupId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  await query(
    `INSERT INTO group_memberships (group_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO UPDATE
     SET role = $3`,
    [groupId, userId, role]
  );
}

/**
 * Remove user from group
 */
export async function removeUserFromGroup(groupId: string, userId: string): Promise<void> {
  await query(
    `DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
}

/**
 * Update group
 */
export async function updateGroup(
  groupId: string,
  data: {
    name?: string;
    description?: string | null;
  }
): Promise<{
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
} | null> {
  const updates: string[] = [];
  const values: any[] = [groupId];
  let paramIndex = 2;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(data.name);
    paramIndex++;
  }

  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    values.push(data.description);
    paramIndex++;
  }

  if (updates.length === 0) {
    return getGroupById(groupId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);

  return queryOne(
    `UPDATE groups
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING id, name, description, created_by, invite_code, created_at, updated_at`,
    values
  );
}

/**
 * Delete group (cascade will delete memberships)
 */
export async function deleteGroup(groupId: string): Promise<void> {
  await query(`DELETE FROM groups WHERE id = $1`, [groupId]);
}

/**
 * Check if user is a member of a group
 */
export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const result = await queryOne<{ id: string }>(
    `SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  return !!result;
}

/**
 * Get all members of a group with pagination
 */
export async function getGroupMembers(
  groupId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{
  members: Array<{
    id: string;
    email: string;
    username: string;
    role: 'admin' | 'member';
    joinedAt: string;
  }>;
  total: number;
}> {
  // Get count
  const countResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM group_memberships WHERE group_id = $1`,
    [groupId]
  );
  const total = countResult?.count || 0;

  // Get members with user info
  const results = await query<{
    user_id: string;
    email: string;
    username: string;
    role: 'admin' | 'member';
    joined_at: string;
  }>(
    `SELECT
       gm.user_id as user_id,
       u.email,
       u.username,
       gm.role,
       gm.joined_at
     FROM group_memberships gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
     ORDER BY gm.joined_at ASC
     LIMIT $2 OFFSET $3`,
    [groupId, limit, offset]
  );

  return {
    members: results.map((row) => ({
      id: row.user_id,
      email: row.email,
      username: row.username,
      role: row.role,
      joinedAt: row.joined_at,
    })),
    total,
  };
}

/**
 * Get count of admins in a group
 */
export async function getAdminCount(groupId: string): Promise<number> {
  const result = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM group_memberships WHERE group_id = $1 AND role = 'admin'`,
    [groupId]
  );
  return result?.count || 0;
}

/**
 * Update member role
 */
export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: 'admin' | 'member'
): Promise<void> {
  await query(
    `UPDATE group_memberships SET role = $3 WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId, role]
  );
}
