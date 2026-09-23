import { randomBytes } from 'crypto';
import { updateEventPublicToken, getEventByPublicToken } from '@/lib/db/queries';
import { getClient } from '@/lib/db/client';

/**
 * Generate a cryptographically secure public event token
 * AC1: Public Event Link Generation
 */
export function generatePublicEventToken(): string {
  return randomBytes(32).toString('hex');
}

type ShareAuthorization =
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'authorized' };

/**
 * Only the event creator or the group's admin may generate/revoke its public
 * link (AC1) — shared by generatePublicEventLink and revokePublicEventLink so
 * the two can't drift.
 */
async function verifyEventShareAuthorization(
  client: { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> },
  eventId: string,
  userId: string
): Promise<ShareAuthorization> {
  const eventResult = await client.query(
    `SELECT id, created_by FROM event_proposals WHERE id = $1 AND deleted_at IS NULL`,
    [eventId]
  );

  if (eventResult.rows.length === 0) {
    return { status: 'not_found' };
  }

  const event = eventResult.rows[0];

  const groupResult = await client.query(
    `SELECT created_by FROM groups WHERE id = (SELECT group_id FROM event_proposals WHERE id = $1)`,
    [eventId]
  );

  const groupAdmin = groupResult.rows[0]?.created_by;
  const isAuthorized = event.created_by === userId || groupAdmin === userId;

  return isAuthorized ? { status: 'authorized' } : { status: 'forbidden' };
}

/**
 * Create a public link for an event
 * AC1: Public Event Link Generation
 */
export async function generatePublicEventLink(
  eventId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  errorCode?: 'NOT_FOUND' | 'FORBIDDEN';
  publicToken?: string;
  publicUrl?: string;
}> {
  try {
    const client = await getClient();

    try {
      const authorization = await verifyEventShareAuthorization(client, eventId, userId);

      if (authorization.status === 'not_found') {
        return {
          success: false,
          message: 'Event not found',
          errorCode: 'NOT_FOUND',
        };
      }

      if (authorization.status === 'forbidden') {
        return {
          success: false,
          message: 'Not authorized to share this event',
          errorCode: 'FORBIDDEN',
        };
      }

      // Check if link already exists
      const existingResult = await client.query(
        `SELECT public_token FROM event_proposals WHERE id = $1 AND public_token IS NOT NULL`,
        [eventId]
      );

      if (existingResult.rows.length > 0) {
        const token = existingResult.rows[0].public_token;
        return {
          success: true,
          message: 'Public link already exists',
          publicToken: token,
          publicUrl: `/events/public/${token}`,
        };
      }

      // Generate new token
      const token = generatePublicEventToken();
      await updateEventPublicToken(eventId, token);

      return {
        success: true,
        message: 'Public link created successfully',
        publicToken: token,
        publicUrl: `/events/public/${token}`,
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error generating public event link:', error);
    return {
      success: false,
      message: 'Failed to generate public link',
    };
  }
}

/**
 * Revoke an event's public link (set public_token back to null). Same
 * creator-or-group-admin authorization as generatePublicEventLink.
 */
export async function revokePublicEventLink(
  eventId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  errorCode?: 'NOT_FOUND' | 'FORBIDDEN';
}> {
  try {
    const client = await getClient();

    try {
      const authorization = await verifyEventShareAuthorization(client, eventId, userId);

      if (authorization.status === 'not_found') {
        return {
          success: false,
          message: 'Event not found',
          errorCode: 'NOT_FOUND',
        };
      }

      if (authorization.status === 'forbidden') {
        return {
          success: false,
          message: 'Not authorized to revoke this link',
          errorCode: 'FORBIDDEN',
        };
      }

      await updateEventPublicToken(eventId, null);

      return {
        success: true,
        message: 'Public link revoked successfully',
      };
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error revoking public event link:', error);
    return {
      success: false,
      message: 'Failed to revoke public link',
    };
  }
}

/**
 * Get public event details for display
 * AC2: Non-Authenticated Event Viewing
 * AC6: Event Context Preservation
 */
export async function getPublicEventDetails(publicToken: string): Promise<{
  success: boolean;
  event?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    date: string;
    threshold: number | null;
    status: string;
  };
  message?: string;
}> {
  try {
    const event = await getEventByPublicToken(publicToken);

    if (!event) {
      return {
        success: false,
        message: 'Event not found or link has expired',
      };
    }

    if (event.status === 'cancelled') {
      return {
        success: false,
        message: 'This event is no longer available',
      };
    }

    return {
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        date: event.date,
        threshold: event.threshold,
        status: event.status,
      },
    };
  } catch (error: any) {
    console.error('Error fetching public event details:', error);
    return {
      success: false,
      message: 'Internal server error',
    };
  }
}
