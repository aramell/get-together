/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
import * as photoService from '@/lib/services/eventPhotoService';
import * as authLib from '@/lib/api/auth';

jest.mock('@/lib/services/eventPhotoService');
jest.mock('@/lib/api/auth');

function makeGetRequest(authHeader?: string) {
  return {
    headers: { get: (name: string) => (name === 'authorization' ? authHeader ?? null : null) },
  } as any;
}

function makePostRequest(options: { authHeader?: string; formData?: FormData } = {}) {
  return {
    headers: { get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null) },
    formData: async () => options.formData ?? new FormData(),
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1' });

describe('GET /api/groups/:groupId/events/:eventId/photos', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 with photos on success', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (photoService.getEventPhotos as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ id: 'photo-1', url: 'https://example.com/photo.jpg' }],
    });

    const res = await GET(makeGetRequest('Bearer good-token'), { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('returns 403 when the service reports FORBIDDEN', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (photoService.getEventPhotos as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Not a member',
      errorCode: 'FORBIDDEN',
    });

    const res = await GET(makeGetRequest('Bearer good-token'), { params });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/groups/:groupId/events/:eventId/photos', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no file is provided', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    const res = await POST(makePostRequest({ authHeader: 'Bearer good-token', formData: new FormData() }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 201 with the created photo on success', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (photoService.addEventPhoto as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Photo uploaded',
      data: { id: 'photo-1', url: 'https://example.com/photo.jpg' },
    });

    const file = new File([Buffer.from('fake-image')], 'photo.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.set('file', file);

    const res = await POST(makePostRequest({ authHeader: 'Bearer good-token', formData }), { params });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('photo-1');
  });

  it('returns 400 when the service reports VALIDATION_ERROR (bad type/size)', async () => {
    (authLib.getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (photoService.addEventPhoto as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Please upload a JPEG, PNG, or WebP image',
      errorCode: 'VALIDATION_ERROR',
    });

    const file = new File([Buffer.from('fake')], 'x.gif', { type: 'image/gif' });
    const formData = new FormData();
    formData.set('file', file);

    const res = await POST(makePostRequest({ authHeader: 'Bearer good-token', formData }), { params });
    expect(res.status).toBe(400);
  });
});
