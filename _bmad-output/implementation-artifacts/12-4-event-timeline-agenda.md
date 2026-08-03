# Story 12.4: Event Timeline/Agenda

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a group member planning an event,
I want to build a run-of-show agenda for the event (e.g. "6:00 PM arrive, 7:00 PM dinner, 9:00 PM games"),
so that the group knows the plan for the day without it getting lost in comments.

## Acceptance Criteria

1. A new `event_timeline_items` table exists (migration — **verify next-available number on disk first**, likely `016`; see Dev Notes on why this isn't a safe assumption), RLS enabled with no policies, matching the established default-deny pattern.
2. `POST /api/groups/:groupId/events/:eventId/timeline` creates an item with `item_time` (a full timestamp, not just a time-of-day — see Dev Notes) and `title` (required), plus optional `description`. Requires group membership.
3. `GET /api/groups/:groupId/events/:eventId/timeline` returns all items for the event ordered by `item_time` ascending (ties broken by `created_at`). Gated by group membership.
4. `PATCH /api/groups/:groupId/events/:eventId/timeline/:itemId` edits `item_time`/`title`/`description` — creator or group admin only (same shape as every other creator-or-admin check already established in this codebase — comments, checklist-item metadata edits).
5. `DELETE /api/groups/:groupId/events/:eventId/timeline/:itemId` — creator or group admin only.
6. The Planning tab shows a Timeline section: add-item form (`Input type="datetime-local"` for `item_time`, text input for `title`, optional textarea for `description` — matching `CreateEventModal.tsx`'s existing date/time input convention exactly, not a new time-only picker), an ordered list of items showing time + title (+ description if present), edit/delete controls visible only to the item's creator.
7. **No polling.** Unlike Story 12.3's checklist (5s polling, per the epic's own sync-model decision), Timeline data is fetched once when the Planning tab/Timeline section is opened and refetched only after a local mutation (add/edit/delete) — matches `epics.md`'s explicit "Timeline... refetch on tab mount/focus only, no polling loop needed" decision. Do not add a `setInterval` here.
8. This story composes independently of whatever Stories 12.2 (photos) and 12.3 (checklists) have or haven't already done to `EventPlanningTab.tsx`/`EventDetail.tsx` — see Dev Notes; check current file state before assuming anything.
9. No new dependency, no new UI library — reuses existing Chakra `Input`/native `datetime-local` and this codebase's established route/service conventions.

## Tasks / Subtasks

- [ ] Task 1: Database migration (AC: #1)
  - [ ] **Run `ls lib/db/migrations/` before writing the file.** This story was scoped assuming Stories 12.2 (`014`) and 12.3 (`015`) claim the two numbers immediately before this one, but neither has been implemented in code as of this writing (confirmed: migrations directory only goes up to `013`). Use the next free integer after whatever actually exists on disk at implementation time — don't blindly write `016` if reality has drifted.
  - [ ] Add `event_timeline_items(id UUID PK, event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE, group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE, created_by VARCHAR(128) NOT NULL, item_time TIMESTAMPTZ NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`. Index on `event_id`, composite index on `(event_id, item_time)` for the ordered-list query. No FK on `created_by` to `users(id)` — same reasoning as Stories 12.2/12.3 (no code path guarantees a `users` row exists for every authenticated user; see 12.2's Dev Notes for the full explanation, not repeated here).
  - [ ] `ENABLE ROW LEVEL SECURITY`, no policies.
  - [ ] Run `npm run db:migrate` against local dev DB.
- [ ] Task 2: Service layer (AC: #2, #3, #4, #5)
  - [ ] Add `lib/services/eventTimelineService.ts`: `addTimelineItem`, `getTimelineItems`, `updateTimelineItem`, `deleteTimelineItem` — follow the `{ success, message, data?, error?, errorCode? }` shape and event-exists/group-membership check pattern already established in `eventService.ts`/`eventPhotoService.ts`/`eventChecklistService.ts` (whichever of those exist by the time this is implemented — check current state).
  - [ ] `updateTimelineItem`/`deleteTimelineItem` authorization: creator-or-admin only, no separate "assignee" branch needed here (unlike checklist items — there's no assignment concept for timeline entries, keep this simpler).
- [ ] Task 3: API routes (AC: #2, #3, #4, #5)
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/timeline/route.ts` (`GET`, `POST`), following `events/[eventId]/comments/route.ts`'s conventions (Bearer + `getSubFromJWT`, `errorCode`→status mapping, 201 on create).
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/timeline/[itemId]/route.ts` (`PATCH`, `DELETE`), same conventions.
- [ ] Task 4: Planning tab UI (AC: #6, #7, #8)
  - [ ] **Check the current state of `components/groups/EventPlanningTab.tsx` and `EventDetail.tsx` before starting** — this is now the third story (after 12.2, 12.3) independently extending the same placeholder/parent component. Reuse whatever `eventId`/`groupId` props and `isLazy` setup those stories already added if present; add them yourself only if they're genuinely still missing.
  - [ ] Add the Timeline section as its own independent child component (`components/groups/EventTimeline.tsx`), same reasoning as 12.3's `EventChecklist.tsx` — composes into `EventPlanningTab.tsx` as a sibling block, not entangled with the photos or checklist sections, so all three (and whatever order they land in) compose cleanly.
  - [ ] Add-item form: `Input type="datetime-local"` for `item_time` (exact same pattern as `CreateEventModal.tsx`'s date field), text `Input` for `title`, optional `Textarea` for `description`.
  - [ ] List items sorted by `item_time` ascending, formatted for display (e.g. "6:00 PM — Arrive").
  - [ ] Edit/delete icon buttons shown only when `item.created_by === userId` (or the user is a group admin).
  - [ ] Fetch on mount (or on tab-open, matching whatever mount/lazy convention 12.2/12.3 already established for the Planning tab's sections) and refetch after any local add/edit/delete — no `setInterval`.
- [ ] Task 5: Tests
  - [ ] `__tests__/services/eventTimelineService.test.ts`: create, list (ordering), edit (creator/admin/wrong-user paths), delete (creator/admin/wrong-user paths).
  - [ ] `__tests__/api/groups/events/timeline.test.ts` (or colocated, matching whatever convention the nearest sibling route tests use by the time this is implemented): auth required, validation, correct status codes.
  - [ ] `__tests__/components/EventTimeline.test.tsx`: renders items in time order, add-item flow, edit/delete visibility gated to creator, no polling (assert no repeated `fetch` calls over time using fake timers — the inverse of what 12.3's checklist test proves).
- [ ] Task 6: Verify no regressions
  - [ ] Run the full test suite scoped away from `get-together-web/`; confirm 0 new failures beyond already-known pre-existing ones.
  - [ ] If 12.2 and/or 12.3 landed first, re-run their tests too, since this story also touches the shared `EventPlanningTab.tsx`/`EventDetail.tsx` files.

## Dev Notes

- **`item_time` is a full timestamp, not a time-of-day.** Considered a time-only field combined client-side with the event's own `date` (`event_proposals.date`, a `TIMESTAMPTZ`), but a full `datetime-local` input is simpler, matches existing precedent exactly (`CreateEventModal.tsx:178-184` uses `Input type="datetime-local"` for the event's own date field), and correctly handles the edge case of a multi-day event's agenda needing entries on a date different from the event's primary `date`. Don't build a time-only picker — there's no precedent for one anywhere in this codebase, and it would need extra logic to combine with a date that this simpler approach avoids entirely.
- **No polling — this is the one Planning-tab section explicitly scoped for refetch-on-focus only**, per `epics.md`'s own sync-model decision (checklists and polls get 5s polling; photos and timeline don't, since they change less often during a live planning session). Don't copy Story 12.3's polling `useEffect` here.
- **No assignee/authorization complexity beyond creator-or-admin** — unlike Story 12.3's checklist items (which need a three-way authorization split: creator-or-admin for edits, assignee-or-anyone-if-unassigned for check-off), timeline items have no analogous "who can check it off" concept. Keep `updateTimelineItem`/`deleteTimelineItem` to the single, already-established creator-or-admin shape.
- **This is the third story independently touching `EventPlanningTab.tsx`/`EventDetail.tsx`** (after 12.2's photos and 12.3's checklist). All three were scoped to compose as independent sibling sections precisely so implementation order doesn't matter — don't assume 12.2 or 12.3 landed first, don't assume they didn't. Check the actual file state at implementation time.
- **Migration numbering**: same caution as Story 12.3 — `014`/`015` are claimed by 12.2/12.3 in their own story docs, but neither exists on disk as of this writing. Verify before writing the migration file rather than trusting any story doc's assumed number.

### Project Structure Notes

- New: `lib/db/migrations/0XX_create_event_timeline_items_table.sql` (number conditional on actual disk state), `lib/services/eventTimelineService.ts`, `app/api/groups/[groupId]/events/[eventId]/timeline/route.ts`, `app/api/groups/[groupId]/events/[eventId]/timeline/[itemId]/route.ts`, `components/groups/EventTimeline.tsx`.
- Modified: `components/groups/EventPlanningTab.tsx` (add Timeline section — check current state first, may already have 12.2's photos and/or 12.3's checklist sections).

### References

- [Source: components/groups/CreateEventModal.tsx#L178-184] — `datetime-local` input convention to reuse exactly
- [Source: lib/db/migrations/000_create_groups_schema.sql#L61] — `event_proposals.date TIMESTAMPTZ`, confirms the type convention `item_time` matches
- [Source: app/api/groups/[groupId]/events/[eventId]/comments/route.ts] — POST/GET route convention (auth, validation, status codes) to follow
- [Source: lib/db/migrations/012_enable_rls_default_deny.sql, 013_create_users_table.sql] — RLS pattern and `VARCHAR(128)` column-typing convention to follow
- [Source: _bmad-output/implementation-artifacts/12-2-pre-event-photo-uploads.md, 12-3-event-checklists.md] — sibling stories sharing `EventPlanningTab.tsx`/`EventDetail.tsx`; migration-numbering coordination note
- [Source: _bmad-output/planning-artifacts/epics.md#L257-L282] — Epic 12 definition; "Timeline... refetch on tab mount/focus only, no polling loop needed" decision this story implements

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List
