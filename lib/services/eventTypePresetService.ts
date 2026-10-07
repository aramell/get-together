import { getEventType } from '@/lib/events/eventTypes';
import {
  WidgetLayoutItem,
  defaultWidgetLayout,
  reconcileWithRegistry,
  validateWidgetLayout,
} from '@/lib/dashboard/widgetRegistry';
import { defaultLogisticsCategories } from '@/lib/logistics/defaultCategories';
import { generateCategoryKey } from '@/lib/services/logisticsCategoriesService';

type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

function layoutsEqual(
  a: { widget_key: string; position: number; visible: boolean }[],
  b: { widget_key: string; position: number; visible: boolean }[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (item, i) =>
      item.widget_key === b[i].widget_key &&
      item.position === b[i].position &&
      item.visible === b[i].visible
  );
}

/**
 * Copy an event type's preset into a newly created event (Story 14.7). Runs
 * on the caller's client, inside the caller's transaction: any failure
 * throws so the caller rolls the whole creation back.
 *
 * - Widgets: written to event_dashboard_widgets only when the preset differs
 *   from the system default and the group has no layout rows (group default
 *   wins).
 * - Categories: written to the group's logistics_categories only when the
 *   group has none and the preset differs from the defaults.
 * - Starter items: event_checklist_items created by the event creator.
 */
export async function applyEventTypePreset(
  client: Queryable,
  event: { id: string; group_id: string; event_type?: string | null },
  userId: string
): Promise<void> {
  const preset = getEventType(event.event_type);
  if (!preset) return;

  // Widgets
  const widgetError = validateWidgetLayout(preset.widgets);
  if (widgetError) throw new Error(`Invalid preset layout: ${widgetError}`);

  if (!layoutsEqual(preset.widgets, defaultWidgetLayout())) {
    const groupRows = await client.query(
      `SELECT widget_key, position, visible
       FROM group_dashboard_widgets
       WHERE group_id = $1
       ORDER BY position ASC`,
      [event.group_id]
    );
    // Rows equal to the system default (e.g. migration 033's backfill) are
    // not a customization. Reconcile first: backfilled groups predate widgets
    // added to the registry later (e.g. notes), which the default includes.
    const groupCustomized =
      groupRows.rows.length > 0 &&
      !layoutsEqual(
        reconcileWithRegistry(groupRows.rows as WidgetLayoutItem[]),
        defaultWidgetLayout()
      );
    if (!groupCustomized) {
      for (const item of preset.widgets) {
        await client.query(
          `INSERT INTO event_dashboard_widgets (event_id, widget_key, position, visible)
           VALUES ($1, $2, $3, $4)`,
          [event.id, item.widget_key, item.position, item.visible]
        );
      }
    }
  }

  // Categories
  const defaults = defaultLogisticsCategories();
  const sameAsDefaults =
    preset.categories.length === defaults.length &&
    preset.categories.every((c, i) => c.label === defaults[i].label && c.mode === defaults[i].mode);

  if (!sameAsDefaults) {
    // Same lock as updateLogisticsCategories so the "no rows yet" check and
    // the inserts can't interleave with an admin's save.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [event.group_id]);
    const existing = await client.query(
      `SELECT 1 FROM logistics_categories WHERE group_id = $1 LIMIT 1`,
      [event.group_id]
    );
    if (!existing.rows.length) {
      const taken = new Set<string>();
      for (let i = 0; i < preset.categories.length; i++) {
        const c = preset.categories[i];
        const key = generateCategoryKey(c.label, taken);
        taken.add(key);
        await client.query(
          `INSERT INTO logistics_categories (group_id, category_key, label, mode, position)
           VALUES ($1, $2, $3, $4, $5)`,
          [event.group_id, key, c.label, c.mode, i + 1]
        );
      }
    }
  }

  // Starter checklist items
  for (const title of preset.starterItems) {
    await client.query(
      `INSERT INTO event_checklist_items (event_id, group_id, created_by, title)
       VALUES ($1, $2, $3, $4)`,
      [event.id, event.group_id, userId, title]
    );
  }
}
