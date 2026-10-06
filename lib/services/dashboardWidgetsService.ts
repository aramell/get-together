import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import {
  WidgetLayoutItem,
  defaultWidgetLayout,
  isWidgetKey,
  validateWidgetLayout,
} from '@/lib/dashboard/widgetRegistry';

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * Current widget layout for a group: every registry widget's position/visibility.
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

    return {
      success: true,
      data: reconcileWithRegistry(result.rows),
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
 * Reconcile stored rows with the registry: drop rows whose key the registry
 * no longer knows, append registry widgets the group has no row for (visible,
 * at the end -- e.g. a widget added after the group's rows were stored), and
 * renumber positions 1..N. The result always passes validateWidgetLayout, so
 * the client accepts it and a PATCH built from it is valid. A group with no
 * usable rows gets the default layout.
 */
function reconcileWithRegistry(rows: WidgetLayoutItem[]): WidgetLayoutItem[] {
  const known = rows
    .filter((row) => isWidgetKey(row.widget_key))
    .sort((a, b) => a.position - b.position);
  const present = new Set(known.map((row) => row.widget_key));
  const missing = defaultWidgetLayout().filter((w) => !present.has(w.widget_key));

  return [...known, ...missing].map((row, index) => ({
    widget_key: row.widget_key,
    position: index + 1,
    visible: row.visible,
  }));
}

/**
 * Replace a group's entire widget layout (reorder and/or hide). Any group
 * member may call this -- reuses the "any member" getUserGroupRole idiom
 * used by checklist/logistics, not Story 2.8's admin-only PATCH pattern.
 *
 * `changes` must be the complete layout (the customize-mode UI
 * always sends the full desired state after a move/hide, mirroring
 * EventChecklist's optimistic-update shape): every registry widget_key exactly
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

    const validationError = validateWidgetLayout(changes);
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
      data: reconcileWithRegistry(result.rows),
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
