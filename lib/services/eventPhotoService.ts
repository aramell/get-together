import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import { uploadEventPhoto as s3Upload, deleteEventPhoto as s3Delete, getEventPhotoPublicUrl, buildEventPhotoKey } from '@/lib/storage/s3';

export interface EventPhoto {
  id: string;
  event_id: string;
  group_id: string;
  uploaded_by: string;
  s3_key: string;
  url: string;
  caption: string | null;
  created_at: string;
}

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function verifyEventInGroup(
  client: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  eventId: string,
  groupId: string
): Promise<boolean> {
  const eventResult = await client.query(
    'SELECT id FROM event_proposals WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL',
    [eventId, groupId]
  );
  return eventResult.rows.length > 0;
}

export async function addEventPhoto(
  eventId: string,
  groupId: string,
  userId: string,
  buffer: Buffer,
  filename: string,
  contentType: string,
  caption?: string | null
): Promise<ServiceResult<EventPhoto>> {
  const client = await getClient();

  try {
    if (!ALLOWED_TYPES.includes(contentType)) {
      return {
        success: false,
        message: 'Please upload a JPEG, PNG, or WebP image',
        error: 'INVALID_FILE_TYPE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (buffer.byteLength > MAX_SIZE) {
      return {
        success: false,
        message: 'Photo must be less than 5MB',
        error: 'FILE_TOO_LARGE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!(await verifyEventInGroup(client, eventId, groupId))) {
      return {
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to upload photos',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const s3Key = buildEventPhotoKey(eventId, filename);

    await s3Upload(buffer, s3Key, contentType);

    const url = getEventPhotoPublicUrl(s3Key);

    const insertResult = await client.query(
      `INSERT INTO event_photos (event_id, group_id, uploaded_by, s3_key, url, caption)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, event_id, group_id, uploaded_by, s3_key, url, caption, created_at`,
      [eventId, groupId, userId, s3Key, url, caption || null]
    );

    return {
      success: true,
      message: 'Photo uploaded',
      data: insertResult.rows[0],
    };
  } catch (error: any) {
    console.error('Error adding event photo:', error);
    return {
      success: false,
      message: 'Failed to upload photo',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function getEventPhotos(
  eventId: string,
  groupId: string,
  userId: string
): Promise<ServiceResult<EventPhoto[]>> {
  const client = await getClient();

  try {
    if (!(await verifyEventInGroup(client, eventId, groupId))) {
      return {
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to view photos',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const result = await client.query(
      `SELECT id, event_id, group_id, uploaded_by, s3_key, url, caption, created_at
       FROM event_photos
       WHERE event_id = $1
       ORDER BY created_at ASC`,
      [eventId]
    );

    return {
      success: true,
      data: result.rows,
    };
  } catch (error: any) {
    console.error('Error getting event photos:', error);
    return {
      success: false,
      message: 'Failed to get photos',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function deleteEventPhoto(
  eventId: string,
  groupId: string,
  photoId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const client = await getClient();

  try {
    const photoResult = await client.query(
      'SELECT uploaded_by, s3_key FROM event_photos WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [photoId, eventId, groupId]
    );

    if (photoResult.rows.length === 0) {
      return {
        success: false,
        message: 'Photo not found',
        error: 'PHOTO_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const photo = photoResult.rows[0];

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to delete photos',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const isUploader = photo.uploaded_by === userId;
    const isAdmin = userRole === 'admin';
    if (!isUploader && !isAdmin) {
      return {
        success: false,
        message: 'Only the uploader or a group admin can delete this photo',
        error: 'FORBIDDEN',
        errorCode: 'FORBIDDEN',
      };
    }

    // Delete the DB row first — an orphaned S3 object (wasted storage, no
    // longer referenced by any row) is a more benign failure mode than an
    // orphaned DB row pointing at a deleted S3 object (a broken image in
    // the UI). If the S3 delete below fails, log it but don't roll back
    // the DB delete for it.
    await client.query('DELETE FROM event_photos WHERE id = $1', [photoId]);

    try {
      await s3Delete(photo.s3_key);
    } catch (s3Error) {
      console.error('Deleted event_photos row but failed to delete S3 object:', photo.s3_key, s3Error);
    }

    return {
      success: true,
      message: 'Photo deleted',
    };
  } catch (error: any) {
    console.error('Error deleting event photo:', error);
    return {
      success: false,
      message: 'Failed to delete photo',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}
