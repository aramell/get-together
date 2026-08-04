import {
  createPoll,
  getPolls,
  castVote,
  removeVote,
  deletePoll,
} from '@/lib/services/eventPollService';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');

describe('eventPollService', () => {
  let mockClient: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  const mockEventExists = () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'event-1' }] }); // verifyEventInGroup
  };

  describe('createPoll', () => {
    it('creates a poll with 2 options', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'poll-1', event_id: 'event-1', group_id: 'group-1', created_by: 'user-1', question: 'Pizza or tacos?', created_at: 'now' }],
      }); // insert poll
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'opt-1', label: 'Pizza', display_order: 0 }] }); // insert option 1
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'opt-2', label: 'Tacos', display_order: 1 }] }); // insert option 2
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await createPoll('event-1', 'group-1', 'user-1', 'Pizza or tacos?', ['Pizza', 'Tacos']);

      expect(result.success).toBe(true);
      expect(result.data?.options).toHaveLength(2);
      expect(result.data?.total_votes).toBe(0);
      expect(result.data?.user_vote).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rejects an empty question', async () => {
      const result = await createPoll('event-1', 'group-1', 'user-1', '   ', ['A', 'B']);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects fewer than 2 non-empty options', async () => {
      const result = await createPoll('event-1', 'group-1', 'user-1', 'Q?', ['Only one']);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects options that are all whitespace', async () => {
      const result = await createPoll('event-1', 'group-1', 'user-1', 'Q?', ['A', '   ']);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects when event does not exist in group', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      const result = await createPoll('event-1', 'group-1', 'user-1', 'Q?', ['A', 'B']);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('rejects when the creator is not a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);
      const result = await createPoll('event-1', 'group-1', 'user-1', 'Q?', ['A', 'B']);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('getPolls', () => {
    it('returns polls with aggregated vote counts and the current user\'s vote', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'poll-1', event_id: 'event-1', group_id: 'group-1', created_by: 'user-1',
          question: 'Pizza or tacos?', created_at: 'now',
          options: [
            { id: 'opt-1', label: 'Pizza', display_order: 0, vote_count: 3 },
            { id: 'opt-2', label: 'Tacos', display_order: 1, vote_count: 1 },
          ],
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [{ poll_id: 'poll-1', option_id: 'opt-1' }] }); // user votes

      const result = await getPolls('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].total_votes).toBe(4);
      expect(result.data?.[0].user_vote).toBe('opt-1');
    });

    it('returns user_vote null when the user has not voted', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'poll-1', event_id: 'event-1', group_id: 'group-1', created_by: 'user-1',
          question: 'Q?', created_at: 'now',
          options: [{ id: 'opt-1', label: 'A', display_order: 0, vote_count: 0 }],
        }],
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no votes by this user

      const result = await getPolls('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data?.[0].user_vote).toBeNull();
    });

    it('skips the vote lookup query when there are no polls', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no polls

      const result = await getPolls('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      // Only 3 calls total: verifyEventInGroup, getUserGroupRole is not a client.query call, polls query.
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('rejects a non-member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await getPolls('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('castVote', () => {
    it('casts an initial vote', async () => {
      mockEventExists();
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'poll-1' }] }); // poll exists
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'opt-1' }] }); // option belongs to poll
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ option_id: 'opt-1', voted_at: 'now' }] }); // upsert

      const result = await castVote('event-1', 'group-1', 'poll-1', 'user-1', 'opt-1');

      expect(result.success).toBe(true);
      expect(result.data?.option_id).toBe('opt-1');
    });

    it('changes an existing vote (upsert)', async () => {
      mockEventExists();
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'poll-1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'opt-2' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ option_id: 'opt-2', voted_at: 'later' }] });

      const result = await castVote('event-1', 'group-1', 'poll-1', 'user-1', 'opt-2');

      expect(result.success).toBe(true);
      expect(result.data?.option_id).toBe('opt-2');
      const upsertCall = mockClient.query.mock.calls.find((c) => String(c[0]).includes('ON CONFLICT'));
      expect(upsertCall).toBeDefined();
    });

    it('rejects a vote for an option belonging to a different poll', async () => {
      mockEventExists();
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'poll-1' }] }); // poll exists
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // option does NOT belong to this poll

      const result = await castVote('event-1', 'group-1', 'poll-1', 'user-1', 'opt-from-other-poll');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('returns NOT_FOUND for a nonexistent poll', async () => {
      mockEventExists();
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await castVote('event-1', 'group-1', 'missing-poll', 'user-1', 'opt-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('rejects a non-member', async () => {
      mockEventExists();
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'poll-1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'opt-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await castVote('event-1', 'group-1', 'poll-1', 'user-1', 'opt-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('removeVote', () => {
    it('removes the caller\'s own vote', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'poll-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await removeVote('event-1', 'group-1', 'poll-1', 'user-1');

      expect(result.success).toBe(true);
    });

    it('returns NOT_FOUND when the caller had no vote', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'poll-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await removeVote('event-1', 'group-1', 'poll-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('returns NOT_FOUND for a nonexistent poll', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await removeVote('event-1', 'group-1', 'missing-poll', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('deletePoll', () => {
    it('allows the creator to delete', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deletePoll('event-1', 'group-1', 'poll-1', 'creator-1');

      expect(result.success).toBe(true);
    });

    it('allows an admin to delete even if not the creator', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deletePoll('event-1', 'group-1', 'poll-1', 'admin-user');

      expect(result.success).toBe(true);
    });

    it('rejects a non-creator, non-admin', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await deletePoll('event-1', 'group-1', 'poll-1', 'random-member');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('returns NOT_FOUND for a nonexistent poll', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deletePoll('event-1', 'group-1', 'missing-poll', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });
});
