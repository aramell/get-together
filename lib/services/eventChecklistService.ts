import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

export interface ChecklistItem {
  id: string;
  event_id: string;
  group_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  is_checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
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

export async function addChecklistItem(
  eventId: string,
  groupId: string,
  userId: string,
  title: string,
  assignedTo?: string | null
): Promise<ServiceResult<ChecklistItem>> {
  const client = await getClient();

  try {
    if (!title || title.trim().length === 0 || title.length > 255) {
      return {
        success: false,
        message: 'Title must be between 1 and 255 characters',
        error: 'INVALID_TITLE',
        errorCode: 'VALIDATION_ERROR',
      };
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
        message: 'You must be a group member to add checklist items',
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
      `INSERT INTO event_checklist_items (event_id, group_id, created_by, assigned_to, title)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, event_id, group_id, created_by, assigned_to, title, is_checked, checked_by, checked_at, created_at, updated_at`,
      [eventId, groupId, userId, assignedTo || null, title.trim()]
    );

    return {
      success: true,
      message: 'Checklist item added',
      data: insertResult.rows[0],
    };
  } catch (error: any) {
    console.error('Error adding checklist item:', error);
    return {
      success: false,
      message: 'Failed to add checklist item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function getChecklistItems(
  eventId: string,
  groupId: string,
  userId: string
): Promise<ServiceResult<ChecklistItem[]>> {
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

    // Deliberately checking membership here, unlike getEventComments (which
    // has no auth/membership check at all — a pre-existing gap, out of scope
    // to fix in this story). AC #3 requires this GET be membership-gated.
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to view checklist items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const result = await client.query(
      `SELECT id, event_id, group_id, created_by, assigned_to, title, is_checked, checked_by, checked_at, created_at, updated_at
       FROM event_checklist_items
       WHERE event_id = $1
       ORDER BY created_at ASC`,
      [eventId]
    );

    return {
      success: true,
      data: result.rows,
    };
  } catch (error: any) {
    console.error('Error getting checklist items:', error);
    return {
      success: false,
      message: 'Failed to get checklist items',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function updateChecklistItem(
  eventId: string,
  groupId: string,
  itemId: string,
  userId: string,
  updates: { is_checked?: boolean; title?: string; assigned_to?: string | null }
): Promise<ServiceResult<ChecklistItem>> {
  const client = await getClient();

  try {
    const itemResult = await client.query(
      'SELECT * FROM event_checklist_items WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [itemId, eventId, groupId]
    );

    if (itemResult.rows.length === 0) {
      return {
        success: false,
        message: 'Checklist item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const item = itemResult.rows[0];

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to update checklist items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }
    const isAdmin = userRole === 'admin';

    const isMetadataUpdate = updates.title !== undefined || updates.assigned_to !== undefined;
    const isCheckToggle = updates.is_checked !== undefined;

    if (isMetadataUpdate) {
      const isCreator = item.created_by === userId;
      if (!isCreator && !isAdmin) {
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

      if (updates.assigned_to) {
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
    }

    if (isCheckToggle) {
      const isUnassigned = item.assigned_to === null;
      const isAssignee = item.assigned_to === userId;
      if (!isUnassigned && !isAssignee && !isAdmin) {
        return {
          success: false,
          message: 'Only the assignee or a group admin can check off this item',
          error: 'FORBIDDEN',
          errorCode: 'FORBIDDEN',
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
    if (updates.is_checked !== undefined) {
      setClauses.push(`is_checked = $${paramIndex++}`);
      values.push(updates.is_checked);
      setClauses.push(`checked_by = $${paramIndex++}`);
      values.push(updates.is_checked ? userId : null);
      setClauses.push(`checked_at = $${paramIndex++}`);
      values.push(updates.is_checked ? new Date().toISOString() : null);
    }

    values.push(itemId);

    const updateResult = await client.query(
      `UPDATE event_checklist_items SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, event_id, group_id, created_by, assigned_to, title, is_checked, checked_by, checked_at, created_at, updated_at`,
      values
    );

    return {
      success: true,
      message: 'Checklist item updated',
      data: updateResult.rows[0],
    };
  } catch (error: any) {
    console.error('Error updating checklist item:', error);
    return {
      success: false,
      message: 'Failed to update checklist item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function deleteChecklistItem(
  eventId: string,
  groupId: string,
  itemId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const client = await getClient();

  try {
    const itemResult = await client.query(
      'SELECT created_by FROM event_checklist_items WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [itemId, eventId, groupId]
    );

    if (itemResult.rows.length === 0) {
      return {
        success: false,
        message: 'Checklist item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to delete checklist items',
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

    await client.query('DELETE FROM event_checklist_items WHERE id = $1', [itemId]);

    return {
      success: true,
      message: 'Checklist item deleted',
    };
  } catch (error: any) {
    console.error('Error deleting checklist item:', error);
    return {
      success: false,
      message: 'Failed to delete checklist item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}
