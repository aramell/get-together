import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import { isValidNoteUrl } from '@/lib/services/noteUrlValidation';

export interface EventNote {
  id: string;
  event_id: string;
  group_id: string;
  created_by: string;
  title: string;
  url: string | null;
  body: string | null;
  created_at: string;
  updated_at: string;
}

// Guest-safe shape: never includes group_id.
export type PublicEventNote = Omit<EventNote, 'group_id' | 'created_by'>;

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

const COLUMNS = 'id, event_id, group_id, created_by, title, url, body, created_at, updated_at';
const MAX_BODY_LENGTH = 5000;

type Queryable = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };

async function verifyEventInGroup(client: Queryable, eventId: string, groupId: string): Promise<boolean> {
  const r = await client.query(
    'SELECT id FROM event_proposals WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL',
    [eventId, groupId]
  );
  return r.rows.length > 0;
}

function validationError(message: string, error: string): ServiceResult<never> {
  return { success: false, message, error, errorCode: 'VALIDATION_ERROR' };
}

// Returns an error result or the normalized values.
function normalizeFields(input: { title?: string; url?: string | null; body?: string | null }, partial: boolean) {
  const out: { title?: string; url?: string | null; body?: string | null } = {};

  if (input.title !== undefined || !partial) {
    const title = input.title;
    if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 255) {
      return { error: validationError('Title must be between 1 and 255 characters', 'INVALID_TITLE') };
    }
    out.title = title.trim();
  }

  if (input.url !== undefined) {
    if (input.url === null || (typeof input.url === 'string' && input.url.trim() === '')) {
      out.url = null;
    } else if (typeof input.url !== 'string' || !isValidNoteUrl(input.url.trim())) {
      return { error: validationError('Link must be a valid http or https URL', 'INVALID_URL') };
    } else {
      out.url = input.url.trim();
    }
  }

  if (input.body !== undefined) {
    if (input.body === null || (typeof input.body === 'string' && input.body.trim() === '')) {
      out.body = null;
    } else if (typeof input.body !== 'string' || input.body.length > MAX_BODY_LENGTH) {
      return { error: validationError(`Text must be at most ${MAX_BODY_LENGTH} characters`, 'INVALID_BODY') };
    } else {
      out.body = input.body.trim();
    }
  }

  return { values: out };
}

const notFound = (message: string, error: string): ServiceResult<never> => ({
  success: false,
  message,
  error,
  errorCode: 'NOT_FOUND',
});
const forbidden = (message: string, error: string): ServiceResult<never> => ({
  success: false,
  message,
  error,
  errorCode: 'FORBIDDEN',
});
const internal = (message: string, e: any): ServiceResult<never> => ({
  success: false,
  message,
  error: e?.message,
  errorCode: 'INTERNAL_ERROR',
});

export async function listEventNotes(
  eventId: string,
  groupId: string,
  userId: string
): Promise<ServiceResult<EventNote[]>> {
  const client = await getClient();
  try {
    if (!(await verifyEventInGroup(client, eventId, groupId))) {
      return notFound('Event not found', 'EVENT_NOT_FOUND');
    }
    if (!(await getUserGroupRole(groupId, userId))) {
      return forbidden('You must be a group member to view notes', 'NOT_GROUP_MEMBER');
    }
    const result = await client.query(
      `SELECT ${COLUMNS} FROM event_notes WHERE event_id = $1 ORDER BY created_at ASC, id ASC`,
      [eventId]
    );
    return { success: true, data: result.rows };
  } catch (error: any) {
    console.error('Error listing event notes:', error);
    return internal('Failed to get notes', error);
  } finally {
    client.release();
  }
}

// Guest read: caller has already resolved eventId from a valid public token.
export async function listPublicEventNotes(eventId: string): Promise<ServiceResult<PublicEventNote[]>> {
  const client = await getClient();
  try {
    const result = await client.query(
      `SELECT id, event_id, title, url, body, created_at, updated_at
       FROM event_notes WHERE event_id = $1 ORDER BY created_at ASC, id ASC`,
      [eventId]
    );
    return { success: true, data: result.rows };
  } catch (error: any) {
    console.error('Error listing public event notes:', error);
    return internal('Failed to get notes', error);
  } finally {
    client.release();
  }
}

export async function addEventNote(
  eventId: string,
  groupId: string,
  userId: string,
  input: { title: string; url?: string | null; body?: string | null }
): Promise<ServiceResult<EventNote>> {
  const client = await getClient();
  try {
    const normalized = normalizeFields(input, false);
    if (normalized.error) return normalized.error;
    const v = normalized.values!;

    if (!(await verifyEventInGroup(client, eventId, groupId))) {
      return notFound('Event not found', 'EVENT_NOT_FOUND');
    }
    if (!(await getUserGroupRole(groupId, userId))) {
      return forbidden('You must be a group member to add notes', 'NOT_GROUP_MEMBER');
    }

    const result = await client.query(
      `INSERT INTO event_notes (event_id, group_id, created_by, title, url, body)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNS}`,
      [eventId, groupId, userId, v.title, v.url ?? null, v.body ?? null]
    );
    return { success: true, message: 'Note added', data: result.rows[0] };
  } catch (error: any) {
    console.error('Error adding event note:', error);
    return internal('Failed to add note', error);
  } finally {
    client.release();
  }
}

export async function updateEventNote(
  eventId: string,
  groupId: string,
  noteId: string,
  userId: string,
  updates: { title?: string; url?: string | null; body?: string | null }
): Promise<ServiceResult<EventNote>> {
  const client = await getClient();
  try {
    const existing = await client.query(
      'SELECT created_by FROM event_notes WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [noteId, eventId, groupId]
    );
    if (existing.rows.length === 0) return notFound('Note not found', 'NOTE_NOT_FOUND');

    const role = await getUserGroupRole(groupId, userId);
    if (!role) return forbidden('You must be a group member to update notes', 'NOT_GROUP_MEMBER');
    if (existing.rows[0].created_by !== userId && role !== 'admin') {
      return forbidden('Only the author or a group admin can edit this note', 'FORBIDDEN');
    }

    const normalized = normalizeFields(updates, true);
    if (normalized.error) return normalized.error;
    const v = normalized.values!;

    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let i = 1;
    for (const col of ['title', 'url', 'body'] as const) {
      if (v[col] !== undefined) {
        sets.push(`${col} = $${i++}`);
        params.push(v[col]);
      }
    }
    params.push(noteId);

    const result = await client.query(
      `UPDATE event_notes SET ${sets.join(', ')} WHERE id = $${i} RETURNING ${COLUMNS}`,
      params
    );
    if (result.rows.length === 0) return notFound('Note not found', 'NOTE_NOT_FOUND');
    return { success: true, message: 'Note updated', data: result.rows[0] };
  } catch (error: any) {
    console.error('Error updating event note:', error);
    return internal('Failed to update note', error);
  } finally {
    client.release();
  }
}

export async function deleteEventNote(
  eventId: string,
  groupId: string,
  noteId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const client = await getClient();
  try {
    const existing = await client.query(
      'SELECT created_by FROM event_notes WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [noteId, eventId, groupId]
    );
    if (existing.rows.length === 0) return notFound('Note not found', 'NOTE_NOT_FOUND');

    const role = await getUserGroupRole(groupId, userId);
    if (!role) return forbidden('You must be a group member to delete notes', 'NOT_GROUP_MEMBER');
    if (existing.rows[0].created_by !== userId && role !== 'admin') {
      return forbidden('Only the author or a group admin can delete this note', 'FORBIDDEN');
    }

    const deleted = await client.query('DELETE FROM event_notes WHERE id = $1 RETURNING id', [noteId]);
    if (deleted.rows.length === 0) return notFound('Note not found', 'NOTE_NOT_FOUND');
    return { success: true, message: 'Note deleted' };
  } catch (error: any) {
    console.error('Error deleting event note:', error);
    return internal('Failed to delete note', error);
  } finally {
    client.release();
  }
}
