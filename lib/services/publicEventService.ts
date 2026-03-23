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
  publicToken?: string;
  publicUrl?: string;
}> {
  try {
    // Get event to verify authorization
    const client = await getClient();

    try {
      const eventResult = await client.query(
        `SELECT id, created_by FROM event_proposals WHERE id = $1 AND deleted_at IS NULL`,
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        return {
          success: false,
          message: 'Event not found',
        };
      }

      const event = eventResult.rows[0];

      // Check authorization: only event creator or group admin can generate link
      const groupResult = await client.query(
        `SELECT created_by FROM groups WHERE id = (SELECT group_id FROM event_proposals WHERE id = $1)`,
        [eventId]
      );

      const groupAdmin = groupResult.rows[0]?.created_by;
      const isAuthorized = event.created_by === userId || groupAdmin === userId;

      if (!isAuthorized) {
        return {
          success: false,
          message: 'Not authorized to share this event',
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
