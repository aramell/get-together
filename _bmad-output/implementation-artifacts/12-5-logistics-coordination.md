# Story 12.5: Logistics Coordination

Status: ready-for-dev

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

- [ ] Task 1: Database migrations (AC: #1, #2)
  - [ ] **Run `ls lib/db/migrations/` before writing files** — verify the actual next-available number(s); don't assume based on any story doc's stated number.
  - [ ] `event_logistics_items(id UUID PK, event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE, group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE, created_by VARCHAR(128) NOT NULL, category VARCHAR(20) NOT NULL CHECK (category IN ('bring', 'carpool')), title VARCHAR(255) NOT NULL, assigned_to VARCHAR(128), capacity INT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`. Add a `CHECK` constraint that `capacity IS NOT NULL` when `category = 'carpool'` (don't rely on application code alone to enforce this).
  - [ ] `event_logistics_claims(id UUID PK, logistics_item_id UUID NOT NULL REFERENCES event_logistics_items(id) ON DELETE CASCADE, user_id VARCHAR(128) NOT NULL, claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(logistics_item_id, user_id))` — the `UNIQUE` constraint prevents the same person double-claiming the same carpool item.
  - [ ] No FK from `created_by`/`assigned_to`/`user_id` to `users(id)` — same reasoning as Stories 12.2-12.4 (no guaranteed `users` row for every authenticated user).
  - [ ] `ENABLE ROW LEVEL SECURITY` on both tables, no policies.
  - [ ] Run `npm run db:migrate` against local dev DB.
- [ ] Task 2: Service layer (AC: #3, #4, #5, #6, #7, #8)
  - [ ] Add `lib/services/eventLogisticsService.ts`: `addLogisticsItem`, `getLogisticsItems` (joins claims per item), `updateLogisticsItem` (branches per AC #5's two authorization shapes, same "don't conflate" caution as `eventChecklistService.updateChecklistItem` from Story 12.3), `deleteLogisticsItem`, `claimLogisticsSeat`, `unclaimLogisticsSeat`.
  - [ ] `claimLogisticsSeat`: reject with `errorCode: 'VALIDATION_ERROR'` if `category !== 'carpool'`; reject with a distinct `errorCode` (e.g. `'CAPACITY_REACHED'`, mapped to `409` in the route) if current claim count `>= capacity`. **Wrap the count-check and insert in a transaction** (`BEGIN`/count/insert/`COMMIT`), matching the transactional pattern already used in `addEventComment` (`eventService.ts`) — this narrows but doesn't eliminate the race window between two simultaneous claims for the last seat (this codebase doesn't use `SELECT ... FOR UPDATE` row locking anywhere; matching that existing level of rigor rather than introducing new locking machinery this codebase has no precedent for — see Dev Notes).
- [ ] Task 3: API routes (AC: #3, #4, #5, #6, #7, #8)
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/logistics/route.ts` (`GET`, `POST`), following `events/[eventId]/comments/route.ts`'s conventions.
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/route.ts` (`PATCH`, `DELETE`), same conventions.
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/claims/route.ts` (`POST`, `DELETE`) — `DELETE` takes no body/params beyond auth, removes the caller's own claim (AC #8).
- [ ] Task 4: Planning tab UI (AC: #9, #10, #11)
  - [ ] **Check current state of `EventPlanningTab.tsx`/`EventDetail.tsx` first** — this is now the fourth story extending the shared placeholder; reuse whatever `eventId`/`groupId` props and `isLazy` setup already exist.
  - [ ] Add `components/groups/EventLogistics.tsx` as an independent sibling section, same composability reasoning as 12.3/12.4's dedicated components.
  - [ ] Two sub-sections: "Bring List" (items with `category='bring'`, assignee name or a "claim it" button if unassigned) and "Carpool" (items with `category='carpool'`, driver name, seat-count indicator, claim/unclaim button for the current user, disabled once full).
  - [ ] Add-item form needs a category toggle (Bring vs. Carpool) that conditionally shows/hides the capacity field (only relevant for Carpool) and makes the driver (`assigned_to`) required for Carpool but optional for Bring.
  - [ ] Reuse the member-list fetch pattern already established in Story 12.3 (`getGroupDetailsWithMembers`'s data, not the unused paginated `/members` route) for the driver/assignee dropdown.
  - [ ] Polling: same structure as Story 12.3's checklist (single effect, ref-based interval, in-flight guard) — reuse or closely mirror that story's polling hook if it's already been extracted into a shared place; otherwise implement fresh following the same pattern.
- [ ] Task 5: Tests
  - [ ] `__tests__/services/eventLogisticsService.test.ts`: create both categories, list with joined claims, edit (creator/admin/wrong-user), delete, claim (success, capacity-reached rejection, duplicate-claim rejection), unclaim.
  - [ ] `__tests__/api/groups/events/logistics.test.ts` (or colocated, matching whatever convention is established by the time this is implemented): auth, validation, status codes including `409` for capacity-reached.
  - [ ] `__tests__/components/EventLogistics.test.tsx`: renders both sub-sections, claim/unclaim flows, capacity-reached UI state (claim button disabled), polling.
- [ ] Task 6: Verify no regressions
  - [ ] Run the full suite scoped away from `get-together-web/`; confirm 0 new failures beyond already-known pre-existing ones.
  - [ ] Re-run any of 12.2/12.3/12.4's tests that landed first, since this story also touches the shared Planning-tab files.

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

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List
