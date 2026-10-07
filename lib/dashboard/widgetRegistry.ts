// Single source of truth for the dashboard's widget types (Story 14.1).
// Client- and server-safe: no DB or component imports. Renderers live in
// components/groups/widgetRenderers.ts so the layout service can validate
// keys without pulling React components into server code.
//
// Adding a widget type = one entry here + one renderer entry. The
// group_dashboard_widgets CHECK constraints were dropped in migration 036;
// keys and positions are validated in application code from this registry.

export interface WidgetDefinition {
  key: string;
  label: string;
  // Whether items in this widget can carry comments (Stories 13.7/13.8,
  // 14.3, 14.4). Photos are explicitly not commentable.
  commentable: boolean;
  // Whether the widget renders in the no-login public view.
  publicView: boolean;
}

// Array order is the default render order (today's EventPlanningTab order).
export const WIDGET_DEFINITIONS = [
  { key: 'photos', label: 'Photos', commentable: false, publicView: true },
  { key: 'checklist', label: 'Checklist', commentable: true, publicView: true },
  { key: 'timeline', label: 'Timeline', commentable: true, publicView: true },
  { key: 'logistics', label: 'Logistics', commentable: true, publicView: true },
  { key: 'polls', label: 'Polls', commentable: true, publicView: true },
  { key: 'notes', label: 'Notes & Links', commentable: false, publicView: true },
] as const satisfies readonly WidgetDefinition[];

export type WidgetKey = (typeof WIDGET_DEFINITIONS)[number]['key'];

export const WIDGET_KEYS: readonly WidgetKey[] = WIDGET_DEFINITIONS.map((w) => w.key);

export const DEFAULT_WIDGET_ORDER: WidgetKey[] = [...WIDGET_KEYS];

export function isWidgetKey(value: unknown): value is WidgetKey {
  return typeof value === 'string' && (WIDGET_KEYS as readonly string[]).includes(value);
}

export function getWidgetDefinition(key: WidgetKey): WidgetDefinition {
  return WIDGET_DEFINITIONS.find((w) => w.key === key)!;
}

export interface WidgetLayoutItem {
  widget_key: WidgetKey;
  position: number;
  visible: boolean;
}

export function defaultWidgetLayout(): WidgetLayoutItem[] {
  return DEFAULT_WIDGET_ORDER.map((widget_key, index) => ({
    widget_key,
    position: index + 1,
    visible: true,
  }));
}

// Structural check shared by the layout service and the client's poll
// validation: every registry widget exactly once, positions a permutation
// of 1..N, visible a boolean. Returns an error message or null.
export function validateWidgetLayout(changes: unknown): string | null {
  const expected = WIDGET_KEYS.length;
  if (!Array.isArray(changes) || changes.length !== expected) {
    return `widgets must be an array of exactly ${expected} entries`;
  }

  const seenKeys = new Set<string>();
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

    if (!Number.isInteger(position) || (position as number) < 1 || (position as number) > expected) {
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

  return null;
}

/**
 * Reconcile stored rows with the registry: drop rows whose key the registry
 * no longer knows, append registry widgets the group has no row for (visible,
 * at the end -- e.g. a widget added after the group's rows were stored), and
 * renumber positions 1..N. The result always passes validateWidgetLayout, so
 * the client accepts it and a PATCH built from it is valid. A group with no
 * usable rows gets the default layout.
 */
export function reconcileWithRegistry(rows: WidgetLayoutItem[]): WidgetLayoutItem[] {
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
