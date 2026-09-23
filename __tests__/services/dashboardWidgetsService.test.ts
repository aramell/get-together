import { getWidgetLayout, updateWidgetLayout } from '@/lib/services/dashboardWidgetsService';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import { defaultWidgetLayout } from '@/lib/utils/dashboardWidgets';

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

    it('returns the stored layout when rows exist', async () => {
      const rows = [
        { widget_key: 'checklist', position: 1, visible: true },
        { widget_key: 'photos', position: 2, visible: false },
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
});
