import {
  getCommentableItemInEvent,
  getItemComments,
  addItemComment,
  getItemCommentById,
} from '@/lib/db/queries';
import * as db from '@/lib/db/client';

jest.mock('@/lib/db/client');

const query = db.query as jest.Mock;
const queryOne = db.queryOne as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getCommentableItemInEvent', () => {
  it.each([
    ['checklist', 'event_checklist_items'],
    ['logistics', 'event_logistics_items'],
    ['timeline', 'event_timeline_items'],
  ] as const)('looks up %s items in %s from the fixed map', async (type, table) => {
    queryOne.mockResolvedValue({ id: 'i1' });
    const res = await getCommentableItemInEvent(type, 'i1', 'e1', 'g1');
    expect(res).toEqual({ id: 'i1' });
    expect(queryOne.mock.calls[0][0]).toContain(`FROM ${table} WHERE id = $1 AND event_id = $2 AND group_id = $3`);
    expect(queryOne.mock.calls[0][1]).toEqual(['i1', 'e1', 'g1']);
  });

  it('returns null when the item is not in the event/group', async () => {
    queryOne.mockResolvedValue(null);
    expect(await getCommentableItemInEvent('checklist', 'i1', 'e1', 'g1')).toBeNull();
  });

  it('rejects unsupported and unregistered types before any query', async () => {
    await expect(getCommentableItemInEvent('events; DROP TABLE x' as any, 'i', 'e', 'g')).rejects.toThrow(
      /Unsupported/
    );
    await expect(getCommentableItemInEvent('poll', 'i', 'e', 'g')).rejects.toThrow(/Unsupported/);
    expect(queryOne).not.toHaveBeenCalled();
  });
});

describe('item comment queries', () => {
  it('getItemComments filters by item_type + item_id and nests the creator', async () => {
    query.mockResolvedValue([
      {
        id: 'c1',
        content: 'hi',
        created_by: 'u1',
        created_at: 't',
        edited_at: null,
        updated_count: 0,
        display_name: 'A',
        email: 'a@x.com',
        avatar_url: null,
      },
    ]);
    const { comments, totalCount } = await getItemComments('logistics', 'i1');
    expect(totalCount).toBe(1);
    expect(comments[0].creator).toEqual({ display_name: 'A', email: 'a@x.com', avatar_url: null });
    expect(query.mock.calls[0][0]).toContain('FROM item_comments');
    expect(query.mock.calls[0][1]).toEqual(['logistics', 'i1']);
  });

  it('getItemComments rejects an unknown type without querying', async () => {
    await expect(getItemComments('bogus' as any, 'i1')).rejects.toThrow(/Unsupported/);
    expect(query).not.toHaveBeenCalled();
  });

  it('addItemComment inserts type, item, event and group', async () => {
    queryOne
      .mockResolvedValueOnce({ id: 'c1', content: 'hi', created_by: 'u1', created_at: 't', edited_at: null, updated_count: 0 })
      .mockResolvedValueOnce({ display_name: 'A', email: null, avatar_url: null });
    const c = await addItemComment('checklist', 'i1', 'e1', 'g1', 'u1', 'hi');
    expect(c.creator.display_name).toBe('A');
    expect(queryOne.mock.calls[0][0]).toContain('INSERT INTO item_comments');
    expect(queryOne.mock.calls[0][1]).toEqual(['checklist', 'i1', 'e1', 'g1', 'u1', 'hi']);
  });

  it('getItemCommentById selects type and item so routes can verify the URL', async () => {
    queryOne.mockResolvedValue(null);
    await getItemCommentById('c1');
    expect(queryOne.mock.calls[0][0]).toContain('item_type, item_id');
    expect(queryOne.mock.calls[0][0]).toContain('deleted_at IS NULL');
  });
});
