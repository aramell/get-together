import {
  WIDGET_DEFINITIONS,
  WIDGET_KEYS,
  DEFAULT_WIDGET_ORDER,
  defaultWidgetLayout,
  getWidgetDefinition,
  isWidgetKey,
  validateWidgetLayout,
} from '@/lib/dashboard/widgetRegistry';
import { WIDGET_RENDERERS } from '@/components/groups/widgetRenderers';
import { isValidWidgetLayoutResponse } from '@/lib/utils/dashboardWidgets';

describe('widgetRegistry', () => {
  it('keeps today\'s widgets in default order, with Notes & Links appended last', () => {
    expect(DEFAULT_WIDGET_ORDER).toEqual(['photos', 'checklist', 'timeline', 'logistics', 'polls', 'notes']);
    expect(WIDGET_DEFINITIONS.map((w) => w.label)).toEqual([
      'Photos',
      'Checklist',
      'Timeline',
      'Logistics',
      'Polls',
      'Notes & Links',
    ]);
  });

  it('flags every widget except photos and notes as commentable; all show in the public view', () => {
    expect(WIDGET_DEFINITIONS.filter((w) => w.commentable).map((w) => w.key)).toEqual(['checklist', 'timeline', 'logistics', 'polls']);
    expect(WIDGET_DEFINITIONS.every((w) => w.publicView)).toBe(true);
  });

  it('recognizes registry keys and rejects others', () => {
    expect(isWidgetKey('polls')).toBe(true);
    expect(isWidgetKey('not-a-widget')).toBe(false);
    expect(isWidgetKey(undefined)).toBe(false);
    expect(getWidgetDefinition('photos').label).toBe('Photos');
  });

  it('builds a default layout: registry order, positions 1..N, all visible', () => {
    expect(defaultWidgetLayout()).toEqual(
      WIDGET_KEYS.map((widget_key, i) => ({ widget_key, position: i + 1, visible: true }))
    );
  });

  describe('validateWidgetLayout', () => {
    const valid = () => defaultWidgetLayout();

    it('accepts a full, reordered layout', () => {
      const reordered = [...valid()].reverse().map((w, i) => ({ ...w, position: i + 1 }));
      expect(validateWidgetLayout(reordered)).toBeNull();
    });

    it('rejects an unknown key', () => {
      const bad = valid().map((w, i) => (i === 0 ? { ...w, widget_key: 'nope' } : w));
      expect(validateWidgetLayout(bad)).toMatch(/Invalid widget_key/);
    });

    it('rejects a missing widget', () => {
      expect(validateWidgetLayout(valid().slice(0, 5))).toMatch(/exactly/);
    });

    it('rejects a duplicated widget', () => {
      const dup = valid().map((w, i) => (i === 1 ? { ...w, widget_key: 'photos' as const } : w));
      expect(validateWidgetLayout(dup)).toMatch(/Duplicate widget_key/);
    });

    it('rejects duplicate, non-integer and out-of-range positions', () => {
      expect(validateWidgetLayout(valid().map((w) => ({ ...w, position: 1 })))).toMatch(/Duplicate position/);
      expect(validateWidgetLayout(valid().map((w, i) => (i === 0 ? { ...w, position: 1.5 } : w)))).toMatch(/Invalid position/);
      expect(validateWidgetLayout(valid().map((w, i) => (i === 0 ? { ...w, position: 7 } : w)))).toMatch(/Invalid position/);
    });

    it('rejects a non-boolean visible flag and non-array input', () => {
      expect(validateWidgetLayout(valid().map((w, i) => (i === 0 ? { ...w, visible: 'yes' } : w)))).toMatch(/visible/);
      expect(validateWidgetLayout('nope')).toMatch(/array/);
    });
  });

  it('has unique keys that fit the column, and a renderer for every key', () => {
    expect(new Set(WIDGET_KEYS).size).toBe(WIDGET_KEYS.length);
    expect(WIDGET_KEYS.every((k) => k.length <= 50)).toBe(true);
    expect(WIDGET_KEYS.every((k) => typeof WIDGET_RENDERERS[k] === 'function')).toBe(true);
  });

  it('client response check mirrors the registry validation', () => {
    expect(isValidWidgetLayoutResponse(defaultWidgetLayout())).toBe(true);
    expect(isValidWidgetLayoutResponse(defaultWidgetLayout().slice(1))).toBe(false);
    expect(isValidWidgetLayoutResponse(null)).toBe(false);
  });
});
