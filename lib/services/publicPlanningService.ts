import { getEventByPublicToken, getGroupMemberNames } from '@/lib/db/queries';
import { query } from '@/lib/db/client';

/**
 * Read-only, non-authenticated view of an event's planning-tab data
 * (checklist, bring/carpool logistics, timeline). Gated by the same
 * public_token as the rest of the public event page — there's no separate
 * per-section visibility toggle, on purpose (see Story 7.3 follow-up).
 *
 * Guests never see raw user IDs or full names: assignees/claimants resolve
 * to first name only, since a public link can leak beyond the group it was
 * shared with.
 */

export interface PublicChecklistItem {
  id: string;
  title: string;
  is_checked: boolean;
  assignee_first_name: string | null;
}

export interface PublicLogisticsItem {
  id: string;
  category: 'bring' | 'carpool';
  title: string;
  capacity: number | null;
  assignee_first_name: string | null;
  claim_count: number;
  claimant_first_names: string[];
}

export interface PublicTimelineItem {
  id: string;
  item_time: string;
  title: string;
  description: string | null;
}

export interface PublicPlanningData {
  checklist: PublicChecklistItem[];
  logistics: PublicLogisticsItem[];
  timeline: PublicTimelineItem[];
}

function firstNameOf(displayName: string | null): string | null {
  if (!displayName) return null;
  const first = displayName.trim().split(/\s+/)[0];
  return first || null;
}

export async function getPublicEventPlanning(publicToken: string): Promise<{
  success: boolean;
  message?: string;
  data?: PublicPlanningData;
}> {
  try {
    const event = await getEventByPublicToken(publicToken);

    if (!event) {
      return { success: false, message: 'Event not found or link has expired' };
    }

    if (event.status === 'cancelled') {
      return { success: false, message: 'This event is no longer available' };
    }

    const [members, checklistRows, logisticsRows, timelineRows] = await Promise.all([
      getGroupMemberNames(event.group_id),
      query<{ id: string; assigned_to: string | null; title: string; is_checked: boolean }>(
        `SELECT id, assigned_to, title, is_checked
         FROM event_checklist_items
         WHERE event_id = $1
         ORDER BY created_at ASC`,
        [event.id]
      ),
      query<{
        id: string;
        category: 'bring' | 'carpool';
        title: string;
        assigned_to: string | null;
        capacity: number | null;
        claimant_ids: string[];
      }>(
        `SELECT
           eli.id, eli.category, eli.title, eli.assigned_to, eli.capacity,
           COALESCE(json_agg(elc.user_id) FILTER (WHERE elc.id IS NOT NULL), '[]') AS claimant_ids
         FROM event_logistics_items eli
         LEFT JOIN event_logistics_claims elc ON elc.logistics_item_id = eli.id
         WHERE eli.event_id = $1
         GROUP BY eli.id
         ORDER BY eli.created_at ASC`,
        [event.id]
      ),
      query<{ id: string; item_time: string; title: string; description: string | null }>(
        `SELECT id, item_time, title, description
         FROM event_timeline_items
         WHERE event_id = $1
         ORDER BY item_time ASC`,
        [event.id]
      ),
    ]);

    const nameById = new Map(members.map((m) => [m.id, firstNameOf(m.displayName)]));

    return {
      success: true,
      data: {
        checklist: checklistRows.map((row) => ({
          id: row.id,
          title: row.title,
          is_checked: row.is_checked,
          assignee_first_name: row.assigned_to ? nameById.get(row.assigned_to) ?? null : null,
        })),
        logistics: logisticsRows.map((row) => {
          const claimantIds = row.claimant_ids || [];
          return {
            id: row.id,
            category: row.category,
            title: row.title,
            capacity: row.capacity,
            assignee_first_name: row.assigned_to ? nameById.get(row.assigned_to) ?? null : null,
            claim_count: claimantIds.length,
            claimant_first_names: claimantIds.map((userId) => nameById.get(userId) ?? 'Someone'),
          };
        }),
        timeline: timelineRows.map((row) => ({
          id: row.id,
          item_time: row.item_time,
          title: row.title,
          description: row.description,
        })),
      },
    };
  } catch (error: any) {
    console.error('Error fetching public event planning data:', error);
    return { success: false, message: 'Internal server error' };
  }
}
