import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';
import { cancelEvent } from '@/lib/services/eventService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
) {
  const client = await getClient();

  try {
    const resolvedParams = await params;
    // Get user ID from JWT token
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Verify user is a group member
    const userRole = await getUserGroupRole(resolvedParams.groupId, userId);
    if (!userRole) {
      return NextResponse.json(
        {
          success: false,
          message: 'You must be a group member to view events',
          errorCode: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Query single event directly with RSVP momentum counts
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
       WHERE e.id = $1 AND e.group_id = $2 AND e.deleted_at IS NULL
       GROUP BY e.id, e.group_id, e.created_by, e.title, e.description, e.date, e.threshold, e.status, e.created_at, e.updated_at`,
      [resolvedParams.eventId, resolvedParams.groupId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Event not found',
          errorCode: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const event = {
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
    };

    return NextResponse.json(
      {
        success: true,
        data: event,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching the event',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
) {
  try {
    const resolvedParams = await params;
    // Get user ID from JWT token
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Cancel the event
    const result = await cancelEvent(resolvedParams.groupId, resolvedParams.eventId, userId);

    if (!result.success) {
      const statusCode = result.errorCode === 'FORBIDDEN' ? 403 : result.errorCode === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error cancelling event:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while cancelling the event',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
