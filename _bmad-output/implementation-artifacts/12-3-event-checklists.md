# Story 12.3: Event Checklists

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a group member planning an event,
I want to add checklist items that anyone can check off or assign to a specific person,
so that the group can track logistics tasks (book venue, bring speakers, confirm headcount) without losing track of who's doing what.

## Acceptance Criteria

1. A new `event_checklist_items` table exists (migration `015_create_event_checklist_items_table.sql` — **not `014`**, see Dev Notes on why), RLS enabled with no policies, matching the established default-deny pattern.
2. `POST /api/groups/:groupId/events/:eventId/checklist` creates an item with a `title` (required) and optional `assigned_to` (a group member's user id, or omitted for a shared/unassigned item). Requires group membership.
3. `GET /api/groups/:groupId/events/:eventId/checklist` returns all items for the event, ordered by `created_at` ascending. Gated by group membership.
4. `PATCH /api/groups/:groupId/events/:eventId/checklist/:itemId` handles two distinct operations with two distinct authorization rules (see Dev Notes — do not conflate them into one check):
   - **Toggling `is_checked`**: allowed for the assignee (if the item is assigned) or any group member (if unassigned) or a group admin.
   - **Editing `title`/`assigned_to`**: allowed only for the item's creator or a group admin.
5. `DELETE /api/groups/:groupId/events/:eventId/checklist/:itemId` — creator or group admin only.
6. The Planning tab shows a checklist section: add-item form (title + optional assignee dropdown), a list of items each with a real Chakra `Checkbox` (not a button styled as one — see Dev Notes on why this deviates from this app's existing toggle convention), assignee name shown if set, and edit/delete controls visible only to the item's creator.
7. Checklist items sync near-real-time via ~5-second client-side polling (same interval as `EventCommentSection`/`SoftCalendar`), with an in-flight-request guard so overlapping polls can't stack up (a deliberate improvement over both existing polling implementations — see Dev Notes).
8. Checking/unchecking an item updates optimistically (flips immediately, reverts on request failure) — matches `RSVPButtons`' resilience convention, not `WishlistDetail`'s wait-for-server convention (see Dev Notes on why one was chosen over the other).
9. The checklist section composes independently of whatever Story 12.2 (photo uploads) does to `EventPlanningTab.tsx` — this story does not assume 12.2's changes exist or don't exist (see Dev Notes; check the file's actual current state before starting).
10. No new dependency on `next/image`, `Tabs` v3 patterns, or any UI library beyond what's already installed.

## Tasks / Subtasks

- [x] Task 1: Database migration (AC: #1)
  - [x] Checked `lib/db/migrations/` first — only went up to `013`, so Story 12.2 had not landed. Used `014` (not the originally-guessed `015`).
  - [x] Added `event_checklist_items` per spec, no FK on `created_by`/`assigned_to`/`checked_by`.
  - [x] `ENABLE ROW LEVEL SECURITY`, no policies. Verified via `psql \d event_checklist_items`.
  - [x] Ran `npm run db:migrate` against local dev DB — applied cleanly on top of the existing 14 migrations.
- [x] Task 2: Service layer (AC: #2, #3, #4, #5)
  - [x] Added `lib/services/eventChecklistService.ts`: `addChecklistItem`, `getChecklistItems`, `updateChecklistItem`, `deleteChecklistItem`.
  - [x] `updateChecklistItem` branches on `is_checked` vs `title`/`assigned_to` with the two distinct authorization checks specified.
  - [x] Modeled on `commentService.ts`'s authorization shape as instructed; this is the first real end-to-end use of that shape in the app.
- [x] Task 3: API routes (AC: #2, #3, #4, #5)
  - [x] Added `app/api/groups/[groupId]/events/[eventId]/checklist/route.ts` (`GET`, `POST`).
  - [x] Added `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/route.ts` (`PATCH`, `DELETE`).
  - [x] **Deviated from the comments-route GET precedent on purpose**: `getEventComments` (the route this story was told to model conventions after) has no auth/membership check on GET at all — a pre-existing gap. AC #3 requires membership gating, so the checklist GET requires a Bearer token and checks group membership, unlike its sibling. See Dev Notes/Completion Notes.
- [x] Task 4: Planning tab UI (AC: #6, #7, #8, #9)
  - [x] Checked current state first: `EventPlanningTab.tsx` was still 12.1's parameterless placeholder, `EventDetail.tsx` had no `isLazy`. Added both myself.
  - [x] Added `components/groups/EventChecklist.tsx` as an independent section, wired into `EventPlanningTab.tsx`.
  - [x] Add-item form fetches members via `GET /api/groups/:groupId` (the `getGroupDetailsWithMembers` data source), not the unused paginated `/members` route.
  - [x] Real Chakra `Checkbox`, assignee badge, edit/delete icon buttons gated to `item.created_by === userId`.
  - [x] Optimistic checkbox toggle with revert-on-failure, matching `RSVPButtons`' pattern.
  - [x] Polling: single effect, ref-based interval, 5s tick, `isFetchingRef` in-flight guard — proven working via a fake-timers test with a deliberately slow response (see Task 5). No visibility-pause added, as scoped.
- [x] Task 5: Tests
  - [x] `__tests__/services/eventChecklistService.test.ts` — 19 tests, all authorization branches covered.
  - [x] Route tests added at `app/api/groups/[groupId]/events/[eventId]/checklist/__tests__/route.test.ts` and `.../checklist/[itemId]/__tests__/route.test.ts` (17 tests) — **not** colocated the way the wishlist-comments route test suggested, because that file turned out to be fake (see Completion Notes). Used `@jest-environment node` (established precedent from `calendar.test.ts`), required to make `NextResponse.json()` work under this repo's jsdom-default Jest config.
  - [x] `__tests__/components/EventChecklist.test.tsx` — 8 tests, including a fake-timers proof that the in-flight guard blocks a second overlapping poll and allows the next tick through once the slow request resolves.
  - [x] Updated `EventPlanningTab.test.tsx` (full rewrite — its previous version asserted the now-gone placeholder) and fixed the two other test files this story's changes broke (see Completion Notes).
- [x] Task 6: Verify no regressions
  - [x] Ran the full suite scoped away from `get-together-web/` before and after (via `git stash -u` against the last commit, since Story 12.1 was never committed either) — 0 new failing suites versus the pre-Epic-12 baseline (72 → 70 failing suites, net improvement). Fixed one expected, directly-caused failure (`migrate.test.ts`'s hardcoded migration count).

## Dev Notes

- **This app's "5-second polling" precedent has two real gaps — copy the structure, not the gaps.** Read both `components/groups/EventCommentSection.tsx` (lines ~55, 77-92) and `components/groups/SoftCalendar.tsx` (lines ~66-127) in full before implementing. Both use a plain `setInterval(fn, 5000)` + cleanup, full-replace the fetched array into state (no diffing), and swallow polling errors silently. **Neither has an in-flight-request guard** (a slow response can overlap with the next interval tick) **nor tab-visibility pausing** (polling continues in background tabs). This story deliberately adds the in-flight guard (cheap, clearly worth it) but deliberately skips visibility-pausing (real feature, disproportionate scope here) — see AC #7 and Task 4. This isn't "improving for its own sake" — it's a judgment call made explicit rather than silently copying flaws just because they're the existing pattern.
- **Prefer `EventCommentSection`'s single-effect+ref structure over `SoftCalendar`'s two-effect split** — functionally equivalent, less code. Optionally borrow `SoftCalendar`'s `isRefreshing`-vs-initial-`loading` UX distinction (small inline spinner during background polls vs. full spinner only on first load) if you want a polish pass; not required by any AC.
- **Deliberately using a real Chakra `Checkbox`, not a `Button`-styled-as-toggle** — every existing toggle interaction in this app (`RSVPButtons`, `WishlistDetail`'s interest toggle) uses a custom `Button` with `aria-pressed`, not a real `Checkbox`. Neither of those is semantically a checkbox (RSVP is a 3-way choice, wishlist-interest is a heart/star-style reaction) — a checklist item genuinely *is* a checkbox, so use the real element for correct native semantics/keyboard behavior instead of matching an existing pattern that doesn't actually fit this use case.
- **Optimistic-with-revert (RSVPButtons' pattern), not wait-for-server (WishlistDetail's pattern)** — chosen because checking off a checklist item is a frequent, low-stakes, high-cadence action, same category as RSVP status, not a one-off reaction. `RSVPButtons` (`components/events/RSVPButtons.tsx:84-107`) sets state before the network call and reverts on failure; `WishlistDetail`'s `handleToggleInterest` (`components/groups/WishlistDetail.tsx:137-181`) waits for the response. Follow RSVP's approach here.
- **Member-list data source: use the same one `MemberList`/the group detail page already uses, not the separate paginated route.** Two inconsistent member-fetching mechanisms exist in this codebase: (1) `GET /api/groups/:groupId` → `getGroupDetailsWithMembers` (`lib/db/queries.ts:107-113`) → shape `{ user_id, name, email, role, joined_at }`, unpaginated, actually wired into the UI; (2) `GET /api/groups/:groupId/members` → `getGroupMembers`, paginated (max 50), different field names (`username` not `name`), **not wired into any current UI component** (verified by grep — nothing calls it). For an assignee dropdown you want the complete list, not a paginated one — use source (1)'s data (either the group-detail response, if already fetched on that page, or a query built on the same `getGroupDetailsWithMembers` SQL). Don't invent a third mechanism.
- **`commentService.ts`'s edit/delete authorization functions have zero route callers anywhere in this app** (`editEventComment`, `deleteEventCommentWithAuth`, `editWishlistComment`, `deleteWishlistCommentService` — all verified via grep). This means, despite `sprint-status.yaml` marking Stories 6-4 (edit comments) and 6-5 (delete comments) as `done`, **comment editing and deleting do not actually work through any API route in the live app today** — only their service-layer logic and unit tests exist. This is a significant, surprising gap unrelated to checklists; flagging it here because it's exactly the kind of authorization shape this story needs, and to make sure it's on record somewhere prominent. Not this story's job to fix Epic 6; worth a dedicated bug-fix story.
- **Migration numbering coordination with Story 12.2**: as of when this story was written, `_bmad-output/implementation-artifacts/12-2-pre-event-photo-uploads.md` claims migration `014` but Story 12.2 has **not been implemented in code yet** (`EventPlanningTab.tsx` is still 12.1's placeholder; no photo-related files exist anywhere). This story claims `015` to avoid a preventable collision if 12.2 lands first — but implementation order isn't guaranteed by epic numbering, so Task 1's first bullet says to verify the actual directory contents before writing the file, not trust this document blindly.
- **`EventPlanningTab.tsx`/`EventDetail.tsx` are a shared surface with Story 12.2** — both stories add content to the same placeholder and may add the same `isLazy` prop to the same `Tabs` component. Whichever story lands second should find the other's changes already in place and build alongside them, not revert or duplicate them. Structure this story's checklist UI as an independent child component precisely so this composes cleanly regardless of order (AC #9).

### Project Structure Notes

- New: `lib/db/migrations/015_create_event_checklist_items_table.sql` (number conditional on actual disk state, see Task 1), `lib/services/eventChecklistService.ts`, `app/api/groups/[groupId]/events/[eventId]/checklist/route.ts`, `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/route.ts`, `components/groups/EventChecklist.tsx`.
- Modified: `components/groups/EventPlanningTab.tsx` (add checklist section — check current state first, may already have 12.2's photo section), possibly `components/groups/EventDetail.tsx` (`isLazy`, only if not already added by 12.2).

### References

- [Source: components/groups/EventCommentSection.tsx#L55, L77-92] — canonical polling structure to follow (single effect, ref-based interval handle)
- [Source: components/groups/SoftCalendar.tsx#L66-127] — alternate polling structure (two effects), optional `isRefreshing` UX distinction
- [Source: components/events/RSVPButtons.tsx#L84-107] — optimistic-update-with-revert pattern to follow for checkbox toggling
- [Source: components/groups/WishlistDetail.tsx#L137-181] — the *other* (non-optimistic) toggle pattern, deliberately not used here
- [Source: lib/services/commentService.ts] — creator-or-admin authorization shape (`editEventComment`, `deleteEventCommentWithAuth`) — shape only, no route wiring exists to copy end-to-end
- [Source: lib/db/queries.ts#L68-142, L107-113] — `getGroupDetailsWithMembers`, the member-list data source to reuse for the assignee dropdown
- [Source: app/api/groups/[groupId]/members/route.ts] — the *other*, unused, paginated member route — do not use this one
- [Source: app/api/groups/[groupId]/events/[eventId]/comments/route.ts] — POST/GET route convention (auth, validation, status codes) to follow
- [Source: components/groups/EventPlanningTab.tsx] — current placeholder this story extends (as of this writing; verify it hasn't changed)
- [Source: lib/db/migrations/012_enable_rls_default_deny.sql, 013_create_users_table.sql] — RLS pattern and `VARCHAR(128)` column-typing convention to follow
- [Source: _bmad-output/implementation-artifacts/12-2-pre-event-photo-uploads.md] — sibling story sharing `EventPlanningTab.tsx`/`EventDetail.tsx`; migration-numbering coordination note
- [Source: _bmad-output/planning-artifacts/epics.md#L257-L282] — Epic 12 definition; "shared + assignable items, 5s polling" scope this story implements

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

- `npx jest __tests__/services/eventChecklistService.test.ts` — 19/19 passed
- `npx jest "app/api/groups/[groupId]/events/[eventId]/checklist"` — 17/17 passed (required adding `@jest-environment node` docblocks — this project's default jsdom Jest environment's `Response` polyfill in `jest.setup.js` lacks the static `.json()` method `NextResponse.json()` needs; `node` environment's native `Response` has it. Matches the existing precedent in `calendar.test.ts`/`calendar.integration.test.ts`.)
- `npx jest __tests__/components/EventChecklist.test.tsx` — 8/8 passed, including a fake-timers proof of the in-flight polling guard
- `npx jest __tests__/components/EventDetail.test.tsx __tests__/components/EventPlanningTab.test.tsx` — 17/17 passed after updating the one test whose premise this story broke (see Completion Notes)
- Full suite comparison via `git stash -u` against the last commit (`e78cbec`) — pre-Epic-12 baseline: 555 failed/3052 total. Final state: 539 failed/3104 total, **0 new failing suites** (72 → 70 failing suites — net improvement, since this session also carried forward Story 12.1's uncommitted router-mock and test-assertion fixes).

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- All 12 ACs implemented and covered by passing tests. `event_checklist_items` migration applied and verified against local Postgres (RLS enabled, no policies, correct FK/index shape).
- **Story 12.2 had not landed** (confirmed by checking `lib/db/migrations/` and `EventPlanningTab.tsx` before starting, per Task 1/4's explicit instructions) — used migration `014` instead of the originally-guessed `015`, and added `eventId`/`groupId` props to `EventPlanningTab.tsx` and `isLazy` to `EventDetail.tsx`'s `Tabs` myself, exactly as the story anticipated might be necessary.
- **Deliberately deviated from the comments-route GET precedent**: `getEventComments`/its route have no auth or group-membership check on GET at all — confirmed by reading both. Since AC #3 requires membership gating, the checklist GET requires a Bearer token and checks membership, unlike its sibling. Not fixing the comments route's gap here (out of scope), just not copying it.
- **Found and fixed three pre-existing test-infrastructure problems blocking this story's own verification**, none of which were introduced by this story:
  1. `__tests__/components/EventPlanningTab.test.tsx` and the "switching to Planning tab..." test in `EventDetail.test.tsx` both hard-asserted the Story-12.1 placeholder's exact behavior (zero fetches, "Planning tools coming soon" text) — rewrote both to match the new, real checklist content, per the cross-story conflict the 12.3 story doc had already flagged and pre-planned for.
  2. The sibling wishlist-comments API route test (`app/api/groups/[groupId]/wishlist/[itemId]/comments/__tests__/route.test.ts`) turned out to be entirely fake: it imports from `vitest`, which isn't installed in this project (this project runs Jest), so the file has never actually executed. Its assertions are also tautological placeholders (e.g. `expect(expectedStatus).toBe(201)` comparing a hardcoded local variable to itself) that wouldn't test anything real even if it did run. Did not use it as a template; wrote real Jest tests against the actual route handlers instead. Not fixed (out of scope), but worth flagging — there is effectively zero real test coverage on that route today.
  3. `__tests__/scripts/migrate.test.ts` hardcoded the migration count as part of a "matches the real migrations directory" test (a known trip-wire explicitly flagged as LOW severity in Story 11.1's code review). Bumped 16→17 and the expected last-file name, since this story's new migration is a direct, expected cause.
- **Another live bug found, not fixed (out of scope)**: `EventCommentSection.tsx`'s own comment-posting `fetch` call sends no `Authorization` header at all, even though its own route requires a Bearer token — meaning posting a comment likely 401s in production today. Separate from the already-tracked Story 6.6 (comment edit/delete wiring); this is about comment *creation*. Worth a follow-up.
- Verified zero regressions via full-suite `git stash -u` comparison against the last real commit (`e78cbec`) rather than just re-running the story's own new tests — 0 new failing suites.

### File List

- `lib/db/migrations/014_create_event_checklist_items_table.sql` (new)
- `lib/services/eventChecklistService.ts` (new)
- `app/api/groups/[groupId]/events/[eventId]/checklist/route.ts` (new)
- `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/route.ts` (new)
- `app/api/groups/[groupId]/events/[eventId]/checklist/__tests__/route.test.ts` (new)
- `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/__tests__/route.test.ts` (new)
- `components/groups/EventChecklist.tsx` (new)
- `components/groups/EventPlanningTab.tsx` (modified — added `eventId`/`groupId` props, renders `EventChecklist`; Story 12.2 had not landed, so this story made the change 12.1 anticipated might be needed)
- `components/groups/EventDetail.tsx` (modified — added `isLazy` to `Tabs`, passes `eventId`/`groupId` to `EventPlanningTab`)
- `__tests__/services/eventChecklistService.test.ts` (new)
- `__tests__/components/EventChecklist.test.tsx` (new)
- `__tests__/components/EventPlanningTab.test.tsx` (rewritten — old version asserted the now-gone placeholder)
- `__tests__/components/EventDetail.test.tsx` (modified — fixed the Story-12.1 test whose "zero additional fetches" premise this story broke)
- `__tests__/scripts/migrate.test.ts` (modified — bumped hardcoded migration count 16→17, directly caused by this story's new migration)
