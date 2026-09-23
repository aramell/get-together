// Shared, client-safe constants for the Dashboard's customizable widget
// layout (Story 13.4). Kept separate from dashboardWidgetsService.ts (which
// touches the DB pool and can't be imported into 'use client' components)
// so both the server service and the client components render from the
// same fixed widget set/default order.

export const WIDGET_KEYS = ['photos', 'checklist', 'timeline', 'logistics', 'polls'] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];

// Today's hardcoded EventPlanningTab render order -- the fallback used both
// by the migration's backfill and by getWidgetLayout for a group with no
// rows yet (new groups, or a group that predates a future re-backfill).
export const DEFAULT_WIDGET_ORDER: WidgetKey[] = ['photos', 'checklist', 'timeline', 'logistics', 'polls'];

export const WIDGET_LABELS: Record<WidgetKey, string> = {
  photos: 'Photos',
  checklist: 'Checklist',
  timeline: 'Timeline',
  logistics: 'Logistics',
  polls: 'Polls',
};

export interface WidgetLayoutItem {
  widget_key: WidgetKey;
  position: number;
  visible: boolean;
}

export function isWidgetKey(value: unknown): value is WidgetKey {
  return typeof value === 'string' && (WIDGET_KEYS as readonly string[]).includes(value);
}

export function defaultWidgetLayout(): WidgetLayoutItem[] {
  return DEFAULT_WIDGET_ORDER.map((widget_key, index) => ({
    widget_key,
    position: index + 1,
    visible: true,
  }));
}

// Client-side sanity check on a fetched/polled layout response before
// applying it with setState. The real endpoint's contract always returns
// exactly the 5 fixed widgets with recognized keys, but a malformed or
// truncated response (bug, bad proxy, etc.) shouldn't be able to blank out
// or corrupt the Dashboard -- callers should fall back to the current state
// when this returns false.
export function isValidWidgetLayoutResponse(data: unknown): data is WidgetLayoutItem[] {
  return (
    Array.isArray(data) &&
    data.length === WIDGET_KEYS.length &&
    data.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        isWidgetKey((item as Record<string, unknown>).widget_key) &&
        typeof (item as Record<string, unknown>).position === 'number' &&
        typeof (item as Record<string, unknown>).visible === 'boolean'
    )
  );
}
