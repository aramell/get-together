/**
 * @jest-environment node
 */
import { DELETE } from '../route';
import * as photoService from '@/lib/services/eventPhotoService';
import * as jwt from '@/lib/auth/jwt';

jest.mock('@/lib/services/eventPhotoService');
jest.mock('@/lib/auth/jwt');

function makeRequest(authHeader?: string) {
  return {
    headers: { get: (name: string) => (name === 'authorization' ? authHeader ?? null : null) },
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1', photoId: 'photo-1' });

describe('DELETE /api/groups/:groupId/events/:eventId/photos/:photoId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful delete', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('uploader-1');
    (photoService.deleteEventPhoto as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Photo deleted',
    });

    const res = await DELETE(makeRequest('Bearer good-token'), { params });
    expect(res.status).toBe(200);
  });

  it('returns 403 for a non-uploader, non-admin', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('random-member');
    (photoService.deleteEventPhoto as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Only the uploader or a group admin can delete this photo',
      errorCode: 'FORBIDDEN',
    });

    const res = await DELETE(makeRequest('Bearer good-token'), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 for a nonexistent photo', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (photoService.deleteEventPhoto as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Photo not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await DELETE(makeRequest('Bearer good-token'), { params });
    expect(res.status).toBe(404);
  });
});
