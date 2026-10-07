import {
  listEventNotes,
  listPublicEventNotes,
  addEventNote,
  updateEventNote,
  deleteEventNote,
} from '@/lib/services/eventNotesService';
import { isValidNoteUrl } from '@/lib/services/noteUrlValidation';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');

describe('isValidNoteUrl', () => {
  it('accepts http and https only', () => {
    expect(isValidNoteUrl('https://example.com/a?b=1')).toBe(true);
    expect(isValidNoteUrl('http://example.com')).toBe(true);
    expect(isValidNoteUrl('javascript:alert(1)')).toBe(false);
    expect(isValidNoteUrl('data:text/html,hi')).toBe(false);
    expect(isValidNoteUrl('ftp://example.com')).toBe(false);
    expect(isValidNoteUrl('not a url')).toBe(false);
    expect(isValidNoteUrl('https://')).toBe(false);
    expect(isValidNoteUrl('https://user:pw@example.com')).toBe(false);
    expect(isValidNoteUrl('https://user@example.com')).toBe(false);
  });
});

describe('eventNotesService', () => {
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    client = { query: jest.fn(), release: jest.fn() };
    (getClient as jest.Mock).mockResolvedValue(client);
  });

  const eventFound = () => client.query.mockResolvedValueOnce({ rows: [{ id: 'e1' }] });

  describe('addEventNote', () => {
    it('rejects an empty or over-long title with VALIDATION_ERROR', async () => {
      expect((await addEventNote('e1', 'g1', 'u1', { title: '  ' })).errorCode).toBe('VALIDATION_ERROR');
      expect((await addEventNote('e1', 'g1', 'u1', { title: 'x'.repeat(256) })).errorCode).toBe('VALIDATION_ERROR');
      expect(client.query).not.toHaveBeenCalled();
    });

    it('rejects javascript: and malformed URLs', async () => {
      const a = await addEventNote('e1', 'g1', 'u1', { title: 'T', url: 'javascript:alert(1)' });
      const b = await addEventNote('e1', 'g1', 'u1', { title: 'T', url: 'nope' });
      expect(a.errorCode).toBe('VALIDATION_ERROR');
      expect(a.error).toBe('INVALID_URL');
      expect(b.errorCode).toBe('VALIDATION_ERROR');
    });

    it('returns FORBIDDEN for a non-member', async () => {
      eventFound();
      (getUserGroupRole as jest.Mock).mockResolvedValue(null);
      const r = await addEventNote('e1', 'g1', 'u1', { title: 'T' });
      expect(r.errorCode).toBe('FORBIDDEN');
    });

    it('returns NOT_FOUND when the event is not in the group', async () => {
      client.query.mockResolvedValueOnce({ rows: [] });
      expect((await addEventNote('e1', 'g1', 'u1', { title: 'T' })).errorCode).toBe('NOT_FOUND');
    });

    it('inserts a trimmed entry for a member', async () => {
      eventFound();
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      client.query.mockResolvedValueOnce({ rows: [{ id: 'n1' }] });
      const r = await addEventNote('e1', 'g1', 'u1', { title: ' Venue ', url: ' https://x.com ', body: '' });
      expect(r.success).toBe(true);
      expect(client.query.mock.calls[1][1]).toEqual(['e1', 'g1', 'u1', 'Venue', 'https://x.com', null]);
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('listEventNotes', () => {
    it('is members only and orders oldest first', async () => {
      eventFound();
      (getUserGroupRole as jest.Mock).mockResolvedValue(null);
      expect((await listEventNotes('e1', 'g1', 'u1')).errorCode).toBe('FORBIDDEN');

      eventFound();
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      client.query.mockResolvedValueOnce({ rows: [{ id: 'n1' }] });
      const r = await listEventNotes('e1', 'g1', 'u1');
      expect(r.data).toEqual([{ id: 'n1' }]);
      expect(String(client.query.mock.calls[2][0])).toContain('ORDER BY created_at ASC');
    });
  });

  describe('listPublicEventNotes', () => {
    it('never selects group_id or created_by, and orders deterministically', async () => {
      client.query.mockResolvedValueOnce({ rows: [] });
      await listPublicEventNotes('e1');
      const sql = String(client.query.mock.calls[0][0]);
      expect(sql).not.toContain('group_id');
      expect(sql).not.toContain('created_by');
      expect(sql).toContain('ORDER BY created_at ASC, id ASC');
    });
  });

  describe('updateEventNote / deleteEventNote', () => {
    it('lets the author update', async () => {
      client.query.mockResolvedValueOnce({ rows: [{ created_by: 'u1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      client.query.mockResolvedValueOnce({ rows: [{ id: 'n1', title: 'New' }] });
      const r = await updateEventNote('e1', 'g1', 'n1', 'u1', { title: 'New', url: null });
      expect(r.success).toBe(true);
    });

    it('lets an admin update or delete another member\'s note', async () => {
      client.query.mockResolvedValue({ rows: [{ created_by: 'u2', id: 'n1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      expect((await updateEventNote('e1', 'g1', 'n1', 'u1', { title: 'X' })).success).toBe(true);
      expect((await deleteEventNote('e1', 'g1', 'n1', 'u1')).success).toBe(true);
    });

    it('returns FORBIDDEN for another member', async () => {
      client.query.mockResolvedValue({ rows: [{ created_by: 'u2' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      expect((await updateEventNote('e1', 'g1', 'n1', 'u1', { title: 'X' })).errorCode).toBe('FORBIDDEN');
      expect((await deleteEventNote('e1', 'g1', 'n1', 'u1')).errorCode).toBe('FORBIDDEN');
    });

    it('looks the note up by [noteId, eventId, groupId]; zero rows is NOT_FOUND with no write', async () => {
      client.query.mockResolvedValue({ rows: [] });
      const u = await updateEventNote('e1', 'g1', 'n1', 'u1', { title: 'X' });
      const d = await deleteEventNote('e1', 'g1', 'n1', 'u1');
      expect(u.errorCode).toBe('NOT_FOUND');
      expect(d.errorCode).toBe('NOT_FOUND');
      expect(client.query).toHaveBeenCalledTimes(2);
      for (const [sql, params] of client.query.mock.calls) {
        expect(params).toEqual(['n1', 'e1', 'g1']);
        expect(String(sql)).toContain('event_id');
        expect(String(sql)).toContain('group_id');
      }
    });

    it('builds the UPDATE from provided fields only', async () => {
      client.query.mockResolvedValueOnce({ rows: [{ created_by: 'u1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      client.query.mockResolvedValueOnce({ rows: [{ id: 'n1' }] });
      await updateEventNote('e1', 'g1', 'n1', 'u1', { title: 'New', url: null });
      const [sql, params] = client.query.mock.calls[1];
      expect(String(sql)).toContain('SET updated_at = NOW(), title = $1, url = $2 WHERE id = $3');
      expect(String(sql)).not.toContain('body =');
      expect(params).toEqual(['New', null, 'n1']);
    });

    it('returns NOTE_NOT_FOUND when the row vanishes before UPDATE or DELETE', async () => {
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      client.query.mockResolvedValueOnce({ rows: [{ created_by: 'u1' }] }).mockResolvedValueOnce({ rows: [] });
      const u = await updateEventNote('e1', 'g1', 'n1', 'u1', { title: 'X' });
      expect(u.success).toBe(false);
      expect(u.error).toBe('NOTE_NOT_FOUND');
      client.query.mockResolvedValueOnce({ rows: [{ created_by: 'u1' }] }).mockResolvedValueOnce({ rows: [] });
      const d = await deleteEventNote('e1', 'g1', 'n1', 'u1');
      expect(d.success).toBe(false);
      expect(d.errorCode).toBe('NOT_FOUND');
    });

    it('rejects a bad URL on update and NOT_FOUND for a missing note', async () => {
      client.query.mockResolvedValueOnce({ rows: [{ created_by: 'u1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValue('member');
      expect((await updateEventNote('e1', 'g1', 'n1', 'u1', { url: 'javascript:1' })).errorCode).toBe('VALIDATION_ERROR');

      client.query.mockResolvedValueOnce({ rows: [] });
      expect((await deleteEventNote('e1', 'g1', 'nx', 'u1')).errorCode).toBe('NOT_FOUND');
    });
  });
});
