# Story 12.6: Quick Polls

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a group member planning an event,
I want to create a quick poll for an open decision (e.g. "pizza or tacos?") and see live results,
so that the group can settle small decisions without a back-and-forth in comments.

## Acceptance Criteria

1. Three new tables exist: `event_polls` (the question), `event_poll_options` (2+ choices per poll), `event_poll_votes` (one vote per user per poll — a join table, same relational shape Story 12.5 already established for carpool seat-claiming). RLS enabled with no policies on all three.
2. `POST /api/groups/:groupId/events/:eventId/polls` creates a poll: `question` (required) + `options` (array of 2+ non-empty strings). Requires group membership. Rejects fewer than 2 options.
3. `GET /api/groups/:groupId/events/:eventId/polls` returns all polls for the event, each with its options, per-option vote counts, total vote count, and the requesting user's current vote (if any) — computed via aggregation, not N+1 queries per poll.
4. `POST /api/groups/:groupId/events/:eventId/polls/:pollId/vote` casts or **changes** a vote (body: `option_id`). A user can vote for a different option later; this updates their existing vote rather than creating a second one (enforced by a `UNIQUE(poll_id, user_id)` constraint — upsert on conflict, not insert-then-fail).
5. `DELETE /api/groups/:groupId/events/:eventId/polls/:pollId/vote` removes the caller's own vote (abstain). No path param for whose vote — derived from the JWT, same reasoning as Story 12.5's claim-removal endpoint.
6. `DELETE /api/groups/:groupId/events/:eventId/polls/:pollId` — creator or group admin only. Cascades to delete its options and votes.
7. **Polls are not editable after creation** (question/options are fixed once created) — only creator/admin deletion is supported. This is a deliberate scope-narrowing, not an oversight: editing a poll with existing votes raises ambiguous questions (what happens to votes for a removed option?) that aren't worth solving for a "quick decision" feature — see Dev Notes.
8. **Polls don't have an explicit open/closed state** — they stay votable indefinitely until deleted. Also a deliberate scope-narrowing for the same reason as AC #7; a future story can add closing if it turns out to matter.
9. The Planning tab shows a Polls section: create-poll form (question + dynamically add/remove option fields, minimum 2), and a list of existing polls each showing the question, each option with a vote count/percentage bar, and a way to vote/change vote/remove vote. The option the current user voted for is visually distinguished.
10. Polls sync via ~5-second polling, per `epics.md`'s original, explicit categorization (Checklists and Polls get polling; this one didn't need Story 12.5's reasoning extension — it's already named directly).
11. This story composes independently of whatever Stories 12.2–12.5 have or haven't already done to `EventPlanningTab.tsx`/`EventDetail.tsx` — same coordination caution as those stories, now the fifth one sharing this surface.

## Tasks / Subtasks

- [ ] Task 1: Database migrations (AC: #1)
  - [ ] **Run `ls lib/db/migrations/` before writing files** — verify actual next-available numbers; four other Epic 12 stories (12.2–12.5) each claim numbers in their own docs that may or may not reflect what's actually on disk by the time this is implemented.
  - [ ] `event_polls(id UUID PK, event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE, group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE, created_by VARCHAR(128) NOT NULL, question VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`.
  - [ ] `event_poll_options(id UUID PK, poll_id UUID NOT NULL REFERENCES event_polls(id) ON DELETE CASCADE, label VARCHAR(255) NOT NULL, display_order INT NOT NULL DEFAULT 0)`.
  - [ ] `event_poll_votes(id UUID PK, poll_id UUID NOT NULL REFERENCES event_polls(id) ON DELETE CASCADE, option_id UUID NOT NULL REFERENCES event_poll_options(id) ON DELETE CASCADE, user_id VARCHAR(128) NOT NULL, voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(poll_id, user_id))`. `poll_id` is deliberately denormalized here (derivable via `option_id`'s FK) so the per-poll uniqueness constraint and vote-count-by-poll queries don't need a join through options — a documented choice, not an oversight.
  - [ ] No FK from `created_by`/`user_id` to `users(id)` — same reasoning as Stories 12.2–12.5.
  - [ ] `ENABLE ROW LEVEL SECURITY` on all three tables, no policies.
  - [ ] Run `npm run db:migrate` against local dev DB.
- [ ] Task 2: Service layer (AC: #2, #3, #4, #5, #6)
  - [ ] Add `lib/services/eventPollService.ts`: `createPoll` (validates ≥2 non-empty options, inserts poll + options in one transaction), `getPolls` (aggregated vote counts + current user's vote per poll), `castVote` (upsert via `ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = ...`), `removeVote`, `deletePoll` (creator-or-admin only, matching the established shape).
  - [ ] `castVote` should validate `option_id` actually belongs to `poll_id` before upserting — a vote for an option from a different poll is a validation error, not a silent success.
- [ ] Task 3: API routes (AC: #2, #3, #4, #5, #6)
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/polls/route.ts` (`GET`, `POST`), following `events/[eventId]/comments/route.ts`'s conventions.
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/route.ts` (`DELETE`).
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/vote/route.ts` (`POST`, `DELETE`).
- [ ] Task 4: Planning tab UI (AC: #9, #10, #11)
  - [ ] **Check current state of `EventPlanningTab.tsx`/`EventDetail.tsx` first** — fifth story extending this shared surface; reuse existing `eventId`/`groupId` props and `isLazy` setup.
  - [ ] Add `components/groups/EventPolls.tsx` as an independent sibling section, same composability reasoning as 12.3–12.5's dedicated components.
  - [ ] Create-poll form: question input, dynamic option-field list (add/remove rows, minimum 2 enforced client-side, re-validated server-side per AC #2).
  - [ ] Poll display: each option as a horizontal bar (width proportional to vote share) with label + count, the current user's chosen option visually distinguished (e.g. bold/checkmark), a vote/change-vote/remove-vote control.
  - [ ] Delete control (icon button) visible only when `poll.created_by === userId` or the user is a group admin.
  - [ ] Polling: same structure as Stories 12.3/12.5 (single effect, ref-based interval, in-flight guard) — reuse if already extracted into a shared hook by an earlier-landed story, otherwise implement fresh following the same pattern.
- [ ] Task 5: Tests
  - [ ] `__tests__/services/eventPollService.test.ts`: create (rejects <2 options), list with aggregated counts, vote (initial + change), remove vote, delete (creator/admin/wrong-user paths), vote-for-wrong-poll's-option rejected.
  - [ ] `__tests__/api/groups/events/polls.test.ts` (or colocated, matching whatever convention is established by the time this is implemented): auth, validation, status codes.
  - [ ] `__tests__/components/EventPolls.test.tsx`: renders polls with vote bars, vote/change-vote/remove-vote flows, delete visibility gated to creator/admin, polling.
- [ ] Task 6: Verify no regressions
  - [ ] Run the full suite scoped away from `get-together-web/`; confirm 0 new failures beyond already-known pre-existing ones.
  - [ ] Re-run tests for whichever of 12.2–12.5 landed first, since this story also touches the shared Planning-tab files. **This is the last of the six Epic 12 stories** — once this and 12.2–12.5 are all done, do a final combined check that all five Planning-tab sections (Photos, Checklist, Timeline, Logistics, Polls) render together without conflict.

## Dev Notes

- **Three tables, matching Story 12.5's just-established precedent within this same epic** — `event_polls`/`event_poll_options`/`event_poll_votes` is the same normalized, join-table shape `event_logistics_items`/`event_logistics_claims` used for carpool seat-claiming (many users, one shared resource, need to query "who voted for what" and "how many votes per option" cleanly). This app has zero precedent for JSON/array columns anywhere in its schema — every other multi-valued relationship (RSVPs, wishlist interests, now logistics claims) uses a proper table. Do the same here rather than storing options as a JSON array on `event_polls`.
- **Vote changing is an upsert, not delete-then-insert** — `ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = $new, voted_at = NOW()`. Simpler and more atomic than a separate delete+insert, and the `UNIQUE(poll_id, user_id)` constraint makes the conflict target exact.
- **No poll editing, no open/closed state — deliberate, not missing.** Both would need real design work (what happens to existing votes when options change; who can close a poll and what "closed" means for the vote/remove-vote endpoints) that isn't justified for a "quick decision" feature scoped this tightly. If a future story needs either, it's a clean addition on top of this schema, not a rework.
- **This is the last of Epic 12's six candidate stories.** Once this lands alongside 12.2 (Photos), 12.3 (Checklist), 12.4 (Timeline), and 12.5 (Logistics), the Planning tab should have all five sections. Every one of those stories was deliberately scoped to compose independently for exactly this reason — verify they all render together cleanly as a final check (Task 6), since this is the first point where all five actually need to coexist in the same file.

### Project Structure Notes

- New: three migration files (`event_polls`, `event_poll_options`, `event_poll_votes` — verify numbers on disk), `lib/services/eventPollService.ts`, `app/api/groups/[groupId]/events/[eventId]/polls/route.ts`, `.../polls/[pollId]/route.ts`, `.../polls/[pollId]/vote/route.ts`, `components/groups/EventPolls.tsx`.
- Modified: `components/groups/EventPlanningTab.tsx` (add Polls section — check current state first, likely has up to four other sections by now).

### References

- [Source: _bmad-output/implementation-artifacts/12-5-logistics-coordination.md] — the just-established join-table pattern this story directly reuses for votes; also the member-list source and polling structure precedent
- [Source: app/api/groups/[groupId]/events/[eventId]/comments/route.ts] — POST/GET route convention (auth, validation, status codes) to follow
- [Source: lib/db/migrations/012_enable_rls_default_deny.sql, 013_create_users_table.sql] — RLS pattern and `VARCHAR(128)` column-typing convention to follow
- [Source: _bmad-output/implementation-artifacts/12-2-pre-event-photo-uploads.md, 12-3-event-checklists.md, 12-4-event-timeline-agenda.md, 12-5-logistics-coordination.md] — sibling stories sharing `EventPlanningTab.tsx`/`EventDetail.tsx`; migration-numbering coordination note
- [Source: _bmad-output/planning-artifacts/epics.md#L257-L282] — Epic 12 definition; explicit "Polls... 5s polling" decision this story implements directly (unlike 12.5, which had to extend the categorization)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List
