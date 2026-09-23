import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db/client';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { getUserGroupRole } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string }> }
) {
  try {
    const { groupId, eventId } = await params;

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

    // Verify user is group member
    const userRole = await getUserGroupRole(groupId, userId);
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

    const client = await getClient();

    try {
      // Get event details with momentum counts
      const result = await client.query(
        `SELECT
          e.id,
          e.group_id,
          e.created_by,
          e.title,
          e.description,
          e.location,
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
         GROUP BY e.id, e.group_id, e.created_by, e.title, e.description, e.location, e.date, e.threshold, e.status, e.created_at, e.updated_at`,
        [eventId, groupId]
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
        location: row.location,
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
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching event details:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching event details',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
