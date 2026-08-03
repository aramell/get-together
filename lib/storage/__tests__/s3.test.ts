import { S3Client } from '@aws-sdk/client-s3';
import { uploadEventPhoto, deleteEventPhoto, getEventPhotoPublicUrl, buildEventPhotoKey } from '../s3';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  PutObjectCommand: jest.fn((input) => ({ __type: 'PutObjectCommand', input })),
  DeleteObjectCommand: jest.fn((input) => ({ __type: 'DeleteObjectCommand', input })),
}));

function getSendMock() {
  return (S3Client as unknown as jest.Mock).mock.results[0].value.send as jest.Mock;
}

describe('lib/storage/s3', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    getSendMock().mockClear();
    process.env = { ...OLD_ENV, AWS_S3_EVENT_PHOTOS_BUCKET: 'test-bucket', NEXT_PUBLIC_AWS_REGION: 'us-east-1' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('uploadEventPhoto calls S3 PutObjectCommand with the right bucket/key/body', async () => {
    const buffer = Buffer.from('fake-image-data');

    await uploadEventPhoto(buffer, 'event-photos/event-1/123-photo.jpg', 'image/jpeg');

    expect(getSendMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        __type: 'PutObjectCommand',
        input: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'event-photos/event-1/123-photo.jpg',
          Body: buffer,
          ContentType: 'image/jpeg',
        }),
      })
    );
  });

  it('deleteEventPhoto calls S3 DeleteObjectCommand with the right bucket/key', async () => {
    await deleteEventPhoto('event-photos/event-1/123-photo.jpg');

    expect(getSendMock()).toHaveBeenCalledWith(
      expect.objectContaining({
        __type: 'DeleteObjectCommand',
        input: expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'event-photos/event-1/123-photo.jpg',
        }),
      })
    );
  });

  it('uploadEventPhoto throws when the bucket env var is not configured', async () => {
    delete process.env.AWS_S3_EVENT_PHOTOS_BUCKET;

    await expect(uploadEventPhoto(Buffer.from('x'), 'key', 'image/jpeg')).rejects.toThrow(
      'AWS_S3_EVENT_PHOTOS_BUCKET is not configured'
    );
  });

  it('getEventPhotoPublicUrl builds the expected public S3 URL', () => {
    expect(getEventPhotoPublicUrl('event-photos/event-1/123-photo.jpg')).toBe(
      'https://test-bucket.s3.us-east-1.amazonaws.com/event-photos/event-1/123-photo.jpg'
    );
  });

  it('buildEventPhotoKey sanitizes the filename and namespaces by eventId', () => {
    const key = buildEventPhotoKey('event-1', 'My Photo! (final).JPG');

    expect(key).toMatch(/^event-photos\/event-1\/\d+-my-photo---final-\.jpg$/);
  });
});
