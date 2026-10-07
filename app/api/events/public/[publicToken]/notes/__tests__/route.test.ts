/**
 * @jest-environment node
 */
import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db/queries', () => ({ getEventByPublicToken: jest.fn() }));
jest.mock('@/lib/services/eventNotesService', () => ({ listPublicEventNotes: jest.fn() }));

const { getEventByPublicToken } = require('@/lib/db/queries');
const { listPublicEventNotes } = require('@/lib/services/eventNotesService');

const token = 'a'.repeat(64);
const call = (t = token) => GET({} as NextRequest, { params: Promise.resolve({ publicToken: t }) });

describe('GET /api/events/public/[publicToken]/notes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404 for a short token or unknown event', async () => {
    expect((await call('short')).status).toBe(404);
    getEventByPublicToken.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });

  it('410 for a cancelled event', async () => {
    getEventByPublicToken.mockResolvedValue({ id: 'e1', group_id: 'g1', status: 'cancelled' });
    expect((await call()).status).toBe(410);
  });

  it('returns notes without group_id', async () => {
    getEventByPublicToken.mockResolvedValue({ id: 'e1', group_id: 'g1', status: 'active' });
    listPublicEventNotes.mockResolvedValue({ success: true, data: [{ id: 'n1', title: 'T', url: null }] });
    const res = await call();
    const text = JSON.stringify(await res.json());
    expect(res.status).toBe(200);
    expect(listPublicEventNotes).toHaveBeenCalledWith('e1');
    expect(text).not.toContain('group_id');
    expect(text).not.toContain('g1');
  });

  it('500 when the service fails', async () => {
    getEventByPublicToken.mockResolvedValue({ id: 'e1', group_id: 'g1', status: 'active' });
    listPublicEventNotes.mockResolvedValue({ success: false, error: 'boom' });
    expect((await call()).status).toBe(500);
  });
});
