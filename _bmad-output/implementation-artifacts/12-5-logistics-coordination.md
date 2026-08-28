# Story 12.5: Logistics Coordination

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a group member planning an event,
I want to coordinate who's bringing what and who's driving/riding with whom,
so that logistics get sorted out visibly in one place instead of getting lost across chat threads.

## Acceptance Criteria

1. A new `event_logistics_items` table exists (migration — **verify next-available number on disk first**, same caution as Stories 12.3/12.4), with a `category` distinguishing two item types: `'bring'` (a single person brings something) and `'carpool'` (a driver offers N seats, other members claim them). RLS enabled with no policies.
2. A second table, `event_logistics_claims`, tracks who's claimed a seat on a `'carpool'` item — a proper join table (`logistics_item_id`, `user_id`, `claimed_at`), not a comma-separated column. This is the correct relational shape for "N people can claim up to capacity seats," which a single `assigned_to` column (sufficient for `'bring'` items) can't represent.
3. `POST /api/groups/:groupId/events/:eventId/logistics` creates an item: `category` (`'bring'`|`'carpool'`), `title` (required — e.g. "Bluetooth speaker" or "Leaving from downtown at 5pm"), optional `assigned_to` (for `'bring'`: who's bringing it, or omitted to leave it open for anyone to claim; for `'carpool'`: the driver — required for this category, see Dev Notes), `capacity` (required for `'carpool'`, ignored for `'bring'`).
4. `GET /api/groups/:groupId/events/:eventId/logistics` returns all items, each `'carpool'` item including its current claim count and claimant list (via a join, not N+1 queries).
5. `PATCH /api/groups/:groupId/events/:eventId/logistics/:itemId` — two authorization shapes, same "don't conflate them" caution as Story 12.3's checklist PATCH:
   - Editing `title`/`assigned_to`/`capacity` (item metadata): creator or group admin only.
   - Claiming/unclaiming a `'bring'` item's `assigned_to` (i.e. "I'll bring this"): any group member if currently unassigned; the current assignee (or creator/admin) if already assigned and being unclaimed.
6. `DELETE /api/groups/:groupId/events/:eventId/logistics/:itemId` — creator or group admin only. Deletes associated claims via `ON DELETE CASCADE`.
7. `POST /api/groups/:groupId/events/:eventId/logistics/:itemId/claims` — any group member claims an open seat on a `'carpool'` item, **rejected if capacity is already reached** (checked inside a transaction — see Dev Notes on the level of race-condition safety this matches, and its limits).
8. `DELETE /api/groups/:groupId/events/:eventId/logistics/:itemId/claims` — a member removes their own claim (no path param needed; derive the claimant from the JWT, not a URL segment, to avoid needing a separate authorization check for "is this claim mine").
9. The Planning tab shows a Logistics section with two visually distinct sub-lists ("Bring List" and "Carpool"), each item showing its assignee/driver and (for carpool) a seat-count indicator (e.g. "2/4 seats claimed") and a claim/unclaim button for the current user.
10. Logistics data syncs via the same ~5-second polling as Story 12.3's checklist (not Story 12.4's refetch-only timeline) — claiming a seat or bring-item benefits from near-real-time visibility to avoid two people racing for the same last seat/item. This extends `epics.md`'s original sync-model categorization, which covered Checklists/Polls/Photos/Timeline explicitly but didn't call out Coordination — see Dev Notes for the reasoning.
11. This story composes independently of whatever Stories 12.2/12.3/12.4 have or haven't already done to `EventPlanningTab.tsx`/`EventDetail.tsx` — same coordination caution as those stories.

## Tasks / Subtasks

- [x] Task 1: Database migrations (AC: #1, #2)
  - [x] Verified next-available migration numbers on disk (`016` was the last applied — used `017`/`018`, not any number assumed from this doc).
  - [x] `017_create_event_logistics_items_table.sql`: `event_logistics_items` with `category` CHECK constraint (`'bring'`|`'carpool'`) and a `carpool_requires_capacity` CHECK constraint enforcing `capacity IS NOT NULL` when `category = 'carpool'`.
  - [x] `018_create_event_logistics_claims_table.sql`: `event_logistics_claims` join table with `UNIQUE(logistics_item_id, user_id)`.
  - [x] No FK from `created_by`/`assigned_to`/`user_id` to `users(id)`, matching Stories 12.2-12.4.
  - [x] RLS enabled on both tables, no policies.
  - [x] Ran `npm run db:migrate` against local dev DB and verified both tables' schema (columns, constraints, indexes, FKs, RLS) directly via `psql`.
- [x] Task 2: Service layer (AC: #3, #4, #5, #6, #7, #8)
  - [x] Added `lib/services/eventLogisticsService.ts` with all six functions. `updateLogisticsItem` distinguishes metadata edits (title/capacity, or any non-self `assigned_to` change) from the relaxed self-claim/self-unclaim path (bring items only, and only when the target `assigned_to` is the caller themselves transitioning to/from `null`).
  - [x] `claimLogisticsSeat` wraps the count-check and insert in `BEGIN`/`COMMIT`/`ROLLBACK`, returns `errorCode: 'CAPACITY_REACHED'` when full and `errorCode: 'CONFLICT'` on a unique-constraint violation (duplicate claim), both mapped to `409` in the route.
- [x] Task 3: API routes (AC: #3, #4, #5, #6, #7, #8)
  - [x] `logistics/route.ts` (GET, POST), `logistics/[itemId]/route.ts` (PATCH, DELETE), `logistics/[itemId]/claims/route.ts` (POST, DELETE) — all matching the comments/checklist routes' auth extraction and error-mapping conventions.
- [x] Task 4: Planning tab UI (AC: #9, #10, #11)
  - [x] Checked `EventPlanningTab.tsx` — a simple `VStack` of independent sibling sections (Photos, Checklist, Timeline); added `EventLogistics` as a fourth sibling, no coordination needed with what 12.2-12.4 already did.
  - [x] `components/groups/EventLogistics.tsx`: Bring List and Carpool sub-sections, category-toggle add-item form (capacity field only shown for Carpool, driver required for Carpool), member-list dropdown sourced from `/api/groups/:groupId`'s `data.members` (same as `EventChecklist`), `currentUserRole` fetched the same way `EventDetail`/`WishlistDetail` already do (needed for the creator-or-admin edit/delete gating, which `EventChecklist` doesn't itself do since Story 12.3 only required creator-level gating).
  - [x] Polling: same `useCallback` + `isFetchingRef` in-flight guard + 5s `setInterval` structure as `EventChecklist`.
- [x] Task 5: Tests
  - [x] `__tests__/services/eventLogisticsService.test.ts` — 35 tests (both categories, joined-claims listing, both PATCH authorization shapes including third-party-reassignment rejection, delete, claim success/capacity-reached/duplicate-claim, unclaim success/no-claim-to-remove).
  - [x] Colocated route tests (matching the convention established by Stories 6.6/12.4): `logistics/__tests__/route.test.ts`, `logistics/[itemId]/__tests__/route.test.ts`, `logistics/[itemId]/claims/__tests__/route.test.ts` — 29 tests total, including `409` for both `CAPACITY_REACHED` and duplicate-claim `CONFLICT`.
  - [x] `__tests__/components/EventLogistics.test.tsx` — 11 tests (both sub-sections render, claim/unclaim for both bring and carpool, capacity-reached button disabling — for a non-claimant only, not for someone who already holds a seat on a full carpool —, creator/admin edit-delete gating, add-item form, polling with in-flight-guard).
- [x] Task 6: Verify no regressions
  - [x] Full suite run (scoped away from `get-together-web/` via `--testPathIgnorePatterns`): 0 logistics-related failures; pass count increased by exactly the ~75 new tests added, with no new failures elsewhere.
  - [x] Re-ran 12.2/12.3/12.4's existing tests (`EventChecklist`, `EventTimeline`, `migrate.test.ts`) — all still passing.

## Dev Notes

- **Two tables, not one, and not a comma-separated column.** `event_logistics_items` alone is enough for `'bring'` items (single `assigned_to`), but `'carpool'` needs N people claiming up to `capacity` seats on one item — that's a proper many-to-one relationship, hence the separate `event_logistics_claims` join table. Don't collapse this into a JSON/array column on `event_logistics_items`; a real join table is queryable, constrainable (the `UNIQUE(logistics_item_id, user_id)` prevents double-claims for free), and matches how this app already models similar many-to-one relationships (e.g. `event_rsvps`, `wishlist_interests`).
- **Capacity race-condition handling matches this codebase's existing rigor level, not a new standard.** Checked `eventService.ts`'s threshold/RSVP-counting logic (the closest existing analog to "a limited resource multiple users compete for") — it does **not** use `SELECT ... FOR UPDATE` row locking anywhere; it counts, then compares, without a pessimistic lock. This story's capacity check follows the same level of care (transaction-wrapped count-then-insert) rather than introducing new locking machinery with no precedent elsewhere in the app. This means two simultaneous claims for the very last seat could theoretically both succeed in a tight enough race — a known, accepted limitation consistent with how this app already handles its closest analogous case, not a regression introduced here.
- **Sync model — this extends the epic's original categorization, doesn't contradict it.** `epics.md`'s Epic 12 tech notes explicitly covered Checklists/Polls (5s polling) and Photos/Timeline (refetch-only), but Coordination wasn't explicitly assigned either way when the epic was drafted. Given claiming a seat/item benefits from the same "avoid two people racing for the same thing without seeing each other's action" concern that justified polling for Checklists, this story extends that same treatment to Logistics. Flagging this as a deliberate extension of the original design decision, not an unexamined default.
- **Member-list source, same caution as Story 12.3**: use `getGroupDetailsWithMembers`'s data (`{ user_id, name, email, role, joined_at }`, unpaginated, actually wired into the UI) for the assignee/driver dropdown — not the separate paginated `/members` route (different field names, not wired into any current UI).
- **Shared Planning-tab surface, now touched by four stories (12.2-12.5)** — same composability requirement as 12.3/12.4: build this story's section as an independent, addable block regardless of what order 12.2-12.4 land in.

### Project Structure Notes

- New: two migration files (`event_logistics_items`, `event_logistics_claims` — verify numbers on disk), `lib/services/eventLogisticsService.ts`, `app/api/groups/[groupId]/events/[eventId]/logistics/route.ts`, `.../logistics/[itemId]/route.ts`, `.../logistics/[itemId]/claims/route.ts`, `components/groups/EventLogistics.tsx`.
- Modified: `components/groups/EventPlanningTab.tsx` (add Logistics section — check current state first).

### References

- [Source: lib/services/eventService.ts] — threshold/RSVP counting logic, the closest existing analog for "limited resource, multiple claimants," and the transactional (no row-locking) pattern this story matches
- [Source: _bmad-output/implementation-artifacts/12-3-event-checklists.md] — sibling story's `updateChecklistItem` two-authorization-shape pattern, mirrored here for `updateLogisticsItem`; also the member-list source and polling structure to reuse
- [Source: app/api/groups/[groupId]/events/[eventId]/comments/route.ts] — POST/GET route convention (auth, validation, status codes) to follow
- [Source: lib/db/migrations/012_enable_rls_default_deny.sql, 013_create_users_table.sql] — RLS pattern and `VARCHAR(128)` column-typing convention to follow
- [Source: _bmad-output/implementation-artifacts/12-2-pre-event-photo-uploads.md, 12-3-event-checklists.md, 12-4-event-timeline-agenda.md] — sibling stories sharing `EventPlanningTab.tsx`/`EventDetail.tsx`; migration-numbering coordination note
- [Source: _bmad-output/planning-artifacts/epics.md#L257-L282] — Epic 12 definition; original sync-model categorization this story extends for Coordination

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- Found and fixed a real bug of my own mid-implementation: `updateLogisticsItem`'s assignee-validation step called `getUserGroupRole` a second time for *any* `assigned_to` change, including self-claims — but the caller's membership was already confirmed by the first `getUserGroupRole` call earlier in the same function. Caught by the test suite (self-claim test failed because the mock only stubbed one `getUserGroupRole` call). Fixed by skipping that second lookup when `updates.assigned_to === userId`.
- The two local Postgres listeners on port 5432 (a native Homebrew instance the app's `.env.local` actually points to via `localhost`, and a separate, empty `docker-compose.yml`-managed instance) can look confusing when spot-checking a migration — `docker exec get-together-db psql ...` shows zero tables even right after a successful `npm run db:migrate`, because the app never talks to that container. Verified schema correctness against the native instance instead (`psql -h localhost -p 5432 -U postgres -d gettogether`).
- `jest`'s default config and `tsc --noEmit` both walk into the gitignored, stray nested `get-together-web/` project copy in this repo unless explicitly excluded — same caveat as Story 6.6. All commands here used `--testPathIgnorePatterns="/node_modules/|get-together-web"` / post-hoc `grep -v` filtering.

### Completion Notes List

- **Task 1 (AC #1-#2):** Added migrations `017`/`018` after confirming `016` was the last applied on disk. Verified the live schema (columns, both CHECK constraints, FK cascade, UNIQUE constraint, indexes, RLS-enabled-no-policies) directly against the dev DB via `psql`.
- **Task 2 (AC #3-#8):** `eventLogisticsService.ts` mirrors `eventChecklistService.ts`'s shape closely. The trickiest piece was AC #5's two-authorization-shape PATCH: metadata edits (title/capacity, or reassigning `assigned_to` to a third party) require creator-or-admin, while a narrow self-claim/self-unclaim of a `'bring'` item's `assigned_to` is open to any member. `claimLogisticsSeat` uses a transaction (count-then-insert) matching `addEventComment`'s existing pattern — not `SELECT ... FOR UPDATE`, consistent with this codebase's existing (accepted) level of race-condition rigor per the story's Dev Notes.
- **Task 3 (AC #3-#8):** Three new route files, matching `comments`/`checklist` route conventions exactly (Bearer + `getSubFromJWT`, `errorCode`→status mapping including the new `CAPACITY_REACHED`/`CONFLICT`→409 cases for the claims endpoint).
- **Task 4 (AC #9-#11):** `EventLogistics.tsx` added as a fourth independent sibling in `EventPlanningTab.tsx` (no interaction needed with 12.2-12.4's sections). Unlike `EventChecklist.tsx` (which only gates on `created_by === userId`, no admin override), this story's AC explicitly requires creator-or-admin, so the component fetches `currentUserRole` via `/api/groups/:groupId` the same way `EventDetail.tsx`/`WishlistDetail.tsx` already do.
- **Task 5:** 35 service tests, 29 route tests, 11 component tests — 75 new tests, all passing.
- **Task 6:** Full suite run confirms zero logistics-related failures and no regressions in the shared `EventPlanningTab.tsx` surface (re-ran `EventChecklist`/`EventTimeline`/`migrate.test.ts`).

### File List

**Added:**
- `lib/db/migrations/017_create_event_logistics_items_table.sql`
- `lib/db/migrations/018_create_event_logistics_claims_table.sql`
- `lib/services/eventLogisticsService.ts`
- `__tests__/services/eventLogisticsService.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/claims/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/claims/__tests__/route.test.ts`
- `components/groups/EventLogistics.tsx`
- `__tests__/components/EventLogistics.test.tsx`

**Modified:**
- `components/groups/EventPlanningTab.tsx` (added `EventLogistics` as a fourth sibling section)
- `__tests__/scripts/migrate.test.ts` (updated hardcoded last-migration-file/count expectations for the new `017`/`018` migrations)

## Change Log

- 2026-08-04: Implemented Story 12.5 (Logistics Coordination) — migrations, service layer, API routes, UI component, tests. Status set to "review".
- 2026-08-27: Code review found and fixed a claim race condition and a capacity-validation gap (see below). Status set to "done".

## Code Review & Fixes (2026-08-27)

- **Review:** Adversarial code review found two correctness bugs in `lib/services/eventLogisticsService.ts`:
  1. Self-claiming a "bring" item had no guard against a concurrent claim — two members claiming the same unclaimed item within the same poll window would both succeed, with the second silently overwriting the first and no conflict signal to either user.
  2. A carpool's `capacity` could be edited below its current claim count with no validation, permanently over-subscribing it.
- **Fixed:**
  1. The self-claim/unclaim `UPDATE` now includes a conditional `WHERE assigned_to IS NULL` (claim) or `WHERE assigned_to = $userId` (unclaim) guard; zero rows updated now returns a `409 CONFLICT` ("Someone else already claimed this item") instead of silently succeeding.
  2. Capacity updates on carpool items now check the current claim count first and reject (`400 VALIDATION_ERROR`) if the new capacity would be below it.
- **Filed separately:** The review also noted (as context, not scored against this story specifically) that authorization here rests on the same unverified-JWT pattern as everywhere else. Tracked as its own story: `8-5-jwt-signature-verification.md`.
- **Review Follow-ups (AI):**
  - [ ] [AI-Review][LOW] Creator/admin has no UI path to change a carpool's driver or seat capacity, or reassign a "bring" item — `handleSaveEdit` only ever PATCHes `title`, even though the service layer supports more. `components/groups/EventLogistics.tsx`
