import { addEventPhoto, getEventPhotos, deleteEventPhoto } from '@/lib/services/eventPhotoService';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import * as s3 from '@/lib/storage/s3';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');
jest.mock('@/lib/storage/s3', () => ({
  uploadEventPhoto: jest.fn(),
  deleteEventPhoto: jest.fn(),
  getEventPhotoPublicUrl: jest.fn(),
  buildEventPhotoKey: jest.fn(),
}));

describe('eventPhotoService', () => {
  let mockClient: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    (s3.buildEventPhotoKey as jest.Mock).mockReturnValue('event-photos/event-1/123-photo.jpg');
    (s3.getEventPhotoPublicUrl as jest.Mock).mockReturnValue('https://bucket.s3.us-east-1.amazonaws.com/event-photos/event-1/123-photo.jpg');
    (s3.uploadEventPhoto as jest.Mock).mockResolvedValue(undefined);
    (s3.deleteEventPhoto as jest.Mock).mockResolvedValue(undefined);
  });

  const mockEventExists = () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'event-1' }] });
  };

  describe('addEventPhoto', () => {
    const buffer = Buffer.from('fake-image-data');

    it('rejects an invalid file type before touching the DB or S3', async () => {
      const result = await addEventPhoto('event-1', 'group-1', 'user-1', buffer, 'x.gif', 'image/gif');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(s3.uploadEventPhoto).not.toHaveBeenCalled();
    });

    it('rejects a file over 5MB', async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024);
      const result = await addEventPhoto('event-1', 'group-1', 'user-1', bigBuffer, 'x.jpg', 'image/jpeg');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects when the event does not exist in the group', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      const result = await addEventPhoto('event-1', 'group-1', 'user-1', buffer, 'x.jpg', 'image/jpeg');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('rejects when the uploader is not a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);
      const result = await addEventPhoto('event-1', 'group-1', 'user-1', buffer, 'x.jpg', 'image/jpeg');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('uploads to S3 and inserts a row for a valid photo from a member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'photo-1', event_id: 'event-1', group_id: 'group-1', uploaded_by: 'user-1', s3_key: 'event-photos/event-1/123-photo.jpg', url: 'https://...', caption: null, created_at: 'now' }],
      });

      const result = await addEventPhoto('event-1', 'group-1', 'user-1', buffer, 'photo.jpg', 'image/jpeg');

      expect(result.success).toBe(true);
      expect(s3.uploadEventPhoto).toHaveBeenCalledWith(buffer, 'event-photos/event-1/123-photo.jpg', 'image/jpeg');
      expect(result.data?.uploaded_by).toBe('user-1');
    });
  });

  describe('getEventPhotos', () => {
    it('returns photos for a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'photo-1' }] });

      const result = await getEventPhotos('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('rejects a non-member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await getEventPhotos('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('deleteEventPhoto', () => {
    it('allows the uploader to delete, and deletes the S3 object', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ uploaded_by: 'user-1', s3_key: 'event-photos/event-1/123-photo.jpg' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // DELETE

      const result = await deleteEventPhoto('event-1', 'group-1', 'photo-1', 'user-1');

      expect(result.success).toBe(true);
      expect(s3.deleteEventPhoto).toHaveBeenCalledWith('event-photos/event-1/123-photo.jpg');
    });

    it('allows an admin to delete a photo they did not upload', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ uploaded_by: 'other-user', s3_key: 'key' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteEventPhoto('event-1', 'group-1', 'photo-1', 'admin-user');

      expect(result.success).toBe(true);
    });

    it('rejects a non-uploader, non-admin', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ uploaded_by: 'other-user', s3_key: 'key' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await deleteEventPhoto('event-1', 'group-1', 'photo-1', 'random-member');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(s3.deleteEventPhoto).not.toHaveBeenCalled();
    });

    it('returns NOT_FOUND for a nonexistent photo', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteEventPhoto('event-1', 'group-1', 'missing-photo', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('still reports success if the S3 delete fails after the DB row is removed', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ uploaded_by: 'user-1', s3_key: 'key' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      (s3.deleteEventPhoto as jest.Mock).mockRejectedValueOnce(new Error('S3 unreachable'));

      const result = await deleteEventPhoto('event-1', 'group-1', 'photo-1', 'user-1');

      expect(result.success).toBe(true);
    });
  });
});
