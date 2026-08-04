# Story 12.6: Quick Polls

Status: review

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

- [x] Task 1: Database migrations (AC: #1)
  - [x] Verified next-available migration numbers on disk (`018` was the last applied — used `019`/`020`/`021`, not any number stated in a story doc).
  - [x] `019_create_event_polls_table.sql`, `020_create_event_poll_options_table.sql`, `021_create_event_poll_votes_table.sql` — `event_poll_votes.poll_id` deliberately denormalized as specified.
  - [x] No FK from `created_by`/`user_id` to `users(id)`, matching Stories 12.2–12.5.
  - [x] RLS enabled on all three tables, no policies.
  - [x] Ran `npm run db:migrate` against local dev DB and verified all three tables' schema (columns, FKs incl. cascade, `UNIQUE(poll_id, user_id)`, indexes, RLS-enabled-no-policies) directly via `psql` against the native Postgres instance `.env.local` actually points to (not the separate, unused `docker-compose.yml` instance — same caveat as Story 12.5).
- [x] Task 2: Service layer (AC: #2, #3, #4, #5, #6)
  - [x] Added `lib/services/eventPollService.ts` with all five functions. `createPoll` validates ≥2 non-empty (post-trim) options and inserts the poll + options inside a `BEGIN`/`COMMIT`/`ROLLBACK` transaction. `getPolls` aggregates per-option vote counts via a single `LEFT JOIN` + `GROUP BY` query (no correlated subquery, no per-poll round trip) plus one follow-up query for the caller's votes across all returned polls (skipped entirely when there are no polls) — two queries total regardless of poll count, not N+1.
  - [x] `castVote` validates the option belongs to the poll (`SELECT ... WHERE id = $option AND poll_id = $poll`) before the upsert, returning `VALIDATION_ERROR` if not; the upsert itself uses `ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = EXCLUDED.option_id, voted_at = NOW()`.
- [x] Task 3: API routes (AC: #2, #3, #4, #5, #6)
  - [x] `polls/route.ts` (GET, POST), `polls/[pollId]/route.ts` (DELETE), `polls/[pollId]/vote/route.ts` (POST, DELETE) — matching the comments/checklist/logistics routes' auth extraction and error-mapping conventions.
- [x] Task 4: Planning tab UI (AC: #9, #10, #11)
  - [x] Checked `EventPlanningTab.tsx` — confirmed it's a plain `VStack` of four independent sibling sections (Photos, Checklist, Timeline, Logistics) after Story 12.5; added `EventPolls` as a fifth, no coordination needed.
  - [x] `components/groups/EventPolls.tsx`: create-poll form with dynamic option fields (add/remove rows, minimum 2 enforced client-side via `canCreatePoll`), each option rendered as a proportional-width bar with label + count + percentage, the user's chosen option bolded/highlighted, a per-option "Vote"/"Selected" button plus a poll-level "Remove my vote" button, delete icon gated to creator-or-admin (fetches `currentUserRole` the same way `EventLogistics`/`EventDetail`/`WishlistDetail` already do).
  - [x] Polling: same `useCallback` + `isFetchingRef` in-flight guard + 5s `setInterval` structure as `EventChecklist`/`EventLogistics`.
- [x] Task 5: Tests
  - [x] `__tests__/services/eventPollService.test.ts` — 22 tests (creation incl. rejecting <2/whitespace-only options, listing with aggregated counts and per-user vote incl. the no-polls short-circuit, vote cast/change, wrong-poll-option rejection, remove vote incl. no-vote-to-remove, delete creator/admin/wrong-user paths).
  - [x] Colocated route tests (matching the convention established by Stories 6.6/12.4/12.5): `polls/__tests__/route.test.ts`, `polls/[pollId]/__tests__/route.test.ts`, `polls/[pollId]/vote/__tests__/route.test.ts` — 22 tests total.
  - [x] `__tests__/components/EventPolls.test.tsx` — 10 tests (vote bars with percentages, current-vote distinguishing, vote/change-vote/remove-vote flows, creator/admin delete-gating, dynamic option-field add/remove, poll creation, polling with in-flight guard).
- [x] Task 6: Verify no regressions
  - [x] Full suite run (scoped away from `get-together-web/`): 430 failed / 2779 passed — the exact same 430 pre-existing failures as the baseline immediately before this story, plus exactly the 55 new tests added here, confirming zero regressions. (An earlier, noisier run showed 441/2768 — re-run confirmed that was this suite's known flakiness, not caused by this story.)
  - [x] Re-ran 12.2–12.5's existing tests (`EventChecklist`, `eventChecklistService`, `EventTimeline`, `eventTimelineService`, `EventLogistics`, `eventLogisticsService`, logistics routes, `migrate.test.ts`) — all 135 still passing.
  - [x] **Final Epic 12 combined check**: extended the pre-existing `__tests__/components/EventPlanningTab.test.tsx` with a new test asserting all five sections (Photos, Checklist, Timeline, Logistics, Polls) render together and each independently fetches its own event-scoped data with no conflicts.

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

claude-sonnet-5

### Debug Log References

- A full-suite jest run piped through `tail -N` only captures the last N lines of *output*, not the full failure list — cost one wasted 9-minute run before re-running with output redirected to a file for proper `grep`-ability.
- This suite shows genuine run-to-run flakiness at full scale (441 failed on one run, 430 on an immediate re-run, no code changes between them) — cross-checked the failure delta against the pass-count delta (+55, matching new tests exactly) rather than trusting a single run's raw failure count.
- Same two caveats as Stories 6.6/12.5 applied again: `jest`/`tsc` both walk into the gitignored stray `get-together-web/` copy unless excluded, and the app's dev DB is the native Postgres on `localhost:5432`, not the separate `docker-compose.yml` instance.

### Completion Notes List

- **Task 1 (AC #1):** Migrations `019`–`021` after confirming `018` was the last applied. Verified live schema (including the denormalized `poll_id` + `UNIQUE(poll_id, user_id)` on `event_poll_votes`) via `psql`.
- **Task 2 (AC #2-#6):** `eventPollService.ts`'s `getPolls` aggregates vote counts with a single `LEFT JOIN` subquery (no correlated subquery, no per-poll query) and fetches the caller's votes across all polls in one more query — genuinely O(1) queries regardless of poll count, matching AC #3's "not N+1" requirement precisely. `castVote`'s option-belongs-to-poll check runs before the upsert so a cross-poll vote is a clean `VALIDATION_ERROR`, not a silent orphaned vote.
- **Task 3 (AC #2-#6):** Three new route files matching established conventions exactly.
- **Task 4 (AC #9-#11):** `EventPolls.tsx` added as a fifth independent sibling in `EventPlanningTab.tsx`. Reused the `currentUserRole`-fetch pattern from `EventLogistics.tsx` (Story 12.5) for creator-or-admin delete gating, since (like logistics) this AC explicitly requires admin override, unlike `EventChecklist.tsx`'s creator-only gating.
- **Task 5:** 22 service tests, 22 route tests, 10 component tests — 54 new tests, all passing on first run.
- **Task 6:** Full suite confirms 0 regressions (430 failed / 2779 passed, identical failure count to the pre-story baseline, +55 passing). Re-ran all of 12.2-12.5's tests (135 tests, all green). Extended the existing `EventPlanningTab.test.tsx` with the final Epic-12 combined-sections check the story explicitly calls for — all five Planning-tab sections render together without conflict.

### File List

**Added:**
- `lib/db/migrations/019_create_event_polls_table.sql`
- `lib/db/migrations/020_create_event_poll_options_table.sql`
- `lib/db/migrations/021_create_event_poll_votes_table.sql`
- `lib/services/eventPollService.ts`
- `__tests__/services/eventPollService.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/vote/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/vote/__tests__/route.test.ts`
- `components/groups/EventPolls.tsx`
- `__tests__/components/EventPolls.test.tsx`

**Modified:**
- `components/groups/EventPlanningTab.tsx` (added `EventPolls` as a fifth sibling section)
- `__tests__/scripts/migrate.test.ts` (updated hardcoded last-migration-file/count expectations for the new `019`/`020`/`021` migrations)
- `__tests__/components/EventPlanningTab.test.tsx` (added the final Epic-12 combined-sections check)

## Change Log

- 2026-08-04: Implemented Story 12.6 (Quick Polls) — migrations, service layer, API routes, UI component, tests, and the final Epic 12 combined-sections check. Status set to "review". This is the last of Epic 12's six stories.
