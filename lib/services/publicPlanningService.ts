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

export interface PublicPhotoItem {
  id: string;
  url: string;
  caption: string | null;
}

export interface PublicPollOption {
  id: string;
  label: string;
  vote_count: number;
}

export interface PublicPollItem {
  id: string;
  question: string;
  options: PublicPollOption[];
  total_votes: number;
}

export interface PublicPlanningData {
  checklist: PublicChecklistItem[];
  logistics: PublicLogisticsItem[];
  timeline: PublicTimelineItem[];
  photos: PublicPhotoItem[];
  polls: PublicPollItem[];
  // Present only when the caller is authenticated (a verified Bearer token
  // was resolved to a user by the route handler) -- lets a guest who just
  // logged in via the public page's in-place login modal (Story 13.5)
  // discover the real group_id so their next interactive action can go
  // through the existing per-group member endpoints, which apply the
  // existing any-member auth check (403 if they aren't actually a member).
  // Never present for an anonymous request -- see Story 7.3's
  // no-group-leakage stance.
  group_id?: string;
}

function firstNameOf(displayName: string | null): string | null {
  if (!displayName) return null;
  const first = displayName.trim().split(/\s+/)[0];
  return first || null;
}

/**
 * @param requestingUserId - the verified user ID from an Authorization
 * Bearer header, if the caller is authenticated. Undefined/null for an
 * anonymous request. Only changes whether `group_id` is included in the
 * response -- membership itself is not checked here (see `group_id` above).
 */
export async function getPublicEventPlanning(
  publicToken: string,
  requestingUserId?: string | null
): Promise<{
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

    const [members, checklistRows, logisticsRows, timelineRows, photoRows, pollRows] = await Promise.all([
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
      query<{ id: string; url: string; caption: string | null }>(
        `SELECT id, url, caption
         FROM event_photos
         WHERE event_id = $1
         ORDER BY created_at ASC`,
        [event.id]
      ),
      query<{
        poll_id: string;
        question: string;
        option_id: string;
        label: string;
        display_order: number;
        vote_count: string;
      }>(
        `SELECT
           p.id AS poll_id, p.question,
           o.id AS option_id, o.label, o.display_order,
           COALESCE(vc.count, 0) AS vote_count
         FROM event_polls p
         JOIN event_poll_options o ON o.poll_id = p.id
         LEFT JOIN (
           SELECT option_id, COUNT(*) AS count FROM event_poll_votes GROUP BY option_id
         ) vc ON vc.option_id = o.id
         WHERE p.event_id = $1
         ORDER BY p.created_at ASC, o.display_order ASC`,
        [event.id]
      ),
    ]);

    const nameById = new Map(members.map((m) => [m.id, firstNameOf(m.displayName)]));

    // Group the flat poll/option rows back into one entry per poll, options
    // in display order -- mirrors eventPollService.ts's mapRow shape, minus
    // the authenticated-only user_vote field (a guest hasn't voted).
    const pollsById = new Map<string, PublicPollItem>();
    for (const row of pollRows) {
      let poll = pollsById.get(row.poll_id);
      if (!poll) {
        poll = { id: row.poll_id, question: row.question, options: [], total_votes: 0 };
        pollsById.set(row.poll_id, poll);
      }
      const voteCount = parseInt(row.vote_count, 10) || 0;
      poll.options.push({ id: row.option_id, label: row.label, vote_count: voteCount });
      poll.total_votes += voteCount;
    }

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
        photos: photoRows.map((row) => ({
          id: row.id,
          url: row.url,
          caption: row.caption,
        })),
        polls: Array.from(pollsById.values()),
        ...(requestingUserId ? { group_id: event.group_id } : {}),
      },
    };
  } catch (error: any) {
    console.error('Error fetching public event planning data:', error);
    return { success: false, message: 'Internal server error' };
  }
}
