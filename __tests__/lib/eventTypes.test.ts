import { EVENT_TYPES, getEventType, getWidgetLabel, isEventTypeKey } from '@/lib/events/eventTypes';
import { defaultWidgetLayout, validateWidgetLayout } from '@/lib/dashboard/widgetRegistry';
import { DEFAULT_LOGISTICS_CATEGORIES, isLogisticsCategoryMode } from '@/lib/logistics/defaultCategories';

describe('event type registry', () => {
  it('has Trip, Dinner, Game night and Practice', () => {
    expect(EVENT_TYPES.map((t) => t.label)).toEqual(['Trip', 'Dinner', 'Game night', 'Practice']);
  });

  it('keys are valid, unique and fit the column', () => {
    const keys = EVENT_TYPES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach((k) => expect(k.length).toBeLessThanOrEqual(30));
  });

  it('every preset layout is valid and every category mode is known', () => {
    for (const t of EVENT_TYPES) {
      expect(validateWidgetLayout(t.widgets)).toBeNull();
      t.categories.forEach((c) => expect(isLogisticsCategoryMode(c.mode)).toBe(true));
    }
  });

  it("Trip equals the system defaults and has no starter items", () => {
    const trip = getEventType('trip')!;
    expect(trip.widgets).toEqual(defaultWidgetLayout());
    expect(trip.categories).toEqual(DEFAULT_LOGISTICS_CATEGORIES.map(({ label, mode }) => ({ label, mode })));
    expect(trip.starterItems).toEqual([]);
  });

  it('isEventTypeKey and getEventType reject unknown or empty values', () => {
    expect(isEventTypeKey('dinner')).toBe(true);
    expect(isEventTypeKey('rave')).toBe(false);
    expect(isEventTypeKey(null)).toBe(false);
    expect(getEventType('rave')).toBeNull();
    expect(getEventType(null)).toBeNull();
  });
});

describe('getWidgetLabel', () => {
  it('uses the preset label for a known type', () => {
    expect(getWidgetLabel('dinner', 'checklist')).toBe('To do');
    expect(getWidgetLabel('dinner', 'timeline')).toBe('Schedule');
    expect(getWidgetLabel('dinner', 'logistics')).toBe('Who brings what');
  });

  it('matches the registry for Trip, null, undefined and unknown types', () => {
    for (const type of ['trip', null, undefined, 'retired_type']) {
      expect(getWidgetLabel(type, 'checklist')).toBe('Checklist');
      expect(getWidgetLabel(type, 'logistics')).toBe('Logistics');
    }
  });
});
