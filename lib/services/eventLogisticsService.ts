import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

export type LogisticsCategory = 'bring' | 'carpool';

export interface LogisticsClaim {
  user_id: string;
  claimed_at: string;
}

export interface LogisticsItem {
  id: string;
  event_id: string;
  group_id: string;
  created_by: string;
  category: LogisticsCategory;
  title: string;
  assigned_to: string | null;
  capacity: number | null;
  created_at: string;
  updated_at: string;
  claims: LogisticsClaim[];
  claim_count: number;
}

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

async function verifyEventInGroup(
  client: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  eventId: string,
  groupId: string
): Promise<boolean> {
  const eventResult = await client.query(
    'SELECT id FROM event_proposals WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL',
    [eventId, groupId]
  );
  return eventResult.rows.length > 0;
}

function mapRow(row: any): LogisticsItem {
  const claims: LogisticsClaim[] = row.claims || [];
  return {
    id: row.id,
    event_id: row.event_id,
    group_id: row.group_id,
    created_by: row.created_by,
    category: row.category,
    title: row.title,
    assigned_to: row.assigned_to,
    capacity: row.capacity,
    created_at: row.created_at,
    updated_at: row.updated_at,
    claims,
    claim_count: claims.length,
  };
}

const ITEM_COLUMNS = `id, event_id, group_id, created_by, category, title, assigned_to, capacity, created_at, updated_at`;

export async function addLogisticsItem(
  eventId: string,
  groupId: string,
  userId: string,
  category: LogisticsCategory,
  title: string,
  assignedTo?: string | null,
  capacity?: number | null
): Promise<ServiceResult<LogisticsItem>> {
  const client = await getClient();

  try {
    if (category !== 'bring' && category !== 'carpool') {
      return {
        success: false,
        message: "Category must be 'bring' or 'carpool'",
        error: 'INVALID_CATEGORY',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!title || title.trim().length === 0 || title.length > 255) {
      return {
        success: false,
        message: 'Title must be between 1 and 255 characters',
        error: 'INVALID_TITLE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (category === 'carpool') {
      if (!capacity || !Number.isInteger(capacity) || capacity < 1) {
        return {
          success: false,
          message: 'Carpool items require a positive integer capacity',
          error: 'INVALID_CAPACITY',
          errorCode: 'VALIDATION_ERROR',
        };
      }
      if (!assignedTo) {
        return {
          success: false,
          message: 'Carpool items require a driver (assigned_to)',
          error: 'MISSING_DRIVER',
          errorCode: 'VALIDATION_ERROR',
        };
      }
    }

    if (!(await verifyEventInGroup(client, eventId, groupId))) {
      return {
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to add logistics items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    if (assignedTo) {
      const assigneeRole = await getUserGroupRole(groupId, assignedTo);
      if (!assigneeRole) {
        return {
          success: false,
          message: 'Assignee must be a member of this group',
          error: 'INVALID_ASSIGNEE',
          errorCode: 'VALIDATION_ERROR',
        };
      }
    }

    const insertResult = await client.query(
      `INSERT INTO event_logistics_items (event_id, group_id, created_by, category, title, assigned_to, capacity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${ITEM_COLUMNS}`,
      [eventId, groupId, userId, category, title.trim(), assignedTo || null, category === 'carpool' ? capacity : null]
    );

    return {
      success: true,
      message: 'Logistics item added',
      data: mapRow({ ...insertResult.rows[0], claims: [] }),
    };
  } catch (error: any) {
    console.error('Error adding logistics item:', error);
    return {
      success: false,
      message: 'Failed to add logistics item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function getLogisticsItems(
  eventId: string,
  groupId: string,
  userId: string
): Promise<ServiceResult<LogisticsItem[]>> {
  const client = await getClient();

  try {
    if (!(await verifyEventInGroup(client, eventId, groupId))) {
      return {
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to view logistics items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const result = await client.query(
      `SELECT
         eli.id, eli.event_id, eli.group_id, eli.created_by, eli.category, eli.title,
         eli.assigned_to, eli.capacity, eli.created_at, eli.updated_at,
         COALESCE(
           json_agg(
             json_build_object('user_id', elc.user_id, 'claimed_at', elc.claimed_at)
             ORDER BY elc.claimed_at ASC
           ) FILTER (WHERE elc.id IS NOT NULL),
           '[]'
         ) AS claims
       FROM event_logistics_items eli
       LEFT JOIN event_logistics_claims elc ON elc.logistics_item_id = eli.id
       WHERE eli.event_id = $1
       GROUP BY eli.id
       ORDER BY eli.created_at ASC`,
      [eventId]
    );

    return {
      success: true,
      data: result.rows.map(mapRow),
    };
  } catch (error: any) {
    console.error('Error getting logistics items:', error);
    return {
      success: false,
      message: 'Failed to get logistics items',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function updateLogisticsItem(
  eventId: string,
  groupId: string,
  itemId: string,
  userId: string,
  updates: { title?: string; assigned_to?: string | null; capacity?: number }
): Promise<ServiceResult<LogisticsItem>> {
  const client = await getClient();

  try {
    const itemResult = await client.query(
      `SELECT ${ITEM_COLUMNS} FROM event_logistics_items WHERE id = $1 AND event_id = $2 AND group_id = $3`,
      [itemId, eventId, groupId]
    );

    if (itemResult.rows.length === 0) {
      return {
        success: false,
        message: 'Logistics item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const item = itemResult.rows[0];

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to update logistics items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }
    const isAdmin = userRole === 'admin';
    const isCreator = item.created_by === userId;

    const isMetadataUpdate = updates.title !== undefined || updates.capacity !== undefined;

    // AC #5: claiming/unclaiming a 'bring' item's assigned_to is a relaxed
    // authorization path (any member), but ONLY for the narrow self-claim /
    // self-unclaim shapes below. Any other assigned_to change (reassigning to
    // a third party, changing a carpool driver) is treated as a metadata edit.
    const isSelfClaim =
      !isMetadataUpdate &&
      updates.assigned_to !== undefined &&
      item.category === 'bring' &&
      updates.assigned_to === userId &&
      item.assigned_to === null;
    const isSelfUnclaim =
      !isMetadataUpdate &&
      updates.assigned_to !== undefined &&
      item.category === 'bring' &&
      updates.assigned_to === null &&
      item.assigned_to === userId;
    const isClaimAction = isSelfClaim || isSelfUnclaim;

    if (!isClaimAction && !isCreator && !isAdmin) {
      return {
        success: false,
        message: 'Only the creator or a group admin can edit this item',
        error: 'FORBIDDEN',
        errorCode: 'FORBIDDEN',
      };
    }

    if (updates.title !== undefined && (updates.title.trim().length === 0 || updates.title.length > 255)) {
      return {
        success: false,
        message: 'Title must be between 1 and 255 characters',
        error: 'INVALID_TITLE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (updates.capacity !== undefined && (!Number.isInteger(updates.capacity) || updates.capacity < 1)) {
      return {
        success: false,
        message: 'Capacity must be a positive integer',
        error: 'INVALID_CAPACITY',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (updates.capacity !== undefined && item.category === 'carpool') {
      const claimCountResult = await client.query(
        `SELECT COUNT(*)::int AS count FROM event_logistics_claims WHERE logistics_item_id = $1`,
        [itemId]
      );
      const currentClaimCount = claimCountResult.rows[0].count;
      if (updates.capacity < currentClaimCount) {
        return {
          success: false,
          message: `Capacity can't be less than the ${currentClaimCount} seat(s) already claimed`,
          error: 'CAPACITY_BELOW_CLAIMS',
          errorCode: 'VALIDATION_ERROR',
        };
      }
    }

    // Skip the extra lookup for a self-claim: userRole above already confirms
    // the caller (== updates.assigned_to here) is a group member.
    if (updates.assigned_to && updates.assigned_to !== userId) {
      const assigneeRole = await getUserGroupRole(groupId, updates.assigned_to);
      if (!assigneeRole) {
        return {
          success: false,
          message: 'Assignee must be a member of this group',
          error: 'INVALID_ASSIGNEE',
          errorCode: 'VALIDATION_ERROR',
        };
      }
    }

    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title.trim());
    }
    if (updates.assigned_to !== undefined) {
      setClauses.push(`assigned_to = $${paramIndex++}`);
      values.push(updates.assigned_to);
    }
    // Capacity is only meaningful for carpool items — ignored for 'bring',
    // matching creation-time semantics (AC #3).
    if (updates.capacity !== undefined && item.category === 'carpool') {
      setClauses.push(`capacity = $${paramIndex++}`);
      values.push(updates.capacity);
    }

    values.push(itemId);
    const itemIdParamIndex = paramIndex++;

    // Self-claim/unclaim on a 'bring' item races against other members doing
    // the same thing between our read of `item` above and this write — guard
    // the UPDATE on the assigned_to value we actually observed, so a losing
    // concurrent claim is rejected instead of silently overwriting the winner.
    let whereClause = `id = $${itemIdParamIndex}`;
    if (isSelfClaim) {
      whereClause += ` AND assigned_to IS NULL`;
    } else if (isSelfUnclaim) {
      whereClause += ` AND assigned_to = $${paramIndex}`;
      values.push(userId);
    }

    const updateResult = await client.query(
      `UPDATE event_logistics_items SET ${setClauses.join(', ')} WHERE ${whereClause}
       RETURNING ${ITEM_COLUMNS}`,
      values
    );

    if (updateResult.rows.length === 0 && isClaimAction) {
      return {
        success: false,
        message: isSelfClaim
          ? 'Someone else already claimed this item'
          : 'This item is no longer assigned to you',
        error: 'CLAIM_CONFLICT',
        errorCode: 'CONFLICT',
      };
    }

    const claimsResult = await client.query(
      `SELECT user_id, claimed_at FROM event_logistics_claims WHERE logistics_item_id = $1 ORDER BY claimed_at ASC`,
      [itemId]
    );

    return {
      success: true,
      message: 'Logistics item updated',
      data: mapRow({ ...updateResult.rows[0], claims: claimsResult.rows }),
    };
  } catch (error: any) {
    console.error('Error updating logistics item:', error);
    return {
      success: false,
      message: 'Failed to update logistics item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function deleteLogisticsItem(
  eventId: string,
  groupId: string,
  itemId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const client = await getClient();

  try {
    const itemResult = await client.query(
      'SELECT created_by FROM event_logistics_items WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [itemId, eventId, groupId]
    );

    if (itemResult.rows.length === 0) {
      return {
        success: false,
        message: 'Logistics item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to delete logistics items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const isCreator = itemResult.rows[0].created_by === userId;
    const isAdmin = userRole === 'admin';
    if (!isCreator && !isAdmin) {
      return {
        success: false,
        message: 'Only the creator or a group admin can delete this item',
        error: 'FORBIDDEN',
        errorCode: 'FORBIDDEN',
      };
    }

    // ON DELETE CASCADE on event_logistics_claims.logistics_item_id handles claim cleanup.
    await client.query('DELETE FROM event_logistics_items WHERE id = $1', [itemId]);

    return {
      success: true,
      message: 'Logistics item deleted',
    };
  } catch (error: any) {
    console.error('Error deleting logistics item:', error);
    return {
      success: false,
      message: 'Failed to delete logistics item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function claimLogisticsSeat(
  eventId: string,
  groupId: string,
  itemId: string,
  userId: string
): Promise<ServiceResult<LogisticsClaim>> {
  const client = await getClient();

  try {
    const itemResult = await client.query(
      'SELECT id, category, capacity FROM event_logistics_items WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [itemId, eventId, groupId]
    );

    if (itemResult.rows.length === 0) {
      return {
        success: false,
        message: 'Logistics item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const item = itemResult.rows[0];

    if (item.category !== 'carpool') {
      return {
        success: false,
        message: 'Only carpool items can be claimed',
        error: 'INVALID_CATEGORY',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to claim a seat',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    await client.query('BEGIN');

    try {
      const countResult = await client.query(
        'SELECT COUNT(*) AS count FROM event_logistics_claims WHERE logistics_item_id = $1',
        [itemId]
      );
      const currentCount = parseInt(countResult.rows[0].count, 10);

      if (currentCount >= item.capacity) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'All seats have already been claimed',
          error: 'CAPACITY_REACHED',
          errorCode: 'CAPACITY_REACHED',
        };
      }

      const insertResult = await client.query(
        `INSERT INTO event_logistics_claims (logistics_item_id, user_id)
         VALUES ($1, $2)
         RETURNING user_id, claimed_at`,
        [itemId, userId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Seat claimed',
        data: insertResult.rows[0],
      };
    } catch (txError: any) {
      await client.query('ROLLBACK');
      if (txError.code === '23505') {
        // UNIQUE(logistics_item_id, user_id) violation
        return {
          success: false,
          message: 'You have already claimed a seat on this item',
          error: 'ALREADY_CLAIMED',
          errorCode: 'CONFLICT',
        };
      }
      throw txError;
    }
  } catch (error: any) {
    console.error('Error claiming logistics seat:', error);
    return {
      success: false,
      message: 'Failed to claim seat',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function unclaimLogisticsSeat(
  eventId: string,
  groupId: string,
  itemId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const client = await getClient();

  try {
    const itemResult = await client.query(
      'SELECT id FROM event_logistics_items WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [itemId, eventId, groupId]
    );

    if (itemResult.rows.length === 0) {
      return {
        success: false,
        message: 'Logistics item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to unclaim a seat',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const deleteResult = await client.query(
      'DELETE FROM event_logistics_claims WHERE logistics_item_id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (deleteResult.rowCount === 0) {
      return {
        success: false,
        message: "You haven't claimed a seat on this item",
        error: 'CLAIM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    return {
      success: true,
      message: 'Seat unclaimed',
    };
  } catch (error: any) {
    console.error('Error unclaiming logistics seat:', error);
    return {
      success: false,
      message: 'Failed to unclaim seat',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}
