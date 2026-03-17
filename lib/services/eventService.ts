import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import { eventCreateSchema, EventProposal, RsvpStatus } from '@/lib/validation/eventSchema';

/**
 * Create an event proposal in a group
 * Automatically marks the creator as "in" (RSVP status)
 * Validates authorization and inputs
 */
export async function createEvent(
  groupId: string,
  userId: string,
  data: {
    title: string;
    date: string;
    threshold?: number;
    description?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  data?: {
    event: EventProposal;
    rsvp: {
      id: string;
      event_id: string;
      user_id: string;
      status: RsvpStatus;
      responded_at: string;
    };
  };
  error?: string;
  errorCode?: string;
}> {
  const client = await getClient();

  try {
    // Validate inputs
    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        message: 'Group ID is required',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Validate event data using Zod
    const validatedData = eventCreateSchema.parse(data);

    // Check if user is a member of the group
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to create events',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Create event proposal
    const eventResult = await client.query(
      `INSERT INTO event_proposals (group_id, created_by, title, description, date, threshold, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'proposal')
       RETURNING id, group_id, created_by, title, description, date, threshold, status, created_at, updated_at`,
      [groupId, userId, validatedData.title, validatedData.description || null, validatedData.date, validatedData.threshold || null]
    );

    if (eventResult.rows.length === 0) {
      return {
        success: false,
        message: 'Failed to create event',
        error: 'CREATE_FAILED',
        errorCode: 'INTERNAL_ERROR',
      };
    }

    const event = eventResult.rows[0];

    // Create RSVP for creator (auto-mark as "in")
    const rsvpResult = await client.query(
      `INSERT INTO event_rsvps (event_id, user_id, status)
       VALUES ($1, $2, 'in')
       RETURNING id, event_id, user_id, status, responded_at`,
      [event.id, userId]
    );

    if (rsvpResult.rows.length === 0) {
      return {
        success: false,
        message: 'Created event but failed to create RSVP',
        error: 'RSVP_CREATE_FAILED',
        errorCode: 'INTERNAL_ERROR',
      };
    }

    const rsvp = rsvpResult.rows[0];

    return {
      success: true,
      message: 'Event proposed successfully',
      data: {
        event: {
          id: event.id,
          group_id: event.group_id,
          created_by: event.created_by,
          title: event.title,
          description: event.description,
          date: event.date,
          threshold: event.threshold,
          status: event.status,
          created_at: event.created_at,
          updated_at: event.updated_at,
        },
        rsvp: {
          id: rsvp.id,
          event_id: rsvp.event_id,
          user_id: rsvp.user_id,
          status: rsvp.status,
          responded_at: rsvp.responded_at,
        },
      },
    };
  } catch (error: any) {
    console.error('Error creating event:', error);

    // Handle specific error types
    if (error.message?.includes('validation')) {
      return {
        success: false,
        message: error.message || 'Validation error',
        error: error.message,
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (error.message?.includes('unique constraint')) {
      return {
        success: false,
        message: 'An event with this date and time already exists',
        error: 'DUPLICATE_EVENT',
        errorCode: 'CONFLICT',
      };
    }

    return {
      success: false,
      message: 'An error occurred while creating the event',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Get momentum counts for an event
 * Returns how many people marked in/maybe/out
 */
export async function getEventMomentum(eventId: string): Promise<{
  success: boolean;
  data?: {
    in: number;
    maybe: number;
    out: number;
    threshold?: number;
    thresholdMet?: boolean;
  };
  error?: string;
}> {
  const client = await getClient();

  try {
    // Get event threshold
    const eventResult = await client.query(
      'SELECT threshold, status FROM event_proposals WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    const event = eventResult.rows[0];

    // Get RSVP counts
    const countsResult = await client.query(
      `SELECT status, COUNT(*) as count FROM event_rsvps WHERE event_id = $1 GROUP BY status`,
      [eventId]
    );

    const counts = { in: 0, maybe: 0, out: 0 };
    countsResult.rows.forEach((row: any) => {
      counts[row.status as keyof typeof counts] = parseInt(row.count);
    });

    const thresholdMet = event.threshold ? counts.in >= event.threshold : false;

    return {
      success: true,
      data: {
        in: counts.in,
        maybe: counts.maybe,
        out: counts.out,
        threshold: event.threshold,
        thresholdMet,
      },
    };
  } catch (error: any) {
    console.error('Error getting event momentum:', error);
    return {
      success: false,
      error: error.message || 'Failed to get event momentum',
    };
  } finally {
    client.release();
  }
}

/**
 * Get all events for a group with pagination and momentum counts
 * Returns list of events with RSVP momentum (in/maybe/out counts)
 * Includes total_count for pagination
 * Requires user to be group member
 */
export async function getGroupEvents(
  groupId: string,
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
  total_count?: number;
  error?: string;
  errorCode?: string;
}> {
  const client = await getClient();

  try {
    // Check if user is a group member
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to view events',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Handle pagination parameters
    let limit = options?.limit || 20;
    let offset = options?.offset || 0;

    // Clamp limit to max 100
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 1;
    if (offset < 0) offset = 0;

    // Get total count of events for this group
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM event_proposals WHERE group_id = $1 AND deleted_at IS NULL`,
      [groupId]
    );

    const totalCount = parseInt(countResult.rows[0]?.count || '0');

    // Get events with RSVP momentum counts using GROUP BY
    const result = await client.query(
      `SELECT
        e.id,
        e.group_id,
        e.created_by,
        e.title,
        e.description,
        e.date,
        e.threshold,
        e.status,
        e.created_at,
        e.updated_at,
        COALESCE(COUNT(CASE WHEN r.status = 'in' THEN 1 END), 0)::INTEGER as in_count,
        COALESCE(COUNT(CASE WHEN r.status = 'maybe' THEN 1 END), 0)::INTEGER as maybe_count,
        COALESCE(COUNT(CASE WHEN r.status = 'out' THEN 1 END), 0)::INTEGER as out_count
       FROM event_proposals e
       LEFT JOIN event_rsvps r ON e.id = r.event_id
       WHERE e.group_id = $1 AND e.deleted_at IS NULL
       GROUP BY e.id, e.group_id, e.created_by, e.title, e.description, e.date, e.threshold, e.status, e.created_at, e.updated_at
       ORDER BY e.date DESC
       LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );

    // Transform rows to include momentum object
    const events = result.rows.map((row: any) => ({
      id: row.id,
      group_id: row.group_id,
      created_by: row.created_by,
      title: row.title,
      description: row.description,
      date: row.date,
      threshold: row.threshold,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      momentum: {
        in: parseInt(row.in_count) || 0,
        maybe: parseInt(row.maybe_count) || 0,
        out: parseInt(row.out_count) || 0,
      },
    }));

    return {
      success: true,
      data: events,
      total_count: totalCount,
    };
  } catch (error: any) {
    console.error('Error getting group events:', error);
    return {
      success: false,
      error: error.message || 'Failed to get group events',
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Get threshold details for an event
 * Returns current threshold and confirmation count
 */
export async function getEventThreshold(eventId: string): Promise<{
  success: boolean;
  data?: {
    threshold: number | null;
    inCount: number;
  };
  error?: string;
  errorCode?: string;
}> {
  const client = await getClient();

  try {
    // Get event threshold
    const eventResult = await client.query(
      'SELECT threshold FROM event_proposals WHERE id = $1 AND deleted_at IS NULL',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return {
        success: false,
        error: 'Event not found',
        errorCode: 'NOT_FOUND',
      };
    }

    const event = eventResult.rows[0];

    // Get RSVP count for "in" status
    const rsvpResult = await client.query(
      'SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = $1 AND status = $2',
      [eventId, 'in']
    );

    const inCount = parseInt(rsvpResult.rows[0].count) || 0;

    return {
      success: true,
      data: {
        threshold: event.threshold,
        inCount,
      },
    };
  } catch (error: any) {
    console.error('Error getting event threshold:', error);
    return {
      success: false,
      error: error.message || 'Failed to get event threshold',
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Update event RSVP status for a user
 * Creates new RSVP or updates existing one
 * Returns updated momentum counts and confirmation status
 */
export async function updateEventRsvp(
  eventId: string,
  userId: string,
  status: 'in' | 'maybe' | 'out'
): Promise<{
  success: boolean;
  message: string;
  data?: {
    eventId: string;
    userId: string;
    status: RsvpStatus;
    respondedAt: string;
    momentumCount: { in: number; maybe: number; out: number };
    eventConfirmed: boolean;
    autoConfirmed?: boolean;
  };
  error?: string;
  errorCode?: string;
}> {
  const client = await getClient();

  try {
    // Verify user is group member (via event's group)
    const eventResult = await client.query(
      `SELECT ep.id, ep.group_id, ep.threshold, ep.status
       FROM event_proposals ep
       WHERE ep.id = $1 AND ep.deleted_at IS NULL`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return {
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const event = eventResult.rows[0];
    const groupId = event.group_id;

    // Verify user is group member
    const memberResult = await client.query(
      `SELECT id FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberResult.rows.length === 0) {
      return {
        success: false,
        message: 'You are not a member of this group',
        error: 'NOT_GROUP_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Upsert RSVP (insert or update)
    const rsvpResult = await client.query(
      `INSERT INTO event_rsvps (event_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT(event_id, user_id)
       DO UPDATE SET status = $3, updated_at = NOW()
       RETURNING id, event_id, user_id, status, responded_at`,
      [eventId, userId, status]
    );

    if (rsvpResult.rows.length === 0) {
      return {
        success: false,
        message: 'Failed to create/update RSVP',
        error: 'RSVP_FAILED',
        errorCode: 'INTERNAL_ERROR',
      };
    }

    const rsvp = rsvpResult.rows[0];

    // Get updated momentum counts
    const countsResult = await client.query(
      `SELECT status, COUNT(*) as count FROM event_rsvps WHERE event_id = $1 GROUP BY status`,
      [eventId]
    );

    const counts = { in: 0, maybe: 0, out: 0 };
    countsResult.rows.forEach((row: any) => {
      counts[row.status as keyof typeof counts] = parseInt(row.count);
    });

    let autoConfirmed = false;
    let eventConfirmed = event.status === 'confirmed';

    // Check if threshold met and event not already confirmed
    if (event.threshold && counts.in >= event.threshold && event.status !== 'confirmed') {
      const confirmResult = await client.query(
        `UPDATE event_proposals SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING status`,
        [eventId]
      );

      if (confirmResult.rows.length > 0) {
        autoConfirmed = true;
        eventConfirmed = true;
      }
    }

    return {
      success: true,
      message: 'RSVP recorded successfully',
      data: {
        eventId: rsvp.event_id,
        userId: rsvp.user_id,
        status: rsvp.status,
        respondedAt: rsvp.responded_at,
        momentumCount: counts,
        eventConfirmed,
        autoConfirmed,
      },
    };
  } catch (error: any) {
    console.error('Error updating event RSVP:', error);

    // Handle unique constraint violation (should not happen with ON CONFLICT, but just in case)
    if (error.message?.includes('unique constraint')) {
      return {
        success: false,
        message: 'You have already responded to this event',
        error: 'DUPLICATE_RSVP',
        errorCode: 'CONFLICT',
      };
    }

    return {
      success: false,
      message: 'An error occurred while recording RSVP',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Update event threshold with optimistic locking
 * Automatically confirms event if new threshold is met
 */
export async function updateEventThreshold(
  eventId: string,
  userId: string,
  newThreshold: number | null
): Promise<{
  success: boolean;
  message: string;
  data?: {
    event: EventProposal;
    autoConfirmed?: boolean;
  };
  error?: string;
  errorCode?: string;
}> {
  const client = await getClient();

  try {
    // Validate threshold
    if (newThreshold !== null) {
      if (!Number.isInteger(newThreshold) || newThreshold < 1 || newThreshold > 1000) {
        return {
          success: false,
          message: 'Threshold must be between 1 and 1000',
          error: 'INVALID_THRESHOLD',
          errorCode: 'VALIDATION_ERROR',
        };
      }
    }

    // Get current event and check authorization
    const eventResult = await client.query(
      'SELECT id, group_id, created_by, title, description, date, threshold, status, version FROM event_proposals WHERE id = $1 AND deleted_at IS NULL',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return {
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const event = eventResult.rows[0];

    // Check if user is creator or admin
    if (event.created_by !== userId) {
      return {
        success: false,
        message: 'You do not have permission to update this event threshold',
        error: 'NOT_CREATOR',
        errorCode: 'FORBIDDEN',
      };
    }

    // Update threshold with version increment (optimistic locking)
    const updateResult = await client.query(
      `UPDATE event_proposals
       SET threshold = $1, version = version + 1, updated_at = NOW()
       WHERE id = $2 AND version = $3 AND deleted_at IS NULL
       RETURNING id, group_id, created_by, title, description, date, threshold, status, created_at, updated_at`,
      [newThreshold, eventId, event.version]
    );

    if (updateResult.rows.length === 0) {
      return {
        success: false,
        message: 'Failed to update threshold (conflict detected)',
        error: 'CONFLICT',
        errorCode: 'CONFLICT',
      };
    }

    const updatedEvent = updateResult.rows[0];
    let autoConfirmed = false;

    // Check if new threshold is met (trigger auto-confirmation)
    if (newThreshold !== null && newThreshold > 0) {
      const rsvpResult = await client.query(
        'SELECT COUNT(*) as count FROM event_rsvps WHERE event_id = $1 AND status = $2',
        [eventId, 'in']
      );

      const inCount = parseInt(rsvpResult.rows[0].count) || 0;

      if (inCount >= newThreshold && updatedEvent.status !== 'confirmed') {
        // Auto-confirm event
        const confirmResult = await client.query(
          'UPDATE event_proposals SET status = $1, confirmed_at = NOW(), version = version + 1, updated_at = NOW() WHERE id = $2 RETURNING status',
          ['confirmed', eventId]
        );

        if (confirmResult.rows.length > 0) {
          updatedEvent.status = confirmResult.rows[0].status;
          autoConfirmed = true;
        }
      }
    }

    return {
      success: true,
      message: 'Threshold updated successfully',
      data: {
        event: {
          id: updatedEvent.id,
          group_id: updatedEvent.group_id,
          created_by: updatedEvent.created_by,
          title: updatedEvent.title,
          description: updatedEvent.description,
          date: updatedEvent.date,
          threshold: updatedEvent.threshold,
          status: updatedEvent.status,
          created_at: updatedEvent.created_at,
          updated_at: updatedEvent.updated_at,
        },
        autoConfirmed,
      },
    };
  } catch (error: any) {
    console.error('Error updating event threshold:', error);
    return {
      success: false,
      message: 'An error occurred while updating the threshold',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Manually confirm an event (creator/admin only)
 * Sets event status to 'confirmed' and records confirmation timestamp
 */
export async function confirmEvent(
  eventId: string,
  userId: string,
  autoConfirmed: boolean = false
): Promise<{
  success: boolean;
  message: string;
  data?: {
    eventId: string;
    status: string;
    confirmedAt: string;
    autoConfirmed: boolean;
  };
  error?: string;
  errorCode?: string;
}> {
  const client = await getClient();

  try {
    // Get current event and check authorization
    const eventResult = await client.query(
      'SELECT id, group_id, created_by, status FROM event_proposals WHERE id = $1 AND deleted_at IS NULL',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return {
        success: false,
        message: 'Event not found',
        error: 'EVENT_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    const event = eventResult.rows[0];

    // Check if user is creator or group admin (only for manual confirmation)
    if (!autoConfirmed) {
      if (event.created_by !== userId) {
        // Check if user is group admin
        const adminResult = await client.query(
          `SELECT id FROM group_memberships
           WHERE group_id = $1 AND user_id = $2 AND role = 'admin'`,
          [event.group_id, userId]
        );

        if (adminResult.rows.length === 0) {
          return {
            success: false,
            message: 'You do not have permission to confirm this event',
            error: 'NOT_AUTHORIZED',
            errorCode: 'FORBIDDEN',
          };
        }
      }
    }

    // Update event status to confirmed with timestamp
    const confirmResult = await client.query(
      `UPDATE event_proposals
       SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, confirmed_at`,
      [eventId]
    );

    if (confirmResult.rows.length === 0) {
      return {
        success: false,
        message: 'Failed to confirm event',
        error: 'CONFIRMATION_FAILED',
        errorCode: 'INTERNAL_ERROR',
      };
    }

    const confirmedEvent = confirmResult.rows[0];

    return {
      success: true,
      message: 'Event confirmed successfully',
      data: {
        eventId: confirmedEvent.id,
        status: confirmedEvent.status,
        confirmedAt: confirmedEvent.confirmed_at,
        autoConfirmed,
      },
    };
  } catch (error: any) {
    console.error('Error confirming event:', error);
    return {
      success: false,
      message: 'An error occurred while confirming the event',
      error: error.message || 'UNKNOWN_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Get event confirmation status and details
 * Returns event status, confirmation timestamp, and momentum counts
 */
export async function getEventConfirmationStatus(eventId: string): Promise<{
  success: boolean;
  data?: {
    eventId: string;
    status: string;
    confirmedAt: string | null;
    threshold: number | null;
    momentumCount: { in: number; maybe: number; out: number };
  };
  error?: string;
  errorCode?: string;
}> {
  const client = await getClient();

  try {
    // Get event details
    const eventResult = await client.query(
      'SELECT id, status, threshold, confirmed_at FROM event_proposals WHERE id = $1 AND deleted_at IS NULL',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return {
        success: false,
        error: 'Event not found',
        errorCode: 'NOT_FOUND',
      };
    }

    const event = eventResult.rows[0];

    // Get RSVP momentum counts
    const countsResult = await client.query(
      `SELECT status, COUNT(*) as count FROM event_rsvps WHERE event_id = $1 GROUP BY status`,
      [eventId]
    );

    const counts = { in: 0, maybe: 0, out: 0 };
    countsResult.rows.forEach((row: any) => {
      counts[row.status as keyof typeof counts] = parseInt(row.count);
    });

    return {
      success: true,
      data: {
        eventId: event.id,
        status: event.status,
        confirmedAt: event.confirmed_at,
        threshold: event.threshold,
        momentumCount: counts,
      },
    };
  } catch (error: any) {
    console.error('Error getting event confirmation status:', error);
    return {
      success: false,
      error: error.message || 'Failed to get confirmation status',
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Cancel an event (soft delete)
 * Only event creator can cancel
 * Sets deleted_at timestamp and preserves RSVP history
 */
export async function cancelEvent(
  groupId: string,
  eventId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  errorCode?: string;
}> {
  const client = await getClient();

  try {
    // Get event and verify it belongs to the group and user is creator
    const eventResult = await client.query(
      'SELECT id, group_id, created_by, title FROM event_proposals WHERE id = $1 AND group_id = $2 AND deleted_at IS NULL',
      [eventId, groupId]
    );

    if (eventResult.rows.length === 0) {
      return {
        success: false,
        message: 'Event not found',
        errorCode: 'NOT_FOUND',
      };
    }

    const event = eventResult.rows[0];

    // Verify user is event creator
    if (event.created_by !== userId) {
      return {
        success: false,
        message: 'You do not have permission to cancel this event',
        errorCode: 'FORBIDDEN',
      };
    }

    // Soft delete: set deleted_at timestamp
    const deleteResult = await client.query(
      'UPDATE event_proposals SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id',
      [eventId]
    );

    if (deleteResult.rows.length === 0) {
      return {
        success: false,
        message: 'Failed to cancel event',
        errorCode: 'INTERNAL_ERROR',
      };
    }

    return {
      success: true,
      message: `Event "${event.title}" has been cancelled. All group members have been notified.`,
    };
  } catch (error: any) {
    console.error('Error cancelling event:', error);
    return {
      success: false,
      message: 'An error occurred while cancelling the event',
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}
