import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

export interface TimelineItem {
  id: string;
  event_id: string;
  group_id: string;
  created_by: string;
  item_time: string;
  title: string;
  description: string | null;
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

export async function addTimelineItem(
  eventId: string,
  groupId: string,
  userId: string,
  itemTime: string,
  title: string,
  description?: string | null
): Promise<ServiceResult<TimelineItem>> {
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

    if (!itemTime || isNaN(Date.parse(itemTime))) {
      return {
        success: false,
        message: 'A valid item time is required',
        error: 'INVALID_ITEM_TIME',
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
        message: 'You must be a group member to add timeline items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const insertResult = await client.query(
      `INSERT INTO event_timeline_items (event_id, group_id, created_by, item_time, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, event_id, group_id, created_by, item_time, title, description, created_at, updated_at`,
      [eventId, groupId, userId, itemTime, title.trim(), description?.trim() || null]
    );

    return {
      success: true,
      message: 'Timeline item added',
      data: insertResult.rows[0],
    };
  } catch (error: any) {
    console.error('Error adding timeline item:', error);
    return {
      success: false,
      message: 'Failed to add timeline item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function getTimelineItems(
  eventId: string,
  groupId: string,
  userId: string
): Promise<ServiceResult<TimelineItem[]>> {
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
        message: 'You must be a group member to view timeline items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const result = await client.query(
      `SELECT id, event_id, group_id, created_by, item_time, title, description, created_at, updated_at
       FROM event_timeline_items
       WHERE event_id = $1
       ORDER BY item_time ASC, created_at ASC`,
      [eventId]
    );

    return {
      success: true,
      data: result.rows,
    };
  } catch (error: any) {
    console.error('Error getting timeline items:', error);
    return {
      success: false,
      message: 'Failed to get timeline items',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function updateTimelineItem(
  eventId: string,
  groupId: string,
  itemId: string,
  userId: string,
  updates: { item_time?: string; title?: string; description?: string | null }
): Promise<ServiceResult<TimelineItem>> {
  const client = await getClient();

  try {
    const itemResult = await client.query(
      'SELECT * FROM event_timeline_items WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [itemId, eventId, groupId]
    );

    if (itemResult.rows.length === 0) {
      return {
        success: false,
        message: 'Timeline item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const item = itemResult.rows[0];

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to update timeline items',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const isCreator = item.created_by === userId;
    const isAdmin = userRole === 'admin';
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

    if (updates.item_time !== undefined && isNaN(Date.parse(updates.item_time))) {
      return {
        success: false,
        message: 'A valid item time is required',
        error: 'INVALID_ITEM_TIME',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const setClauses: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.item_time !== undefined) {
      setClauses.push(`item_time = $${paramIndex++}`);
      values.push(updates.item_time);
    }
    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title.trim());
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description?.trim() || null);
    }

    values.push(itemId);

    const updateResult = await client.query(
      `UPDATE event_timeline_items SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, event_id, group_id, created_by, item_time, title, description, created_at, updated_at`,
      values
    );

    return {
      success: true,
      message: 'Timeline item updated',
      data: updateResult.rows[0],
    };
  } catch (error: any) {
    console.error('Error updating timeline item:', error);
    return {
      success: false,
      message: 'Failed to update timeline item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function deleteTimelineItem(
  eventId: string,
  groupId: string,
  itemId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const client = await getClient();

  try {
    const itemResult = await client.query(
      'SELECT created_by FROM event_timeline_items WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [itemId, eventId, groupId]
    );

    if (itemResult.rows.length === 0) {
      return {
        success: false,
        message: 'Timeline item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to delete timeline items',
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

    await client.query('DELETE FROM event_timeline_items WHERE id = $1', [itemId]);

    return {
      success: true,
      message: 'Timeline item deleted',
    };
  } catch (error: any) {
    console.error('Error deleting timeline item:', error);
    return {
      success: false,
      message: 'Failed to delete timeline item',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}
