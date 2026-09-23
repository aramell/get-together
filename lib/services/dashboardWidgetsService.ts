import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import {
  WIDGET_KEYS,
  WidgetKey,
  WidgetLayoutItem,
  defaultWidgetLayout,
  isWidgetKey,
} from '@/lib/utils/dashboardWidgets';

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * Current widget layout for a group: all 5 widgets' position/visibility.
 * A group with no group_dashboard_widgets rows yet (new group, or one that
 * predates the backfill) falls back to the fixed default order, all visible
 * -- matches today's hardcoded EventPlanningTab render order.
 */
export async function getWidgetLayout(groupId: string): Promise<ServiceResult<WidgetLayoutItem[]>> {
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT widget_key, position, visible
       FROM group_dashboard_widgets
       WHERE group_id = $1
       ORDER BY position ASC`,
      [groupId]
    );

    if (result.rows.length === 0) {
      return {
        success: true,
        data: defaultWidgetLayout(),
      };
    }

    return {
      success: true,
      data: result.rows,
    };
  } catch (error: any) {
    console.error('Error getting widget layout:', error);
    return {
      success: false,
      message: 'Failed to get widget layout',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Replace a group's entire widget layout (reorder and/or hide). Any group
 * member may call this -- reuses the "any member" getUserGroupRole idiom
 * used by checklist/logistics, not Story 2.8's admin-only PATCH pattern.
 *
 * `changes` must be the complete 5-widget layout (the customize-mode UI
 * always sends the full desired state after a move/hide, mirroring
 * EventChecklist's optimistic-update shape): every fixed widget_key exactly
 * once, with a unique position and a visible flag.
 */
export async function updateWidgetLayout(
  groupId: string,
  userId: string,
  changes: WidgetLayoutItem[]
): Promise<ServiceResult<WidgetLayoutItem[]>> {
  const client = await getClient();

  try {
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to change the dashboard layout',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const validationError = validateLayout(changes);
    if (validationError) {
      return {
        success: false,
        message: validationError,
        error: 'INVALID_WIDGET_LAYOUT',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    await client.query('BEGIN');

    for (const item of changes) {
      await client.query(
        `INSERT INTO group_dashboard_widgets (group_id, widget_key, position, visible)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (group_id, widget_key) DO UPDATE
         SET position = $3, visible = $4, updated_at = NOW()`,
        [groupId, item.widget_key, item.position, item.visible]
      );
    }

    await client.query('COMMIT');

    const result = await client.query(
      `SELECT widget_key, position, visible
       FROM group_dashboard_widgets
       WHERE group_id = $1
       ORDER BY position ASC`,
      [groupId]
    );

    return {
      success: true,
      message: 'Dashboard layout updated',
      data: result.rows,
    };
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating widget layout:', error);
    return {
      success: false,
      message: 'Failed to update widget layout',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

function validateLayout(changes: unknown): string | null {
  if (!Array.isArray(changes) || changes.length !== WIDGET_KEYS.length) {
    return `widgets must be an array of exactly ${WIDGET_KEYS.length} entries`;
  }

  const seenKeys = new Set<WidgetKey>();
  const seenPositions = new Set<number>();

  for (const item of changes) {
    if (!item || typeof item !== 'object') {
      return 'Each widget entry must be an object';
    }

    const { widget_key, position, visible } = item as Record<string, unknown>;

    if (!isWidgetKey(widget_key)) {
      return `Invalid widget_key: ${String(widget_key)}`;
    }
    if (seenKeys.has(widget_key)) {
      return `Duplicate widget_key: ${widget_key}`;
    }
    seenKeys.add(widget_key);

    if (!Number.isInteger(position) || (position as number) < 1 || (position as number) > WIDGET_KEYS.length) {
      return `Invalid position for ${widget_key}`;
    }
    if (seenPositions.has(position as number)) {
      return `Duplicate position: ${position}`;
    }
    seenPositions.add(position as number);

    if (typeof visible !== 'boolean') {
      return `Invalid visible flag for ${widget_key}`;
    }
  }

  if (seenKeys.size !== WIDGET_KEYS.length) {
    return 'All 5 widgets must be present';
  }

  return null;
}
