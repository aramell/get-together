/**
 * @jest-environment node
 */
import { DELETE } from '../route';
import * as pollService from '@/lib/services/eventPollService';
import * as jwt from '@/lib/auth/jwt';

jest.mock('@/lib/services/eventPollService');
jest.mock('@/lib/auth/jwt');

function makeRequest(options: { authHeader?: string } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1', pollId: 'poll-1' });

describe('DELETE /api/groups/:groupId/events/:eventId/polls/:pollId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful delete', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('creator-1');
    (pollService.deletePoll as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Poll deleted',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
  });

  it('returns 403 for a non-creator, non-admin', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('random-member');
    (pollService.deletePoll as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Only the creator or a group admin can delete this poll',
      errorCode: 'FORBIDDEN',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the poll does not exist', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (pollService.deletePoll as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Poll not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});
