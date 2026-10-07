import {
  getWidgetLayout,
  updateWidgetLayout,
  getEventWidgetLayout,
  updateEventWidgetLayout,
  resetEventWidgetLayout,
} from '@/lib/services/dashboardWidgetsService';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import { defaultWidgetLayout } from '@/lib/utils/dashboardWidgets';
import { validateWidgetLayout } from '@/lib/dashboard/widgetRegistry';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');

describe('dashboardWidgetsService', () => {
  let mockClient: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('getWidgetLayout', () => {
    it('falls back to the default order, all visible, when a group has no rows', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await getWidgetLayout('group-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(defaultWidgetLayout());
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('drops unknown keys, appends missing registry widgets and renumbers positions', async () => {
      const rows = [
        { widget_key: 'retired-widget', position: 1, visible: true },
        { widget_key: 'checklist', position: 4, visible: false },
        { widget_key: 'photos', position: 5, visible: true },
      ];
      mockClient.query.mockResolvedValueOnce({ rows });

      const result = await getWidgetLayout('group-1');

      expect(result.data).toEqual([
        { widget_key: 'checklist', position: 1, visible: false },
        { widget_key: 'photos', position: 2, visible: true },
        { widget_key: 'timeline', position: 3, visible: true },
        { widget_key: 'logistics', position: 4, visible: true },
        { widget_key: 'polls', position: 5, visible: true },
      ]);
      expect(validateWidgetLayout(result.data)).toBeNull();
    });

    it('falls back to the default layout when every stored key is unknown', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ widget_key: 'gone', position: 1, visible: false }] });

      const result = await getWidgetLayout('group-1');

      expect(result.data).toEqual(defaultWidgetLayout());
    });

    it('returns the stored layout when rows exist', async () => {
      const rows = [
        { widget_key: 'checklist', position: 1, visible: true },
        { widget_key: 'photos', position: 2, visible: false },
        { widget_key: 'timeline', position: 3, visible: true },
        { widget_key: 'logistics', position: 4, visible: true },
        { widget_key: 'polls', position: 5, visible: true },
      ];
      mockClient.query.mockResolvedValueOnce({ rows });

      const result = await getWidgetLayout('group-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(rows);
    });

    it('returns INTERNAL_ERROR on a query failure', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('db down'));

      const result = await getWidgetLayout('group-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateWidgetLayout', () => {
    const validLayout = defaultWidgetLayout();

    it('rejects a non-member with FORBIDDEN and writes no rows', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await updateWidgetLayout('group-1', 'user-1', validLayout);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      // Only BEGIN/INSERT/COMMIT queries would indicate a write; none should
      // have been attempted since auth failed before the transaction starts.
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('allows a regular member (not just admin) to update the layout', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      for (let i = 0; i < validLayout.length; i++) {
        mockClient.query.mockResolvedValueOnce({ rows: [] }); // each upsert
      }
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: validLayout }); // final SELECT

      const result = await updateWidgetLayout('group-1', 'member-user', validLayout);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validLayout);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rejects an unknown widget_key with VALIDATION_ERROR', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      const badLayout = validLayout.map((w, i) => (i === 0 ? { ...w, widget_key: 'not-a-widget' as any } : w));

      const result = await updateWidgetLayout('group-1', 'user-1', badLayout);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects a payload missing one of the 5 widgets', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      const shortLayout = validLayout.slice(0, 4);

      const result = await updateWidgetLayout('group-1', 'user-1', shortLayout);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate positions', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      const dupLayout = validLayout.map((w, i) => ({ ...w, position: 1 }));

      const result = await updateWidgetLayout('group-1', 'user-1', dupLayout);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rolls back and returns INTERNAL_ERROR when an upsert fails mid-transaction', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('constraint violation')); // first upsert fails
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const result = await updateWidgetLayout('group-1', 'user-1', validLayout);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  describe('event layout (Story 14.5)', () => {
    const validLayout = defaultWidgetLayout();
    const custom = [
      { widget_key: 'polls', position: 1, visible: true },
      { widget_key: 'photos', position: 2, visible: false },
      { widget_key: 'checklist', position: 3, visible: true },
      { widget_key: 'timeline', position: 4, visible: true },
      { widget_key: 'logistics', position: 5, visible: true },
    ];

    it('returns the event rows with customized=true when the event has an override', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: custom });

      const result = await getEventWidgetLayout('group-1', 'event-1');

      expect(result.success).toBe(true);
      expect(result.customized).toBe(true);
      expect(result.data).toEqual(custom);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('falls back to group rows with customized=false when the event has none', async () => {
      const groupRows = defaultWidgetLayout().map((w) => (w.widget_key === 'photos' ? { ...w, visible: false } : w));
      mockClient.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: groupRows });

      const result = await getEventWidgetLayout('group-1', 'event-1');

      expect(result.customized).toBe(false);
      expect(result.data).toEqual(groupRows);
    });

    it('falls back to the system default when neither event nor group has rows', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await getEventWidgetLayout('group-1', 'event-1');

      expect(result.customized).toBe(false);
      expect(result.data).toEqual(defaultWidgetLayout());
    });

    it('rejects a non-member on get when a userId is given', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await getEventWidgetLayout('group-1', 'event-1', 'user-1');

      expect(result.errorCode).toBe('FORBIDDEN');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND on get when the event is not in the group', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await getEventWidgetLayout('group-1', 'event-x', 'user-1');

      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('upserts the full layout into event_dashboard_widgets in a transaction', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      const saved = [
        { widget_key: 'checklist', position: 1, visible: true },
        { widget_key: 'photos', position: 2, visible: false },
        { widget_key: 'timeline', position: 3, visible: true },
        { widget_key: 'logistics', position: 4, visible: true },
        { widget_key: 'polls', position: 5, visible: true },
      ];
      mockClient.query.mockImplementation(async (sql: string) => {
        const q = String(sql);
        if (q.includes('FROM event_proposals')) return { rows: [{ id: 'event-1' }] };
        if (q.includes('SELECT widget_key') && q.includes('event_dashboard_widgets')) return { rows: saved };
        return { rows: [] }; // BEGIN, upserts, COMMIT
      });

      const result = await updateEventWidgetLayout('group-1', 'event-1', 'user-1', validLayout);

      expect(result.success).toBe(true);
      expect(result.customized).toBe(true);
      const sqls = mockClient.query.mock.calls.map(([sql]) => String(sql));
      expect(sqls).toContain('BEGIN');
      expect(sqls).toContain('COMMIT');
      expect(sqls.filter((q) => q.includes('INSERT INTO event_dashboard_widgets'))).toHaveLength(5);
      expect(sqls.some((q) => q.includes('group_dashboard_widgets'))).toBe(false);
      const photosInsert = mockClient.query.mock.calls.find(
        ([sql, params]) => String(sql).includes('INSERT INTO event_dashboard_widgets') && params?.[1] === 'photos'
      );
      expect(photosInsert?.[1]).toEqual(['event-1', 'photos', validLayout.find((w) => w.widget_key === 'photos')!.position, validLayout.find((w) => w.widget_key === 'photos')!.visible]);
      expect(result.data).toEqual(saved);
    });

    it('rejects a non-member on update without writing', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await updateEventWidgetLayout('group-1', 'event-1', 'user-1', validLayout);

      expect(result.errorCode).toBe('FORBIDDEN');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND on update when the event is not in the group', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await updateEventWidgetLayout('group-1', 'event-x', 'user-1', validLayout);

      expect(result.errorCode).toBe('NOT_FOUND');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid layout with VALIDATION_ERROR', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'event-1' }] });

      const result = await updateEventWidgetLayout('group-1', 'event-1', 'user-1', validLayout.slice(0, 4));

      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('INVALID_WIDGET_LAYOUT');
    });

    it('rolls back when an upsert fails', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'event-1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('boom'));
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const result = await updateEventWidgetLayout('group-1', 'event-1', 'user-1', validLayout);

      expect(result.errorCode).toBe('INTERNAL_ERROR');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('reset deletes the event rows and returns the group layout', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 'event-1' }] }) // event check
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [] }); // group rows

      const result = await resetEventWidgetLayout('group-1', 'event-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.customized).toBe(false);
      expect(result.data).toEqual(defaultWidgetLayout());
      expect(String(mockClient.query.mock.calls[1][0])).toContain('DELETE FROM event_dashboard_widgets');
    });

    it('reset rejects a non-member', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await resetEventWidgetLayout('group-1', 'event-1', 'user-1');

      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });
});
