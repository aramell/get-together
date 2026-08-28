/**
 * @jest-environment node
 */
import { POST, DELETE } from '../route';
import * as pollService from '@/lib/services/eventPollService';
import * as jwt from '@/lib/auth/jwt';

jest.mock('@/lib/services/eventPollService');
jest.mock('@/lib/auth/jwt');

function makeRequest(options: { authHeader?: string; body?: any } = {}) {
  return {
    headers: {
      get: (name: string) => (name === 'authorization' ? options.authHeader ?? null : null),
    },
    json: async () => options.body ?? {},
  } as any;
}

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1', pollId: 'poll-1' });

describe('POST /api/groups/:groupId/events/:eventId/polls/:pollId/vote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await POST(makeRequest({ body: { option_id: 'opt-1' } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when option_id is missing', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    const res = await POST(makeRequest({ authHeader: 'Bearer good-token', body: {} }), { params });
    expect(res.status).toBe(400);
  });

  it('returns 200 on a successful vote', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (pollService.castVote as jest.Mock).mockResolvedValue({
      success: true,
      data: { option_id: 'opt-1', voted_at: 'now' },
      message: 'Vote recorded',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { option_id: 'opt-1' } }),
      { params }
    );
    expect(res.status).toBe(200);
  });

  it('returns 400 when the option belongs to a different poll', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (pollService.castVote as jest.Mock).mockResolvedValue({
      success: false,
      message: 'That option does not belong to this poll',
      errorCode: 'VALIDATION_ERROR',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { option_id: 'wrong-opt' } }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the poll does not exist', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (pollService.castVote as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Poll not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { option_id: 'opt-1' } }),
      { params }
    );
    expect(res.status).toBe(404);
  });

  it('returns 403 for a non-member', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (pollService.castVote as jest.Mock).mockResolvedValue({
      success: false,
      message: 'You must be a group member to vote',
      errorCode: 'FORBIDDEN',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { option_id: 'opt-1' } }),
      { params }
    );
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/groups/:groupId/events/:eventId/polls/:pollId/vote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 on a successful unvote', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (pollService.removeVote as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Vote removed',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
  });

  it('returns 404 when the caller has no vote to remove', async () => {
    (jwt.getVerifiedSubFromJWT as jest.Mock).mockResolvedValue('user-1');
    (pollService.removeVote as jest.Mock).mockResolvedValue({
      success: false,
      message: "You haven't voted on this poll",
      errorCode: 'NOT_FOUND',
    });

    const res = await DELETE(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});
