import { NextRequest, NextResponse } from 'next/server';
import {
  getEventByPublicToken,
  createOrUpdatePublicRsvp,
  getPublicRsvpsByEventId,
} from '@/lib/db/queries';
import { publicRsvpSchema } from '@/lib/validation/publicRsvpSchema';
import { query } from '@/lib/db/client';
import { ZodError } from 'zod';

/**
 * Calculate momentum from authenticated member RSVPs
 */
async function getAuthenticatedMomentum(eventId: string) {
  const result = await query(
    `SELECT status, COUNT(*) as count FROM event_rsvps WHERE event_id = $1 GROUP BY status`,
    [eventId]
  );

  const counts = { in: 0, maybe: 0, out: 0 };
  result.rows.forEach((row: any) => {
    counts[row.status as keyof typeof counts] = parseInt(row.count, 10);
  });
  return counts;
}

/**
 * GET /api/events/public/[publicToken]
 * AC2: Non-Authenticated Event Viewing
 * AC6: Event Context Preservation
 * Returns event details with momentum counter for non-authenticated users
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { publicToken: string } }
) {
  try {
    const { publicToken } = params;

    // Validate token format
    if (!publicToken || publicToken.length < 32) {
      return NextResponse.json(
        { success: false, message: 'Event not found or link has expired', errorCode: 'INVALID_TOKEN' },
        { status: 404 }
      );
    }

    // AC2: Fetch event by public token (no authentication required)
    const event = await getEventByPublicToken(publicToken);

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found or link has expired', errorCode: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // AC6: Check if event is deleted
    if (event.status === 'cancelled') {
      return NextResponse.json(
        { success: false, message: 'This event is no longer available', errorCode: 'EVENT_CANCELLED' },
        { status: 410 }
      );
    }

    // AC10: Calculate momentum (public + authenticated RSVPs)
    const publicRsvps = await getPublicRsvpsByEventId(event.id);
    const authenticatedRsvps = await getAuthenticatedMomentum(event.id);

    const momentum = {
      in: (authenticatedRsvps.in || 0) + publicRsvps.in,
      maybe: (authenticatedRsvps.maybe || 0) + publicRsvps.maybe,
      out: (authenticatedRsvps.out || 0) + publicRsvps.out,
    };

    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        threshold: event.threshold,
        status: event.status,
        momentum,
      },
    });
  } catch (error) {
    console.error('Error fetching public event:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/public/[publicToken]/rsvp
 * AC3: Public RSVP Status Selection
 * AC4: Real-Time Momentum Update
 * AC7: Error Handling & Validation
 * Accepts non-authenticated RSVP submission via email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { publicToken: string } }
) {
  try {
    const { publicToken } = params;
    const body = await request.json();

    // AC7: Validate token format
    if (!publicToken || publicToken.length < 32) {
      return NextResponse.json(
        { success: false, message: 'Event not found or link has expired', errorCode: 'INVALID_TOKEN' },
        { status: 404 }
      );
    }

    // AC7: Validate request body
    let validated;
    try {
      validated = publicRsvpSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.errors.map(e => e.message).join('; ');
        return NextResponse.json(
          { success: false, message: messages, errorCode: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      throw error;
    }

    // Fetch event
    const event = await getEventByPublicToken(publicToken);

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found or link has expired', errorCode: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // AC7: Check if event is deleted
    if (event.status === 'cancelled') {
      return NextResponse.json(
        { success: false, message: 'This event is no longer available', errorCode: 'EVENT_CANCELLED' },
        { status: 410 }
      );
    }

    // AC3: Create or update public RSVP
    const name = validated.name && validated.name.trim() ? validated.name.trim() : null;
    const rsvp = await createOrUpdatePublicRsvp(event.id, validated.email, name, validated.status);

    // AC4: Get updated momentum
    const publicRsvps = await getPublicRsvpsByEventId(event.id);
    const authenticatedRsvps = await getAuthenticatedMomentum(event.id);

    const momentum = {
      in: (authenticatedRsvps.in || 0) + publicRsvps.in,
      maybe: (authenticatedRsvps.maybe || 0) + publicRsvps.maybe,
      out: (authenticatedRsvps.out || 0) + publicRsvps.out,
    };

    // AC4: Return success with updated momentum
    const statusLabel = validated.status.charAt(0).toUpperCase() + validated.status.slice(1);
    return NextResponse.json(
      {
        success: true,
        message: `Thanks! You're marked as ${statusLabel}. ${momentum.in} ${momentum.in === 1 ? 'person is' : 'people are'} IN.`,
        data: {
          rsvp,
          momentum,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting public RSVP:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
