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
 * Get group by ID with full details (excludes soft-deleted groups)
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
     WHERE id = $1 AND deleted_at IS NULL`,
    [groupId]
  );
}

/**
 * Get group details with member list and current user's role (excludes soft-deleted groups)
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
       WHERE id = $1 AND deleted_at IS NULL`,
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
 * Get all groups for a user, sorted by last activity (excludes soft-deleted groups)
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
     WHERE gm.user_id = $1 AND g.deleted_at IS NULL
     GROUP BY g.id, g.name, g.description, g.created_by, g.created_at, g.updated_at, gm.role
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
 * Get group by invite code (excludes soft-deleted groups)
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
     WHERE invite_code = $1 AND deleted_at IS NULL`,
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
 * Soft delete group by setting deleted_at timestamp
 * GDPR compliant: preserves data for retention period before hard deletion
 */
export async function deleteGroup(groupId: string): Promise<void> {
  await query(
    `UPDATE groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL`,
    [groupId]
  );
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

/**
 * AVAILABILITIES TABLE STRUCTURE:
 * id (UUID) - Primary key
 * user_id (UUID) - FK to users, cascades on delete
 * group_id (UUID) - FK to groups, cascades on delete
 * start_time (TIMESTAMPTZ) - Start of availability block
 * end_time (TIMESTAMPTZ) - End of availability block
 * status (VARCHAR 20) - 'free' or 'busy'
 * version (INTEGER) - Optimistic locking version
 * recurring_pattern (VARCHAR 20) - 'daily', 'weekly', or NULL for one-time entries
 * recurring_end_date (TIMESTAMPTZ) - Last date for recurring entries, NULL for one-time
 * created_at (TIMESTAMPTZ) - Record creation timestamp
 * updated_at (TIMESTAMPTZ) - Record update timestamp
 */

/**
 * Create an availability entry (free/busy time block)
 */
export async function createAvailability(
  userId: string,
  groupId: string,
  startTime: string,
  endTime: string,
  status: 'free' | 'busy'
): Promise<{
  id: string;
  user_id: string;
  group_id: string;
  start_time: string;
  end_time: string;
  status: 'free' | 'busy';
  version: number;
  created_at: string;
  updated_at: string;
}> {
  const result = await queryOne(
    `INSERT INTO availabilities (user_id, group_id, start_time, end_time, status, version)
     VALUES ($1, $2, $3, $4, $5, 1)
     RETURNING id, user_id, group_id, start_time, end_time, status, version, created_at, updated_at`,
    [userId, groupId, startTime, endTime, status]
  );
  return result!;
}

/**
 * Check for duplicate/overlapping availability (same user/group/time)
 * Detects range overlaps: NEW.start < EXISTING.end AND NEW.end > EXISTING.start
 */
export async function checkDuplicateAvailability(
  userId: string,
  groupId: string,
  startTime: string,
  endTime: string
): Promise<{
  id: string;
  user_id: string;
  group_id: string;
  start_time: string;
  end_time: string;
  status: 'free' | 'busy';
} | null> {
  return queryOne(
    `SELECT id, user_id, group_id, start_time, end_time, status
     FROM availabilities
     WHERE user_id = $1 AND group_id = $2
       AND start_time < $4 AND end_time > $3`,
    [userId, groupId, startTime, endTime]
  );
}

/**
 * Get all availabilities for a group within a date range
 */
export async function getGroupAvailabilities(
  groupId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  id: string;
  user_id: string;
  group_id: string;
  start_time: string;
  end_time: string;
  status: 'free' | 'busy';
  version: number;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
}>> {
  return query(
    `SELECT a.id, a.user_id, a.group_id, a.start_time, a.end_time, a.status, a.version, a.created_at, a.updated_at,
            u.name as user_name, u.email as user_email
     FROM availabilities a
     JOIN users u ON a.user_id = u.id
     WHERE a.group_id = $1 AND a.start_time >= $2 AND a.end_time <= $3 AND u.deleted_at IS NULL
     ORDER BY a.start_time ASC`,
    [groupId, startDate, endDate]
  );
}

/**
 * Get all availabilities for a group with recurring entries expanded
 * Returns both non-recurring and materialized recurring entries
 */
export async function getGroupAvailabilitiesWithRecurring(
  groupId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  id: string;
  user_id: string;
  group_id: string;
  start_time: string;
  end_time: string;
  status: 'free' | 'busy';
  version: number;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  is_recurring: boolean;
}>> {
  try {
    // Get all availabilities (recurring and non-recurring)
    const allAvailabilities = await query<{
      id: string;
      user_id: string;
      group_id: string;
      start_time: string;
      end_time: string;
      status: 'free' | 'busy';
      version: number;
      created_at: string;
      updated_at: string;
      user_name: string;
      user_email: string;
      recurring_pattern: string | null;
      recurring_end_date: string | null;
    }>(
      `SELECT a.id, a.user_id, a.group_id, a.start_time, a.end_time, a.status, a.version,
              a.created_at, a.updated_at, a.recurring_pattern, a.recurring_end_date,
              u.name as user_name, u.email as user_email
       FROM availabilities a
       JOIN users u ON a.user_id = u.id
       WHERE a.group_id = $1 AND u.deleted_at IS NULL
       ORDER BY a.start_time ASC`,
      [groupId]
    );

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    const result: Array<any> = [];

    // Process each availability
    for (const avail of allAvailabilities) {
      const availStart = new Date(avail.start_time);
      const availEnd = new Date(avail.end_time);

      // Skip if outside date range
      if (availEnd < startDateTime || availStart > endDateTime) {
        continue;
      }

      // Non-recurring entry - add as-is
      if (!avail.recurring_pattern || !avail.recurring_end_date) {
        result.push({
          ...avail,
          is_recurring: false,
        });
        continue;
      }

      // Recurring entry - expand and add occurrences
      const recurringEnd = new Date(avail.recurring_end_date);
      let currentDate = new Date(availStart);

      while (currentDate <= recurringEnd && currentDate <= endDateTime) {
        // Check if this occurrence is within the requested range
        const occurrenceStart = new Date(currentDate);
        const occurrenceEnd = new Date(currentDate);

        occurrenceStart.setHours(availStart.getHours(), availStart.getMinutes(), availStart.getSeconds());
        occurrenceEnd.setHours(availEnd.getHours(), availEnd.getMinutes(), availEnd.getSeconds());

        if (occurrenceEnd >= startDateTime && occurrenceStart <= endDateTime) {
          // Generate stable synthetic ID using hash of original ID + date to ensure uniqueness
          // Format: {original-id}#{date-index} where date-index is days since pattern start
          const daysFromStart = Math.floor((currentDate.getTime() - availStart.getTime()) / (1000 * 60 * 60 * 24));
          const syntheticId = `${avail.id}#${daysFromStart}`;

          result.push({
            id: syntheticId,
            user_id: avail.user_id,
            group_id: avail.group_id,
            start_time: occurrenceStart.toISOString(),
            end_time: occurrenceEnd.toISOString(),
            status: avail.status,
            version: avail.version,
            created_at: avail.created_at,
            updated_at: avail.updated_at,
            user_name: avail.user_name,
            user_email: avail.user_email,
            is_recurring: true,
          });
        }

        // Move to next occurrence
        if (avail.recurring_pattern === 'daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (avail.recurring_pattern === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }
    }

    return result.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  } catch (error) {
    console.error('Error fetching availabilities with recurring:', error);
    throw error;
  }
}

/**
 * Get group availabilities organized by member for calendar view
 * Returns all group members with their availability entries
 * Useful for displaying a multi-member calendar grid
 */
export async function getGroupAvailabilitiesForCalendar(
  groupId: string,
  startDate: string,
  endDate: string
): Promise<Array<{
  user_id: string;
  user_name: string;
  availabilities: Array<{
    id: string;
    user_id: string;
    group_id: string;
    start_time: string;
    end_time: string;
    status: 'free' | 'busy';
    version: number;
    created_at: string;
    updated_at: string;
  }>;
}>> {
  try {
    // Get all group members (excludes deleted users)
    const membersResult = await query<{
      user_id: string;
      name: string;
    }>(
      `SELECT DISTINCT gm.user_id, u.name
       FROM group_memberships gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND u.deleted_at IS NULL
       ORDER BY u.name ASC`,
      [groupId]
    );

    if (membersResult.length === 0) {
      return [];
    }

    // Get all availabilities with recurring expanded
    const availabilities = await getGroupAvailabilitiesWithRecurring(groupId, startDate, endDate);

    // Group availabilities by user_id
    const availabilityByUser = new Map<string, typeof availabilities>();
    for (const avail of availabilities) {
      if (!availabilityByUser.has(avail.user_id)) {
        availabilityByUser.set(avail.user_id, []);
      }
      availabilityByUser.get(avail.user_id)!.push(avail);
    }

    // Build result: each member with their availabilities (or empty if no entries)
    const result = membersResult.map((member) => ({
      user_id: member.user_id,
      user_name: member.name,
      availabilities: (availabilityByUser.get(member.user_id) || []).map((avail) => ({
        id: avail.id,
        user_id: avail.user_id,
        group_id: avail.group_id,
        start_time: avail.start_time,
        end_time: avail.end_time,
        status: avail.status,
        version: avail.version,
        created_at: avail.created_at,
        updated_at: avail.updated_at,
      })),
    }));

    return result;
  } catch (error) {
    console.error('Error fetching group availabilities for calendar:', error);
    throw error;
  }
}
