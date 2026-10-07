import {
  getLogisticsCategories,
  updateLogisticsCategories,
  generateCategoryKey,
} from '@/lib/services/logisticsCategoriesService';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');

describe('logisticsCategoriesService', () => {
  let mockClient: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = { query: jest.fn(), release: jest.fn() };
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('getLogisticsCategories', () => {
    it('returns the built-in defaults when the group has no rows', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await getLogisticsCategories('g1', 'u1');

      expect(result.success).toBe(true);
      expect(result.data?.customized).toBe(false);
      expect(result.data?.categories).toEqual([
        { key: 'bring', label: 'Bring List', mode: 'single' },
        { key: 'carpool', label: 'Carpool', mode: 'seats' },
      ]);
    });

    it('returns stored rows in order, customized', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      mockClient.query.mockResolvedValueOnce({
        rows: [{ category_key: 'snacks', label: 'Snacks', mode: 'single' }],
      });
      const result = await getLogisticsCategories('g1', 'u1');
      expect(result.data).toEqual({
        customized: true,
        categories: [{ key: 'snacks', label: 'Snacks', mode: 'single' }],
      });
    });

    it('rejects a non-member', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue(null);
      const result = await getLogisticsCategories('g1', 'u1');
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('updateLogisticsCategories', () => {
    // call order: BEGIN, advisory lock, current categories, used keys, then DELETE / INSERT... / COMMIT
    const stub = (currentRows: any[], usedKeys: string[]) => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // advisory lock
        .mockResolvedValueOnce({ rows: currentRows })
        .mockResolvedValueOnce({ rows: usedKeys.map((category) => ({ category })) })
        .mockResolvedValue({ rows: [] });
    };

    it('rejects a non-admin', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      const result = await updateLogisticsCategories('g1', 'u1', [{ label: 'A', mode: 'single' }]);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it.each([
      ['empty list', []],
      ['bad mode', [{ label: 'A', mode: 'nope' }]],
      ['empty label', [{ label: '  ', mode: 'single' }]],
      ['long label', [{ label: 'x'.repeat(51), mode: 'single' }]],
      ['duplicate keys', [{ key: 'bring', label: 'A', mode: 'single' }, { key: 'bring', label: 'B', mode: 'single' }]],
    ])('rejects %s', async (_name, list) => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      const result = await updateLogisticsCategories('g1', 'u1', list as any);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('replaces the list transactionally, keeping keys and generating new ones', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      stub([], []);

      const result = await updateLogisticsCategories('g1', 'u1', [
        { key: 'bring', label: 'Snacks', mode: 'single' },
        { label: 'Rides', mode: 'seats' },
        { label: 'Rides', mode: 'seats' },
      ]);

      expect(result.success).toBe(true);
      expect(result.data?.categories).toEqual([
        { key: 'bring', label: 'Snacks', mode: 'single' },
        { key: 'rides', label: 'Rides', mode: 'seats' },
        { key: 'rides-2', label: 'Rides', mode: 'seats' },
      ]);
      const sqls = mockClient.query.mock.calls.map((c) => String(c[0]));
      expect(sqls).toContain('COMMIT');
      expect(sqls[0]).toBe('BEGIN');
      expect(sqls[1]).toContain('pg_advisory_xact_lock');
      expect(sqls.indexOf('BEGIN')).toBeLessThan(sqls.findIndex((q) => q.includes('FROM logistics_categories')));
      expect(sqls.filter((q) => q.includes('INSERT INTO logistics_categories'))).toHaveLength(3);
      const positions = mockClient.query.mock.calls
        .filter((c) => String(c[0]).includes('INSERT INTO logistics_categories'))
        .map((c) => c[1][4]);
      expect(positions).toEqual([1, 2, 3]);
    });

    it('rejects deleting a category that has items with CATEGORY_IN_USE', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      stub([], ['carpool']);
      const result = await updateLogisticsCategories('g1', 'u1', [
        { key: 'bring', label: 'Bring List', mode: 'single' },
      ]);
      expect(result.errorCode).toBe('CATEGORY_IN_USE');
      const sqls = mockClient.query.mock.calls.map((c) => String(c[0]));
      expect(sqls).toContain('ROLLBACK');
      expect(sqls).not.toContain('COMMIT');
    });

    it('rejects changing the mode of a category that has items', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      stub([], ['bring']);
      const result = await updateLogisticsCategories('g1', 'u1', [
        { key: 'bring', label: 'Bring List', mode: 'seats' },
        { key: 'carpool', label: 'Carpool', mode: 'seats' },
      ]);
      expect(result.errorCode).toBe('MODE_LOCKED');
    });

    it('allows renaming a category that has items', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      stub([], ['bring']);
      const result = await updateLogisticsCategories('g1', 'u1', [
        { key: 'bring', label: 'Snacks', mode: 'single' },
        { key: 'carpool', label: 'Carpool', mode: 'seats' },
      ]);
      expect(result.success).toBe(true);
    });

    it('rejects an unknown key', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // lock
        .mockResolvedValueOnce({ rows: [] }); // current
      const result = await updateLogisticsCategories('g1', 'u1', [{ key: 'ghost', label: 'A', mode: 'single' }]);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('generateCategoryKey', () => {
    it('slugifies and de-duplicates', () => {
      expect(generateCategoryKey('Team Gear!', new Set())).toBe('team-gear');
      expect(generateCategoryKey('Team Gear', new Set(['team-gear']))).toBe('team-gear-2');
      expect(generateCategoryKey('???', new Set())).toBe('category');
    });
  });
});
