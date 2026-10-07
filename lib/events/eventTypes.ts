// Event type registry (Story 14.7). Client- and server-safe: no DB or
// component imports.
//
// A preset is plain data. Creating an event with a type copies these values
// into that event (see lib/services/eventTypePresetService.ts); editing a
// preset later never changes existing events. `labels` are read live (never
// copied) through getWidgetLabel (Story 14.8).

import {
  DEFAULT_WIDGET_ORDER,
  WidgetKey,
  getWidgetDefinition,
  WidgetLayoutItem,
} from '@/lib/dashboard/widgetRegistry';
import {
  DEFAULT_LOGISTICS_CATEGORIES,
  LogisticsCategoryMode,
} from '@/lib/logistics/defaultCategories';

export interface EventTypeCategory {
  label: string;
  mode: LogisticsCategoryMode;
}

export interface EventTypeDefinition {
  key: string;
  label: string;
  description: string;
  // Full layout: every registry widget once, positions 1..N.
  widgets: WidgetLayoutItem[];
  categories: EventTypeCategory[];
  labels: Record<string, string>;
  starterItems: string[];
}

// Build a full layout from the visible widgets in order; every other
// registry widget is appended hidden.
function layout(visible: WidgetKey[]): WidgetLayoutItem[] {
  const hidden = DEFAULT_WIDGET_ORDER.filter((k) => !visible.includes(k));
  return [...visible, ...hidden].map((widget_key, index) => ({
    widget_key,
    position: index + 1,
    visible: visible.includes(widget_key),
  }));
}

export const EVENT_TYPES: readonly EventTypeDefinition[] = [
  {
    key: 'trip',
    label: 'Trip',
    description: 'Packing, itinerary, rides and shared plans for a getaway.',
    // Equals the system default layout and categories, so applying Trip
    // writes no rows.
    widgets: layout(DEFAULT_WIDGET_ORDER),
    categories: DEFAULT_LOGISTICS_CATEGORIES.map(({ label, mode }) => ({ label, mode })),
    labels: {
      checklist: 'Checklist',
      timeline: 'Timeline',
      logistics: 'Logistics',
      polls: 'Polls',
      photos: 'Photos',
    },
    starterItems: [],
  },
  {
    key: 'dinner',
    label: 'Dinner',
    description: 'Who brings what, a few polls, and photos of the night.',
    widgets: layout(['logistics', 'checklist', 'polls', 'photos']),
    categories: [
      { label: 'Dishes', mode: 'single' },
      { label: 'Drinks', mode: 'single' },
    ],
    labels: {
      checklist: 'To do',
      timeline: 'Schedule',
      logistics: 'Who brings what',
      polls: 'Polls',
      photos: 'Photos',
    },
    starterItems: ['Confirm dietary needs', 'Set the table', 'Plan the menu'],
  },
  {
    key: 'game_night',
    label: 'Game night',
    description: 'Vote on games, claim snacks, and keep a checklist.',
    widgets: layout(['polls', 'logistics', 'checklist', 'photos']),
    categories: [
      { label: 'Games', mode: 'single' },
      { label: 'Snacks', mode: 'single' },
    ],
    labels: {
      checklist: 'Checklist',
      timeline: 'Schedule',
      logistics: 'Games and snacks',
      polls: 'Pick a game',
      photos: 'Photos',
    },
    starterItems: ['Pick the games', 'Clear table space'],
  },
  {
    key: 'practice',
    label: 'Practice',
    description: 'A schedule, gear to bring, and a carpool.',
    widgets: layout(['timeline', 'checklist', 'logistics']),
    categories: [
      { label: 'Equipment', mode: 'single' },
      { label: 'Carpool', mode: 'seats' },
    ],
    labels: {
      checklist: 'Checklist',
      timeline: 'Schedule',
      logistics: 'Gear and rides',
      polls: 'Polls',
      photos: 'Photos',
    },
    starterItems: ['Confirm the field or court', 'Bring water and equipment'],
  },
];

export const EVENT_TYPE_KEYS: readonly string[] = EVENT_TYPES.map((t) => t.key);

// Picker default when neither the group nor the request names a type.
export const DEFAULT_EVENT_TYPE_KEY = 'trip';

export function isEventTypeKey(value: unknown): value is string {
  return typeof value === 'string' && EVENT_TYPE_KEYS.includes(value);
}

export function getEventType(key: string | null | undefined): EventTypeDefinition | null {
  if (!key) return null;
  return EVENT_TYPES.find((t) => t.key === key) ?? null;
}

// Heading for a widget on an event of the given type: the preset's label,
// else the widget registry label (null, unknown or retired type, or a key the
// preset has no label for).
export function getWidgetLabel(
  eventType: string | null | undefined,
  widgetKey: WidgetKey
): string {
  return getEventType(eventType)?.labels[widgetKey] ?? getWidgetDefinition(widgetKey).label;
}
