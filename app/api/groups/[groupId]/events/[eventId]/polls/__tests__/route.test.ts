/**
 * @jest-environment node
 */
import { GET, POST } from '../route';
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

const params = Promise.resolve({ groupId: 'group-1', eventId: 'event-1' });

describe('GET /api/groups/:groupId/events/:eventId/polls', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await GET(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it('returns 200 with polls on success', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (pollService.getPolls as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ id: 'poll-1', question: 'Q?', options: [], total_votes: 0, user_vote: null }],
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('returns 403 for a non-member', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (pollService.getPolls as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Not a member',
      errorCode: 'FORBIDDEN',
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(403);
  });

  it('returns 404 when the event does not exist', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (pollService.getPolls as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Event not found',
      errorCode: 'NOT_FOUND',
    });

    const res = await GET(makeRequest({ authHeader: 'Bearer good-token' }), { params });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/groups/:groupId/events/:eventId/polls', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without an authorization header', async () => {
    const res = await POST(makeRequest({ body: { question: 'Q?', options: ['A', 'B'] } }), { params });
    expect(res.status).toBe(401);
  });

  it('returns 400 when question is missing', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { options: ['A', 'B'] } }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when fewer than 2 options are provided', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { question: 'Q?', options: ['A'] } }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 on successful creation', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (pollService.createPoll as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'poll-1', question: 'Q?', options: [] },
      message: 'Poll created',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { question: 'Q?', options: ['A', 'B'] } }),
      { params }
    );
    expect(res.status).toBe(201);
    expect(pollService.createPoll).toHaveBeenCalledWith('event-1', 'group-1', 'user-1', 'Q?', ['A', 'B']);
  });

  it('returns 400 when the service reports VALIDATION_ERROR', async () => {
    (jwt.getSubFromJWT as jest.Mock).mockReturnValue('user-1');
    (pollService.createPoll as jest.Mock).mockResolvedValue({
      success: false,
      error: 'A poll requires at least 2 non-empty options',
      errorCode: 'VALIDATION_ERROR',
    });

    const res = await POST(
      makeRequest({ authHeader: 'Bearer good-token', body: { question: 'Q?', options: ['A', '  '] } }),
      { params }
    );
    expect(res.status).toBe(400);
  });
});
