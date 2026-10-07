import { applyEventTypePreset } from '@/lib/services/eventTypePresetService';
import { getEventType } from '@/lib/events/eventTypes';
import { defaultWidgetLayout } from '@/lib/dashboard/widgetRegistry';

type Call = { sql: string; params?: any[] };

function makeClient(opts: { groupLayoutRows?: boolean; groupLayout?: any[]; groupCategoryRows?: boolean; failOn?: string } = {}) {
  const calls: Call[] = [];
  const client = {
    query: jest.fn(async (sql: string, params?: any[]) => {
      calls.push({ sql, params });
      if (opts.failOn && sql.includes(opts.failOn)) throw new Error('boom');
      if (sql.includes('FROM group_dashboard_widgets')) {
        return {
          rows: opts.groupLayout ?? (opts.groupLayoutRows ? [{ widget_key: 'polls', position: 1, visible: true }] : []),
        };
      }
      if (sql.includes('FROM logistics_categories')) {
        return { rows: opts.groupCategoryRows ? [{ '?column?': 1 }] : [] };
      }
      return { rows: [] };
    }),
  };
  return { client, calls };
}

const inserts = (calls: Call[], table: string) =>
  calls.filter((c) => c.sql.includes(`INSERT INTO ${table}`));

const event = (event_type: string | null) => ({ id: 'e1', group_id: 'g1', event_type });

describe('applyEventTypePreset', () => {
  it('does nothing without a type', async () => {
    const { client, calls } = makeClient();
    await applyEventTypePreset(client, event(null), 'u1');
    expect(calls).toHaveLength(0);
  });

  it('does nothing for an unknown type', async () => {
    const { client, calls } = makeClient();
    await applyEventTypePreset(client, event('rave'), 'u1');
    expect(calls).toHaveLength(0);
  });

  it('treats a backfilled group (rows predating the notes widget) as uncustomized', async () => {
    const backfilled = defaultWidgetLayout()
      .filter((w) => w.widget_key !== 'notes')
      .map((w, i) => ({ ...w, position: i + 1 }));
    const { client, calls } = makeClient({ groupLayout: backfilled });
    await applyEventTypePreset(client, event('dinner'), 'u1');
    expect(inserts(calls, 'event_dashboard_widgets')).toHaveLength(getEventType('dinner')!.widgets.length);
  });

  it('writes no rows for Trip', async () => {
    const { client, calls } = makeClient();
    await applyEventTypePreset(client, event('trip'), 'u1');
    expect(calls.filter((c) => c.sql.includes('INSERT'))).toHaveLength(0);
  });

  it('Dinner in a fresh group writes layout, categories and starter items', async () => {
    const { client, calls } = makeClient();
    await applyEventTypePreset(client, event('dinner'), 'u1');

    const widgets = inserts(calls, 'event_dashboard_widgets');
    const dinner = getEventType('dinner')!;
    expect(widgets).toHaveLength(dinner.widgets.length);
    expect(widgets[0].params).toEqual(['e1', 'logistics', 1, true]);

    const cats = inserts(calls, 'logistics_categories');
    expect(cats.map((c) => c.params)).toEqual([
      ['g1', 'dishes', 'Dishes', 'single', 1],
      ['g1', 'drinks', 'Drinks', 'single', 2],
    ]);

    const items = inserts(calls, 'event_checklist_items');
    expect(items).toHaveLength(dinner.starterItems.length);
    expect(items[0].params).toEqual(['e1', 'g1', 'u1', dinner.starterItems[0]]);
  });

  it('skips widgets when the group has its own layout but still applies the rest', async () => {
    const { client, calls } = makeClient({ groupLayoutRows: true });
    await applyEventTypePreset(client, event('dinner'), 'u1');
    expect(inserts(calls, 'event_dashboard_widgets')).toHaveLength(0);
    expect(inserts(calls, 'logistics_categories').length).toBeGreaterThan(0);
    expect(inserts(calls, 'event_checklist_items').length).toBeGreaterThan(0);
  });

  it('copies widgets when group rows equal the system default (033 backfill)', async () => {
    const { client, calls } = makeClient({ groupLayout: defaultWidgetLayout() });
    await applyEventTypePreset(client, event('dinner'), 'u1');
    expect(inserts(calls, 'event_dashboard_widgets').length).toBeGreaterThan(0);
  });

  it('does not copy widgets when group rows differ from the default', async () => {
    const custom = defaultWidgetLayout().reverse().map((w, i) => ({ ...w, position: i + 1 }));
    const { client, calls } = makeClient({ groupLayout: custom });
    await applyEventTypePreset(client, event('dinner'), 'u1');
    expect(inserts(calls, 'event_dashboard_widgets')).toHaveLength(0);
  });

  it('leaves categories alone when the group already has some', async () => {
    const { client, calls } = makeClient({ groupCategoryRows: true });
    await applyEventTypePreset(client, event('dinner'), 'u1');
    expect(inserts(calls, 'logistics_categories')).toHaveLength(0);
    expect(inserts(calls, 'event_dashboard_widgets').length).toBeGreaterThan(0);
  });

  it('propagates a failure so the caller can roll back', async () => {
    const { client } = makeClient({ failOn: 'INSERT INTO event_checklist_items' });
    await expect(applyEventTypePreset(client, event('dinner'), 'u1')).rejects.toThrow('boom');
  });
});
