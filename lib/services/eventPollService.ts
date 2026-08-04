import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

export interface PollOption {
  id: string;
  label: string;
  display_order: number;
  vote_count: number;
}

export interface Poll {
  id: string;
  event_id: string;
  group_id: string;
  created_by: string;
  question: string;
  created_at: string;
  options: PollOption[];
  total_votes: number;
  user_vote: string | null;
}

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

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

function mapRow(row: any, userVote: string | null): Poll {
  const options: PollOption[] = (row.options || []).map((o: any) => ({
    id: o.id,
    label: o.label,
    display_order: o.display_order,
    vote_count: o.vote_count,
  }));
  return {
    id: row.id,
    event_id: row.event_id,
    group_id: row.group_id,
    created_by: row.created_by,
    question: row.question,
    created_at: row.created_at,
    options,
    total_votes: options.reduce((sum, o) => sum + o.vote_count, 0),
    user_vote: userVote,
  };
}

export async function createPoll(
  eventId: string,
  groupId: string,
  userId: string,
  question: string,
  options: string[]
): Promise<ServiceResult<Poll>> {
  const client = await getClient();

  try {
    if (!question || question.trim().length === 0 || question.length > 255) {
      return {
        success: false,
        message: 'Question must be between 1 and 255 characters',
        error: 'INVALID_QUESTION',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const trimmedOptions = (options || [])
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter((o) => o.length > 0);

    if (trimmedOptions.length < 2) {
      return {
        success: false,
        message: 'A poll requires at least 2 non-empty options',
        error: 'INSUFFICIENT_OPTIONS',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (trimmedOptions.some((o) => o.length > 255)) {
      return {
        success: false,
        message: 'Each option must be 255 characters or less',
        error: 'INVALID_OPTION',
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
        message: 'You must be a group member to create a poll',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    await client.query('BEGIN');

    try {
      const pollResult = await client.query(
        `INSERT INTO event_polls (event_id, group_id, created_by, question)
         VALUES ($1, $2, $3, $4)
         RETURNING id, event_id, group_id, created_by, question, created_at`,
        [eventId, groupId, userId, question.trim()]
      );
      const poll = pollResult.rows[0];

      const insertedOptions: PollOption[] = [];
      for (let i = 0; i < trimmedOptions.length; i++) {
        const optionResult = await client.query(
          `INSERT INTO event_poll_options (poll_id, label, display_order)
           VALUES ($1, $2, $3)
           RETURNING id, label, display_order`,
          [poll.id, trimmedOptions[i], i]
        );
        insertedOptions.push({ ...optionResult.rows[0], vote_count: 0 });
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Poll created',
        data: mapRow({ ...poll, options: insertedOptions }, null),
      };
    } catch (txError: any) {
      await client.query('ROLLBACK');
      throw txError;
    }
  } catch (error: any) {
    console.error('Error creating poll:', error);
    return {
      success: false,
      message: 'Failed to create poll',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function getPolls(
  eventId: string,
  groupId: string,
  userId: string
): Promise<ServiceResult<Poll[]>> {
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
        message: 'You must be a group member to view polls',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const pollsResult = await client.query(
      `SELECT
         p.id, p.event_id, p.group_id, p.created_by, p.question, p.created_at,
         json_agg(
           json_build_object(
             'id', o.id,
             'label', o.label,
             'display_order', o.display_order,
             'vote_count', COALESCE(vc.count, 0)
           ) ORDER BY o.display_order ASC
         ) AS options
       FROM event_polls p
       JOIN event_poll_options o ON o.poll_id = p.id
       LEFT JOIN (
         SELECT option_id, COUNT(*) AS count FROM event_poll_votes GROUP BY option_id
       ) vc ON vc.option_id = o.id
       WHERE p.event_id = $1
       GROUP BY p.id
       ORDER BY p.created_at ASC`,
      [eventId]
    );

    const pollIds = pollsResult.rows.map((r: any) => r.id);
    let userVotesByPoll: Record<string, string> = {};

    if (pollIds.length > 0) {
      const votesResult = await client.query(
        `SELECT poll_id, option_id FROM event_poll_votes WHERE poll_id = ANY($1) AND user_id = $2`,
        [pollIds, userId]
      );
      userVotesByPoll = votesResult.rows.reduce((acc: Record<string, string>, row: any) => {
        acc[row.poll_id] = row.option_id;
        return acc;
      }, {});
    }

    return {
      success: true,
      data: pollsResult.rows.map((row: any) => mapRow(row, userVotesByPoll[row.id] || null)),
    };
  } catch (error: any) {
    console.error('Error getting polls:', error);
    return {
      success: false,
      message: 'Failed to get polls',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function castVote(
  eventId: string,
  groupId: string,
  pollId: string,
  userId: string,
  optionId: string
): Promise<ServiceResult<{ option_id: string; voted_at: string }>> {
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

    const pollResult = await client.query(
      'SELECT id FROM event_polls WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [pollId, eventId, groupId]
    );
    if (pollResult.rows.length === 0) {
      return {
        success: false,
        message: 'Poll not found',
        error: 'POLL_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const optionResult = await client.query(
      'SELECT id FROM event_poll_options WHERE id = $1 AND poll_id = $2',
      [optionId, pollId]
    );
    if (optionResult.rows.length === 0) {
      return {
        success: false,
        message: 'That option does not belong to this poll',
        error: 'INVALID_OPTION',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to vote',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const upsertResult = await client.query(
      `INSERT INTO event_poll_votes (poll_id, option_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = EXCLUDED.option_id, voted_at = NOW()
       RETURNING option_id, voted_at`,
      [pollId, optionId, userId]
    );

    return {
      success: true,
      message: 'Vote recorded',
      data: upsertResult.rows[0],
    };
  } catch (error: any) {
    console.error('Error casting vote:', error);
    return {
      success: false,
      message: 'Failed to cast vote',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function removeVote(
  eventId: string,
  groupId: string,
  pollId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const client = await getClient();

  try {
    const pollResult = await client.query(
      'SELECT id FROM event_polls WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [pollId, eventId, groupId]
    );
    if (pollResult.rows.length === 0) {
      return {
        success: false,
        message: 'Poll not found',
        error: 'POLL_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to remove your vote',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const deleteResult = await client.query(
      'DELETE FROM event_poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, userId]
    );

    if (deleteResult.rowCount === 0) {
      return {
        success: false,
        message: "You haven't voted on this poll",
        error: 'VOTE_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    return {
      success: true,
      message: 'Vote removed',
    };
  } catch (error: any) {
    console.error('Error removing vote:', error);
    return {
      success: false,
      message: 'Failed to remove vote',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function deletePoll(
  eventId: string,
  groupId: string,
  pollId: string,
  userId: string
): Promise<ServiceResult<null>> {
  const client = await getClient();

  try {
    const pollResult = await client.query(
      'SELECT created_by FROM event_polls WHERE id = $1 AND event_id = $2 AND group_id = $3',
      [pollId, eventId, groupId]
    );

    if (pollResult.rows.length === 0) {
      return {
        success: false,
        message: 'Poll not found',
        error: 'POLL_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to delete a poll',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    const isCreator = pollResult.rows[0].created_by === userId;
    const isAdmin = userRole === 'admin';
    if (!isCreator && !isAdmin) {
      return {
        success: false,
        message: 'Only the creator or a group admin can delete this poll',
        error: 'FORBIDDEN',
        errorCode: 'FORBIDDEN',
      };
    }

    // ON DELETE CASCADE on event_poll_options.poll_id and event_poll_votes.poll_id
    // handles option/vote cleanup.
    await client.query('DELETE FROM event_polls WHERE id = $1', [pollId]);

    return {
      success: true,
      message: 'Poll deleted',
    };
  } catch (error: any) {
    console.error('Error deleting poll:', error);
    return {
      success: false,
      message: 'Failed to delete poll',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}
