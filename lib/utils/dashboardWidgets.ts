// Shared, client-safe helpers for the Dashboard's customizable widget
// layout (Stories 13.4, 14.1). The widget set itself now lives in the registry
// (lib/dashboard/widgetRegistry.ts, Story 14.1); this module keeps the
// existing import path and the client-side response check. Kept separate
// from dashboardWidgetsService.ts, which touches the DB pool and can't be
// imported into 'use client' components.

import { WidgetLayoutItem, validateWidgetLayout } from '@/lib/dashboard/widgetRegistry';

export {
  WIDGET_KEYS,
  DEFAULT_WIDGET_ORDER,
  isWidgetKey,
  defaultWidgetLayout,
  getWidgetDefinition,
} from '@/lib/dashboard/widgetRegistry';
export type { WidgetKey, WidgetLayoutItem } from '@/lib/dashboard/widgetRegistry';

// Client-side sanity check on a fetched/polled layout response before
// applying it with setState. A malformed or truncated response (bug, bad
// proxy, etc.) shouldn't be able to blank out or corrupt the Dashboard --
// callers should fall back to the current state when this returns false.
export function isValidWidgetLayoutResponse(data: unknown): data is WidgetLayoutItem[] {
  return validateWidgetLayout(data) === null;
}
