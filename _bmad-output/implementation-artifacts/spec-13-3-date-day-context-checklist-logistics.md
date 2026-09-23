---
title: 'Date/Day Context on Checklist & Logistics Items'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md']
baseline_commit: '7b1ad603bdc37d43f44ce3cf51d61a4bcd25a7b2'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Checklist and Logistics items carry no date/day context, so on a multi-day trip a group member can't tell which tasks matter *today* without reading every item — nothing distinguishes "due now" from "due later" or "no date at all."

**Approach:** Add an optional `item_date` column to both `event_checklist_items` and `event_logistics_items` (additive migration), let users set/edit it on an item, and split each widget's list so items dated today surface in a "Today" group above the existing general list — Logistics' existing Bring/Carpool split becomes the general list beneath a single cross-cutting Today group, matching the epic's "a 'Today' group" (singular).

## Boundaries & Constraints

**Always:**
- Today grouping is computed client-side per viewer using the browser-local date (see Design Notes — no timezone infra exists anywhere in this codebase today).
- `item_date` is optional/nullable on both tables and both forms; existing and new undated items stay in the general list with no date badge.
- Reuse existing visual conventions: item row `HStack` (`borderBottom cork.100`), `Badge colorScheme="cork"` for existing pills, and Logistics' `Heading as="h3"` sub-group pattern for the new "Today" heading.
- Preserve the Story 13.2 polling pattern (`pollingIntervalRef`/`isFetchingRef`, 5000ms, wholesale `setItems(data.data)`) verbatim; Today/general regrouping is pure re-derivation from the same array on every render, not new fetch logic.

**Never:**
- No "day of trip" relative/offset concept — `event_proposals` has a single `date` column, no `end_date`; `item_date` is a plain absolute date, not a day-N-of-trip index.
- Do not attempt to fix the pre-existing "poll clobbers mid-edit state" / focus-scroll gap noted in Story 13.2's review (out of scope, matches that story's precedent).
- Do not touch `EventTimeline.tsx`, `EventPhotoGrid.tsx`, or `EventPolls.tsx` — not in this story.
- No new widget-layout, comments, or no-login changes — other Epic 13 stories own those.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Item dated today | `item_date` = viewer's browser-local today | Renders in "Today" group, above general list | N/A |
| Item dated future/past | `item_date` != today | Renders in general list only | N/A |
| Item undated | `item_date` = null | Renders in general list only, no date badge | N/A |
| Date rolls over at local midnight, tab stays open | Next 5s poll lands after midnight | Item silently moves from Today to general list on that poll tick, no reload | N/A |
| Invalid date submitted | `item_date` = malformed string | Item unchanged | API returns 400, does not write row |

</frozen-after-approval>

## Code Map

- `lib/db/migrations/031_add_location_to_event_proposals.sql` -- template to follow: single additive `ALTER TABLE ... ADD COLUMN` + rationale comment
- `lib/db/migrations/014_create_event_checklist_items_table.sql`, `017_create_event_logistics_items_table.sql` -- tables to alter
- `lib/db/migrations/016_create_event_timeline_items_table.sql:20` -- composite index precedent (`idx_..._event_id_item_time`) to mirror for `(event_id, item_date)`
- `lib/services/eventChecklistService.ts` -- `addChecklistItem` L38, `getChecklistItems` L113 (explicit column SELECT L144), `updateChecklistItem` L168 (dynamic SET builder ~L278) -- add `itemDate` through all three
- `lib/services/eventLogisticsService.ts` -- `addLogisticsItem` L66, `getLogisticsItems` L171 (`ITEM_COLUMNS` const), `updateLogisticsItem` L234 -- same shape
- `app/api/groups/[groupId]/events/[eventId]/checklist/route.ts` (GET/POST), `.../checklist/[itemId]/route.ts` (PATCH L10 whitelists `is_checked`/`title`/`assigned_to`) -- add `item_date` to POST body handling and PATCH whitelist
- `app/api/groups/[groupId]/events/[eventId]/logistics/route.ts`, `.../logistics/[itemId]/route.ts` -- same shape
- `components/groups/EventChecklist.tsx` -- `ChecklistItem` type L23-29 (no date field), flat render L244-297, `setItems(data.data)` L76 -- add `item_date`, split render into Today + general
- `components/groups/EventLogistics.tsx` -- `LogisticsItem` type L31-40, `bringItems`/`carpoolItems` split L312-313 (grouping precedent), `Heading as="h3"` sub-group pattern L328/L334/L375 -- add `item_date`, render one cross-cutting Today group above the existing Bring/Carpool split
- `date-fns` (already a dependency, `package.json:27`) -- use `isToday`/`isSameDay`, do not hand-roll date comparison
- `__tests__/components/EventChecklist.test.tsx`, `EventLogistics.test.tsx` -- extend polling tests to assert grouping survives a poll tick; add Today/future/past/undated cases
- `__tests__/services/eventChecklistService.test.ts`, `eventLogisticsService.test.ts` -- assert `item_date` persists through add/update/list

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/032_add_item_date_to_checklist_and_logistics.sql` -- add nullable `item_date DATE` to both tables plus `(event_id, item_date)` indexes -- additive, follows 031's precedent
- [x] `lib/services/eventChecklistService.ts` -- thread `itemDate` through add/update/list -- surfaces the column through the service layer
- [x] `lib/services/eventLogisticsService.ts` -- same for logistics
- [x] `app/api/groups/[groupId]/events/[eventId]/checklist/route.ts` + `[itemId]/route.ts` -- accept optional `item_date` on POST, add to PATCH whitelist
- [x] `app/api/groups/[groupId]/events/[eventId]/logistics/route.ts` + `[itemId]/route.ts` -- same
- [x] `components/groups/EventChecklist.tsx` -- add date input to add/edit forms; derive Today vs general via `isToday`; render Today heading+group above general list; show date badge on dated items
- [x] `components/groups/EventLogistics.tsx` -- same date input/edit/badge; render one Today group above the existing Bring/Carpool split (items keep their category badge inside Today)
- [x] `__tests__/components/EventChecklist.test.tsx`, `EventLogistics.test.tsx` -- Today/future/past/undated grouping cases; grouping survives a poll tick
- [x] `__tests__/services/eventChecklistService.test.ts`, `eventLogisticsService.test.ts` -- `item_date` round-trips through add/update/list

**Acceptance Criteria:**
- Given a checklist item with `item_date` = today, when the dashboard loads or polls, then it appears in a "Today" group above the general checklist list.
- Given a logistics item (bring or carpool) with `item_date` = today, when rendered, then it appears in one Today group above the Bring/Carpool split, still showing its category badge.
- Given an item with no `item_date`, when rendered, then it appears only in the general list with no date badge.
- Given the viewer's local date rolls past midnight with the tab open, when the next 5s poll fires, then a previously-Today item moves to the general list without a manual reload.
- Given a user edits an item's date, when the save completes, then the item regroups accordingly without a page reload.

## Implementation Notes

Added migration `032_add_item_date_to_checklist_and_logistics.sql` (nullable `item_date DATE` + `(event_id, item_date)` index on both tables). Threaded `itemDate`/`item_date` through both services' add/update/list and both API routes' POST/PATCH, with a shared `isValidItemDate` helper (regex + UTC round-trip) rejecting malformed and calendar-invalid dates (e.g. `2026-02-30`) with `VALIDATION_ERROR` → 400, no row written. `item_date` edits route through the existing creator/admin `isMetadataUpdate` gate on both services.

Both components add a `type="date"` input to add/edit forms and a `parseLocalDate` helper that takes only the `YYYY-MM-DD` slice of the API's returned value and builds a local-midnight `Date`, avoiding a UTC-vs-local off-by-one-day bug that `new Date(isoString)` + `date-fns isToday` would otherwise hit. Today/general grouping is a pure `.filter()` derivation from existing `items` state on every render (no new fetch logic), so poll-driven midnight rollover falls out for free. Logistics renders one cross-cutting "Today" `h3` group above the existing Bring/Carpool split (items keep their category badge there, since the split heading that normally conveys it isn't present); Checklist gets one "Today" `h3` group above its flat list.

Fixed one pre-existing route test (`logistics/__tests__/route.test.ts`) whose exact-argument-list assertion on `addLogisticsItem` broke once `item_date` became a new trailing arg.

**Verification (independently re-run, not just trusted from the implementation subagent's report):**
- `npx jest __tests__/components/EventChecklist.test.tsx __tests__/components/EventLogistics.test.tsx __tests__/services/eventChecklistService.test.ts __tests__/services/eventLogisticsService.test.ts "app/api/groups/[groupId]/events/[eventId]/logistics/__tests__/route.test.ts"` -- 4 suites, 97 tests, all passing.
- `npx eslint components/groups/EventChecklist.tsx components/groups/EventLogistics.tsx lib/services/eventChecklistService.ts lib/services/eventLogisticsService.ts` -- 30 problems (29 errors, 1 warning), same count/class as baseline (pre-existing `no-explicit-any` hits), no new error classes.
- `npm run build` -- fails identically to baseline on the pre-existing, unrelated `app/api/user/invitations/route.ts:55` type error.

**Known follow-ups (not blocking, out of this story's scope):**
- Migration 032 has not been run against any database in this session (no reachable DB, no `db:migrate` step in this repo's dev loop) -- must run before the column exists anywhere real.
- `item_date` "Today" comparison assumes a UTC server process (true for this app's Vercel deployment) for how Postgres serializes the `DATE` column; a non-UTC server timezone would drift the literal calendar date the client reconstructs. Pre-existing class of risk from having no timezone infra at all (flagged in the spec itself), not introduced or fixed by this story.

**Review patch round (see Review Triage Log below):** three-layer review (blind-hunter, edge-case-hunter, verification-gap) found one high-severity bug (`getLogisticsItems`'s SELECT never fetched `item_date`, so the Logistics widget's Today-grouping/badge never worked against real data) plus 8 low-severity gaps (validation bypasses for empty-string/non-string `item_date`, no date-based sort within the general list, missing year in the date badge, duplicated helper logic, thin route-test coverage, a stale empty-state message). All 9 routed to `patch` and were fixed by the same implementation agent; independently re-verified after the fixes: 8 affected suites / 144 tests pass, eslint unchanged from baseline (30/29/1, new util files clean), `npm run build` fails identically to the pre-existing unrelated baseline error, and the `getLogisticsItems` fix was confirmed load-bearing (revert → new test fails, restore → passes). One low-severity finding (no visual "overdue" distinction) was deferred to `deferred-work.md` since `epic-13-context.md` forecloses new visual treatments this pass. Four other findings were verified false (sprint-status lag, migration idempotency style, deploy-ordering, no DB CHECK constraint) against direct code/precedent checks and are not real defects.

## Spec Change Log

## Review Triage Log

- [verification-gap] `getLogisticsItems` (`lib/services/eventLogisticsService.ts:235-250`) SELECTs `eli.id, event_id, group_id, created_by, category, title, assigned_to, capacity, created_at, updated_at` — omits `eli.item_date`, unlike the sibling `getChecklistItems` which does select it. **Verdict: high.** Confirmed by direct read: `mapRow` reads `row.item_date` but the query never fetches that column, so every logistics item returned to the client has `item_date: undefined` regardless of the DB value — `EventLogistics.tsx`'s Today grouping and date badge (this story's core deliverable for Logistics) never activate against real data. Existing/added tests don't catch it because the service test mocks the returned row directly (injecting `item_date` without deriving it from the query) and the component/route tests mock `fetch`/the service module entirely. Route: **patch**.
- [blind-hunter, edge-case-hunter] `updateChecklistItem`/`updateLogisticsItem` (`lib/services/eventChecklistService.ts:257`, `eventLogisticsService.ts` equivalent): `if (updates.item_date && !isValidItemDate(...))` treats `''` as falsy and skips validation; the value then reaches the `UPDATE ... SET item_date = $n` with `values.push(updates.item_date)`, which Postgres rejects for a `DATE` column, surfacing as an uncaught 500 (`errorCode: 'INTERNAL_ERROR'`) instead of the spec's promised clean 400. **Verdict: low.** Confirmed by direct read of `updateChecklistItem` (not reachable through the app's own UI — the edit form always sends `item_date: editingDate || null`, never `''`), but a direct API call with `item_date: ''` does hit it, and the resulting 500 contradicts the spec's own I/O matrix row ("Invalid date submitted → API returns 400, does not write row"). Fix is trivial (tighten the guard). Route: **patch**.
- [blind-hunter, verification-gap, edge-case-hunter] Both PATCH routes (`checklist/[itemId]/route.ts:44-46`, `logistics/[itemId]/route.ts:43-45`) and both POST routes (`checklist/route.ts:123`, `logistics/route.ts:132`) do `typeof body.item_date === 'string' ? body.item_date : null` — a non-string, non-undefined `item_date` (number/object/array) is silently coerced to `null` (cleared/omitted) instead of rejected with 400. **Verdict: low.** Confirmed by direct read; not reachable through the app's own forms (which only ever send a string or omit the key), only via a direct malformed API call. Fix is trivial (reject non-string/non-null before coercing). Route: **patch**.
- [blind-hunter] Neither `getChecklistItems`/`getLogisticsItems` nor the components sort by `item_date`; the general list stays ordered by `created_at`, so a member scanning several dated items can't tell which is soonest — a gap newly exposed by this story giving items dates at all (not pre-existing). **Verdict: low.** Fix (sort the general list client-side by `item_date`, undated last) is a trivial, self-contained addition. Route: **patch**.
- [blind-hunter] The new `(event_id, item_date)` composite index has no backing query yet (grouping is client-side `.filter()`, no `ORDER BY`/`WHERE` on `item_date`). **Verdict: low, folded into the sorting fix above** — not independently actionable without either the sort fix or a future date-range query; no separate action.
- [blind-hunter] Date badges render via `format(parseLocalDate(item.item_date), 'MMM d')` with no year, ambiguous for a trip spanning a year boundary. **Verdict: low.** Real, trivial fix (include the year only when it differs from the current year). Route: **patch**.
- [blind-hunter] Past-dated items get the same neutral `Badge colorScheme="cork"` as future-dated ones — no visual "overdue" distinction. **Verdict: low.** Real, but `epic-13-context.md` (loaded as this story's context) states "No visual identity changes this pass — everything ... rearranged and behaviorally extended, not restyled" — the intent this story was scoped against explicitly forecloses introducing a new distinguishing color this pass. Route: **defer**.
- [blind-hunter, verification-gap] `isValidItemDate` is duplicated verbatim across `eventChecklistService.ts` and `eventLogisticsService.ts`. **Verdict: low.** Real; Epic 13 has several more checklist/logistics-adjacent stories queued (13.4, 13.7-13.10), so a future edit to one copy and not the other is a plausible near-term divergence risk, not a remote one. Route: **patch** (extract to one shared helper).
- [blind-hunter] `parseLocalDate`/`isItemToday` (plus their identical explanatory comment) are duplicated verbatim across `EventChecklist.tsx` and `EventLogistics.tsx`. **Verdict: low**, same reasoning as above. Route: **patch** (extract to one shared helper).
- [blind-hunter] Route-level tests (`checklist/route.ts` POST/PATCH tests, `logistics/[itemId]/route.ts` PATCH test) weren't extended to assert `item_date` actually forwards through the route layer; only one logistics POST route test got a mechanical arg-count fix. **Verdict: low.** Real — and this exact class of gap (assuming a field flows through without an assertion proving it) is what let the `getLogisticsItems` SELECT omission above ship undetected. Route: **patch**, folded into fix #1's test work — add the same "assert item_date passed through" shape of test to the untouched route test files.
- [blind-hunter] `EventChecklist.tsx`'s empty-state message (`items.length === 0`) doesn't fire when every item is today-dated (`generalItems.length === 0` but `items.length > 0`), so the general list renders as blank space instead of a message. **Verdict: low.** Real, trivial fix (check `generalItems.length === 0` instead). Route: **patch**.
- [blind-hunter] Spec's own `status: 'in-review'` frontmatter "disagrees" with `sprint-status.yaml`'s `13-3-...: in-progress`. **Verdict: false.** This is the documented, expected mid-workflow lag (see `13-2-consistent-live-refresh-widgets.md`'s own Review Triage Log, same claim, same verdict): sprint-status only syncs to `review` during step-05 (Finalize/Present), not before.
- [blind-hunter] Migration 032's `ALTER TABLE ... ADD COLUMN` (no `IF NOT EXISTS`) is "inconsistent" with its own `CREATE INDEX IF NOT EXISTS` statements. **Verdict: false.** Disproven by precedent: `031_add_location_to_event_proposals.sql` — the exact template the spec's Code Map directed this migration to follow — uses the identical plain `ADD COLUMN` with no `IF NOT EXISTS`. This matches established codebase convention, not a new inconsistency.
- [blind-hunter] Nothing guards `getChecklistItems`/`getLogisticsItems` against being deployed before migration 032 runs. **Verdict: false.** This deploy-ordering assumption (migration lands before/with the code that reads the new column) is inherent to every prior schema-adding story in this codebase (e.g. migrations 014/016/017 each pair a new table with service code that queries it in the same commit); not a risk this diff introduces.
- [blind-hunter] No DB-level `CHECK` constraint enforces `item_date`'s calendar validity, so other write paths could bypass `isValidItemDate`. **Verdict: false.** Postgres's native `DATE` column type itself already rejects any calendar-invalid literal (e.g. `2026-02-30`) server-side, with or without an extra `CHECK` — `isValidItemDate` exists only to produce a clean `VALIDATION_ERROR`/400 instead of a raw driver error, not to prevent invalid data from reaching the column.

## Design Notes

Today is a single cross-cutting group (not nested inside Bring/Carpool) because the epic context calls for "a 'Today' group" (singular) and the stated success bar is glance-ability — a member checking "what's for today" shouldn't have to scan two sub-sections. Items keep their existing category badge inside the Today group so the bring/carpool distinction isn't lost, just no longer the top-level split for today's items.

## Verification

**Commands:**
- `npx jest __tests__/components/EventChecklist.test.tsx __tests__/components/EventLogistics.test.tsx __tests__/services/eventChecklistService.test.ts __tests__/services/eventLogisticsService.test.ts` -- expect all passing
- `npx eslint components/groups/EventChecklist.tsx components/groups/EventLogistics.tsx lib/services/eventChecklistService.ts lib/services/eventLogisticsService.ts` -- expect no new error classes vs baseline
- `npm run build` -- expect the same pre-existing, unrelated failure as Story 13.2's baseline (`app/api/user/invitations/route.ts:55`), not a new one
