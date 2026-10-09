/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/groups/[groupId]/events/[eventId]/timeline/[itemId]/comments/route';
import {
  PATCH,
  DELETE,
} from '@/app/api/groups/[groupId]/events/[eventId]/timeline/[itemId]/comments/[commentId]/route';
import { GET as PUBLIC_GET } from '@/app/api/events/public/[publicToken]/timeline/[itemId]/comments/route';
import * as db from '@/lib/db/client';
import * as authLib from '@/lib/api/auth';

// Mock only the DB client so the real queries.ts SQL runs and can be asserted on.
jest.mock('@/lib/db/client');
jest.mock('@/lib/api/auth');

const query = db.query as jest.Mock;
const queryOne = db.queryOne as jest.Mock;

const GROUP = '550e8400-e29b-41d4-a716-446655440001';
const EVENT = '550e8400-e29b-41d4-a716-446655440002';
const ITEM = '550e8400-e29b-41d4-a716-446655440003';
const COMMENT = '550e8400-e29b-41d4-a716-446655440004';
const params = Promise.resolve({ groupId: GROUP, eventId: EVENT, itemId: ITEM });
const cParams = Promise.resolve({ groupId: GROUP, eventId: EVENT, itemId: ITEM, commentId: COMMENT });

const req = (body?: any) => ({ headers: { get: () => null }, json: async () => body ?? {} }) as any;

/** Route queryOne by SQL fragment. */
function mockQueryOne(handlers: Record<string, any>) {
  queryOne.mockImplementation(async (sql: string) => {
    for (const [fragment, value] of Object.entries(handlers)) {
      if (sql.includes(fragment)) return typeof value === 'function' ? value() : value;
    }
    return null;
  });
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('GET timeline comments (group-scoped)', () => {
  it('returns 404 when the item is not in this event/group', async () => {
    mockQueryOne({});
    const res = await GET(req(), { params });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Timeline item not found');
  });

  it('returns comments with a nested creator object and totalCount', async () => {
    mockQueryOne({ 'FROM event_timeline_items': { id: ITEM } });
    query.mockResolvedValue([
      {
        id: COMMENT,
        content: 'Running late, save me a seat',
        created_by: 'user-1',
        created_at: '2026-10-01T00:00:00Z',
        edited_at: null,
        updated_count: 0,
        display_name: 'Alice Smith',
        email: 'a@example.com',
        avatar_url: null,
      },
    ]);

    const res = await GET(req(), { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.totalCount).toBe(1);
    expect(body.data[0].creator).toEqual({
      display_name: 'Alice Smith',
      email: 'a@example.com',
      avatar_url: null,
    });
    expect(body.data[0]).not.toHaveProperty('display_name');
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain('cc.created_by = u.id');
    expect(sql).toContain('deleted_at IS NULL');
  });
});

describe('POST timeline comments', () => {
  it('returns 401 without a valid token', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue(null);
    const res = await POST(req({ content: 'hi' }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty content', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    const res = await POST(req({ content: '   ' }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 403 for a non-member', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    mockQueryOne({});
    const res = await POST(req({ content: 'hi' }), { params });
    expect(res.status).toBe(403);
  });

  it('creates a comment and looks up the creator by users.id (not sub)', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    mockQueryOne({
      'FROM group_memberships': { id: 'm-1' },
      'FROM event_timeline_items': { id: ITEM },
      'INSERT INTO item_comments': {
        id: COMMENT,
        content: 'hi',
        created_by: 'user-1',
        created_at: '2026-10-01T00:00:00Z',
        edited_at: null,
        updated_count: 0,
      },
      'FROM users': { display_name: 'Alice', email: 'a@example.com', avatar_url: null },
    });

    const res = await POST(req({ content: 'hi' }), { params });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.creator.display_name).toBe('Alice');
    const userLookup = queryOne.mock.calls.find((c) => (c[0] as string).includes('FROM users'))!;
    expect(userLookup[0]).toContain('WHERE id = $1');
    expect(userLookup[0]).not.toContain('sub');
    expect(userLookup[1]).toEqual(['user-1']);
    const insert = queryOne.mock.calls.find((c) => (c[0] as string).includes('INSERT INTO item_comments'))!;
    // [item_type, item_id, event_id, group_id, created_by, content]
    expect(insert[1]).toEqual(['timeline', ITEM, EVENT, GROUP, 'user-1', 'hi']);
  });
});

describe('PATCH/DELETE timeline comment', () => {
  const comment = (createdBy: string) => ({
    id: COMMENT,
    item_type: 'timeline',
    item_id: ITEM,
    group_id: GROUP,
    created_by: createdBy,
  });

  it('returns 401 when unauthenticated', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue(null);
    expect((await PATCH(req({ content: 'x' }), { params: cParams })).status).toBe(401);
    expect((await DELETE(req(), { params: cParams })).status).toBe(401);
  });

  it('forbids a non-creator, non-admin member', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-2');
    mockQueryOne({ 'SELECT role': { role: 'member' }, 'FROM item_comments': comment('user-1') });
    expect((await PATCH(req({ content: 'x' }), { params: cParams })).status).toBe(403);
    expect((await DELETE(req(), { params: cParams })).status).toBe(403);
  });

  it('lets the creator edit', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    mockQueryOne({
      'SELECT role': { role: 'member' },
      'SELECT id, item_type': comment('user-1'),
      'UPDATE item_comments': { id: COMMENT, content: 'new', edited_at: 'now', updated_count: 1 },
    });
    const res = await PATCH(req({ content: 'new' }), { params: cParams });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.content).toBe('new');
    const update = queryOne.mock.calls.find((c) => (c[0] as string).includes('UPDATE item_comments'))!;
    expect(update[1]).toEqual([COMMENT, 'new']);
  });

  it('lets an admin delete another member\'s comment (soft delete)', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('admin-1');
    mockQueryOne({ 'SELECT role': { role: 'admin' }, 'SELECT id, item_type': comment('user-1') });
    query.mockResolvedValue([]);
    const res = await DELETE(req(), { params: cParams });
    expect(res.status).toBe(200);
    expect(query.mock.calls[0][0]).toContain('SET deleted_at = NOW()');
  });

  it('returns 404 for a comment on a different item', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    mockQueryOne({
      'SELECT role': { role: 'admin' },
      'SELECT id, item_type': { ...comment('user-1'), item_id: 'other-item' },
    });
    expect((await DELETE(req(), { params: cParams })).status).toBe(404);
  });

  it('returns 404 for a comment of a different item type', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    mockQueryOne({
      'SELECT role': { role: 'admin' },
      'SELECT id, item_type': { ...comment('user-1'), item_type: 'checklist' },
    });
    expect((await DELETE(req(), { params: cParams })).status).toBe(404);
  });

  it('returns 400 when editing to empty content', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    mockQueryOne({ 'SELECT role': { role: 'member' }, 'SELECT id, item_type': comment('user-1') });
    expect((await PATCH(req({ content: '  ' }), { params: cParams })).status).toBe(400);
  });
});

describe('GET public timeline comments (guest)', () => {
  const TOKEN = 'a'.repeat(40);
  const pParams = Promise.resolve({ publicToken: TOKEN, itemId: ITEM });

  it('returns 404 for a short/invalid token', async () => {
    const res = await PUBLIC_GET(req(), { params: Promise.resolve({ publicToken: 'short', itemId: ITEM }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown token', async () => {
    mockQueryOne({});
    expect((await PUBLIC_GET(req(), { params: pParams })).status).toBe(404);
  });

  it('returns 404 when the item is not in the token\'s event', async () => {
    mockQueryOne({ 'FROM event_proposals': { id: EVENT, group_id: GROUP, status: 'confirmed' } });
    query.mockResolvedValue([]);
    expect((await PUBLIC_GET(req(), { params: pParams })).status).toBe(404);
  });

  it('returns first-name-only creators and no raw created_by, without auth', async () => {
    mockQueryOne({
      'FROM event_proposals': { id: EVENT, group_id: GROUP, status: 'confirmed' },
      'FROM event_timeline_items': { id: ITEM },
    });
    query.mockImplementation(async (sql: string) => {
      return [
        {
          id: COMMENT,
          content: 'tent!',
          created_by: 'user-1',
          created_at: '2026-10-01T00:00:00Z',
          edited_at: null,
          updated_count: 0,
          display_name: 'Alice Smith',
          email: 'a@example.com',
          avatar_url: 'http://x/y.png',
        },
      ];
    });

    const res = await PUBLIC_GET(req(), { params: pParams });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(authLib.getUserIdFromBearerToken).not.toHaveBeenCalled();
    expect(body.data[0].creator).toEqual({ display_name: 'Alice' });
    expect(body.data[0]).not.toHaveProperty('created_by');
    expect(JSON.stringify(body)).not.toContain('a@example.com');
  });

  it('returns 410 for a cancelled event', async () => {
    mockQueryOne({ 'FROM event_proposals': { id: EVENT, group_id: GROUP, status: 'cancelled' } });
    expect((await PUBLIC_GET(req(), { params: pParams })).status).toBe(410);
  });
});
