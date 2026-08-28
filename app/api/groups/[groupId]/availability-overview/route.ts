import { NextRequest, NextResponse } from 'next/server';
import { getGroupAvailabilitiesForCalendar, getUserGroupRole } from '@/lib/db/queries';
import { getGroupEvents } from '@/lib/services/eventService';
import { MergedAvailabilitySegment } from '@/lib/availability/mergeAvailability';

const WINDOW_DAYS = 14;

function toDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

function buildForwardWindow(): string[] {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const days: string[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    days.push(toDateOnly(d));
  }
  return days;
}

// Same precedence as SoftCalendar's day-level display: Google-busy > manual-busy >
// manual-free > unknown, collapsed from the day's merged_availability segments.
function dayStatusFromSegments(day: string, segments: MergedAvailabilitySegment[]): 'free' | 'busy' | 'unknown' {
  const daySegments = segments.filter((seg) => seg.start_time.startsWith(day));
  if (daySegments.length === 0) return 'unknown';
  if (daySegments.some((seg) => seg.source === 'google')) return 'busy';
  if (daySegments.some((seg) => seg.status === 'busy')) return 'busy';
  if (daySegments.some((seg) => seg.status === 'free')) return 'free';
  return 'unknown';
}

/**
 * GET /api/groups/:groupId/availability-overview
 * Returns merged availability (Story 3.6) for all group members across a 14-day
 * forward window, plus the group's active event proposals, for the Availability-First
 * Home Screen (Story 3.7).
 * Authorization: User must be a member of the group.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated', errorCode: 'NOT_AUTHENTICATED' },
        { status: 401 }
      );
    }

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return NextResponse.json(
        { success: false, message: 'You are not a member of this group', errorCode: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const days = buildForwardWindow();
    const windowStart = `${days[0]}T00:00:00.000Z`;
    const windowEnd = new Date(
      new Date(`${days[days.length - 1]}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000
    ).toISOString();

    const [calendarData, eventsResult] = await Promise.all([
      getGroupAvailabilitiesForCalendar(groupId, windowStart, windowEnd),
      getGroupEvents(groupId, userId),
    ]);

    const members = calendarData.map((member) => ({
      id: member.user_id,
      name: member.user_name,
      isCurrentUser: member.user_id === userId,
      availability: days.map((day) => dayStatusFromSegments(day, member.merged_availability)),
    }));

    const activeProposals = (eventsResult.success ? eventsResult.data ?? [] : []).filter(
      (event: { status: string }) => event.status === 'proposal'
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Availability overview retrieved successfully',
        data: { groupId, days, members, activeProposals },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Availability overview API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve availability overview',
        errorCode: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
