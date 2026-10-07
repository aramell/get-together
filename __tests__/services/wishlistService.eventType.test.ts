/** @jest-environment node */
// Isolated from wishlistService.test.ts (whose conversion mocks are
// order-dependent). Story 14.7: conversion uses the group's default type.
import { convertItemToEvent } from '@/lib/services/wishlistService';
import * as db from '@/lib/db/queries';

jest.mock('@/lib/db/queries');
const mockClient = { query: jest.fn(), release: jest.fn() };
jest.mock('@/lib/db/client', () => ({
  getClient: jest.fn(async () => mockClient),
  query: jest.fn(),
}));

const item = {
  id: 'i1',
  group_id: 'g1',
  created_by: 'u1',
  title: 'Pasta',
  description: null,
};
const eventData = { date: new Date(Date.now() + 86400000).toISOString() };

function stubClient(defaultType: string | null | undefined, opts: { failChecklist?: boolean } = {}) {
  mockClient.query.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT default_event_type')) {
      return { rows: [{ default_event_type: defaultType }] };
    }
    if (sql.includes('INSERT INTO event_proposals')) {
      return { rows: [{ id: 'e1', group_id: 'g1', created_by: 'u1', title: 'Pasta', event_type: defaultType ?? null }] };
    }
    if (sql.includes('UPDATE wishlist_items')) return { rows: [{ id: 'i1' }] };
    if (opts.failChecklist && sql.includes('INSERT INTO event_checklist_items')) throw new Error('boom');
    return { rows: [] };
  });
}

const sqls = () => mockClient.query.mock.calls.map((c: any[]) => c[0] as string);

describe('convertItemToEvent with a group default event type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.getWishlistItemById as jest.Mock).mockResolvedValue(item);
    (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
  });

  it('applies the group default type', async () => {
    stubClient('dinner');
    const result = await convertItemToEvent('g1', 'i1', 'u1', eventData as any);
    expect(result.success).toBe(true);
    const insert = mockClient.query.mock.calls.find((c: any[]) => c[0].includes('INSERT INTO event_proposals'));
    expect(insert[1]).toContain('dinner');
    expect(sqls().some((s) => s.includes('INSERT INTO event_checklist_items'))).toBe(true);
    expect(sqls()[sqls().length - 1]).toBe('COMMIT');
  });

  it('creates a plain event when the group has no default', async () => {
    stubClient(null);
    const result = await convertItemToEvent('g1', 'i1', 'u1', eventData as any);
    expect(result.success).toBe(true);
    expect(sqls().some((s) => s.includes('INSERT INTO event_checklist_items'))).toBe(false);
    expect(sqls().some((s) => s.includes('INSERT INTO event_dashboard_widgets'))).toBe(false);
  });

  it('ignores an unrecognised stored default', async () => {
    stubClient('rave');
    await convertItemToEvent('g1', 'i1', 'u1', eventData as any);
    const insert = mockClient.query.mock.calls.find((c: any[]) => c[0].includes('INSERT INTO event_proposals'));
    expect(insert[1][6]).toBeNull();
  });

  it('rolls back when a preset step fails', async () => {
    stubClient('dinner', { failChecklist: true });
    const result = await convertItemToEvent('g1', 'i1', 'u1', eventData as any);
    expect(result.success).toBe(false);
    expect(sqls()).toContain('ROLLBACK');
    expect(sqls()).not.toContain('COMMIT');
  });
});
