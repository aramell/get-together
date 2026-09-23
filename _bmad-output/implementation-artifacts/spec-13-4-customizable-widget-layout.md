---
title: 'Customizable Widget Layout'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md']
baseline_commit: '473ce7edbd3fb0205ccf8555c5b169c4a5500e1f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** All 5 dashboard widgets render in one hardcoded order (`EventPlanningTab.tsx`) with no way for a group to hide widgets it doesn't use or reorder them to match how it actually plans — every group sees the identical layout regardless of whether it uses polls, carpools, a photo grid, etc.

**Approach:** Add a per-group `group_dashboard_widgets` table (position + visible per widget), backfill existing groups with the current hardcoded order and all-visible, and let any group member enter a keyboard-operable "customize" mode on the Dashboard to reorder (move up/down) and hide/show each widget — changes are optimistic for the acting member and propagate to other viewers via the existing ~5s poll.

## Boundaries & Constraints

**Always:**
- Any group member (not just admin) can enter customize mode and make changes — reuse the `getUserGroupRole`/"any member" auth idiom already used by checklist/logistics services, not Story 2.8's admin-only pattern.
- Reordering/hiding is optimistic for the acting member (mirror `EventChecklist.tsx`'s `handleToggle` revert-on-failure shape) and non-drag/keyboard-operable (move-up/move-down controls) — no drag-and-drop.
- A hidden widget renders for nobody, including the acting member; a widget that's visible but has zero items still renders its own existing empty-state prompt, never hidden just because it's empty.
- DOM/focus order in the Dashboard follows the group's configured widget order.
- No visual identity changes — reuse existing Chakra UI v2 primitives (`IconButton`/`EditIcon`-style entry point, existing per-widget card wrappers).

**Never:**
- Do not touch `PublicEventPlanning.tsx` or the no-login view (`app/events/public/[publicToken]/page.tsx`) — Story 13.5 will later read this same table read-only; 13.4 only creates and writes it from the authenticated Dashboard.
- No per-user layout preference — layout is per-group only, one shared row set per group.
- Do not add a 6th widget or change any individual widget's internal behavior — this story is purely about the order/visibility of the existing 5.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New/existing group with no rows yet | No `group_dashboard_widgets` rows for the group | Dashboard falls back to the fixed default order, all visible (same as today's hardcoded order) | N/A |
| Member hides a widget | `visible = false` for one widget_key | Widget disappears from the Dashboard for all viewers within one poll cycle | N/A |
| Member reorders via move-up/move-down | Position swapped with the adjacent visible widget | Acting member sees the new order immediately (optimistic); other viewers see it within ~5s | N/A |
| Reorder/hide request fails server-side | PATCH returns non-2xx | Acting member's local order/visibility reverts to its pre-request state, error toast shown | Toast + revert, no partial state |
| Non-member calls the widget-layout API | `userId` has no role in the group | Request rejected | 403 FORBIDDEN, no row written |
| Widget has zero items but stays visible | e.g. checklist has 0 items | Widget still renders with its own existing empty-state message, not hidden | N/A |

</frozen-after-approval>

## Code Map

- `components/groups/EventPlanningTab.tsx:19-23` -- hardcoded widget render order today (PhotoGrid, Checklist, Timeline, Logistics, Polls); becomes the default backfill order, and the file that must read the group's configured order and render only visible widgets in that order
- `lib/db/migrations/023_add_planning_style_to_groups.sql` -- closest per-group-setting precedent, but its backfill (a column `DEFAULT`) doesn't transfer to a one-row-per-(group,widget) table; no migration in this repo has a composite `(parent_id, key)` PK or an `INSERT ... SELECT` backfill yet -- this migration is new structural territory
- `lib/db/queries.ts:182` `getUserGroupRole`, `:311` `isGroupMember` -- reuse for "any member" auth; do **not** copy `app/api/groups/[groupId]/route.ts:134`'s admin-only PATCH check from Story 2.8
- `lib/services/eventChecklistService.ts:78-86` -- `if (!userRole) return 403 NOT_GROUP_MEMBER` idiom to mirror for the new widget-layout API
- `components/groups/EventChecklist.tsx:159-181` `handleToggle` -- canonical optimistic-update-with-revert-on-failure shape to mirror for reorder/hide
- No existing keyboard-reorder (move-up/move-down) UI anywhere in this codebase (checked: zero hits) -- new UI pattern, build from Chakra `IconButton` + arrow icons
- `components/groups/EventChecklist.tsx:284`, `EventTimeline.tsx:262`, `EventLogistics.tsx:287` -- existing `EditIcon` `IconButton` pattern to reuse for the "Customize layout" entry-point button; no existing whole-panel edit-mode toggle to copy state shape from
- `app/events/public/[publicToken]/page.tsx`, `components/groups/PublicEventPlanning.tsx`, `lib/services/publicPlanningService.ts` -- current hardcoded 3-widget public view; out of scope for 13.4, but the table this story creates is what Story 13.5 will later read read-only

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/033_create_group_dashboard_widgets_table.sql` -- create table (`group_id`, `widget_key`, `position`, `visible`), PK `(group_id, widget_key)`, `group_id` FK `ON DELETE CASCADE`, `widget_key` CHECK constrained to the 5 keys, backfill every existing group via `INSERT ... SELECT` with today's hardcoded order and `visible = true` -- additive, establishes per-group layout state
- [x] `lib/services/dashboardWidgetsService.ts` (new) -- `getWidgetLayout(groupId)` (returns all 5 widgets' state, defaulting a group with no rows to the fixed default order/visible), `updateWidgetLayout(groupId, userId, changes)` (any-member auth, validates the widget_key set, writes position/visible)
- [x] `app/api/groups/[groupId]/dashboard-widgets/route.ts` (new) -- GET (current layout) and PATCH (reorder/hide), any-member auth via `getUserGroupRole`
- [x] `components/groups/EventPlanningTab.tsx` -- fetch the group's widget layout, render only visible widgets in configured DOM order, add a "Customize layout" entry-point button
- [x] `components/groups/DashboardWidgetCustomizer.tsx` (new) -- customize-mode controls: per-widget move-up/move-down + show/hide, optimistic local update with revert-on-failure (mirror `EventChecklist`'s `handleToggle` shape)
- [x] `__tests__/services/dashboardWidgetsService.test.ts`, `__tests__/components/EventPlanningTab.test.tsx`, `__tests__/components/DashboardWidgetCustomizer.test.tsx` (new) -- cover the matrix: default fallback, hide, reorder, revert-on-failure, non-member rejection, empty-but-visible widget

**Acceptance Criteria:**
- Given a group with no `group_dashboard_widgets` rows, when the Dashboard loads, then all 5 widgets render in the current default order, all visible.
- Given a group member hides a widget, when the change saves, then that widget disappears from the Dashboard for every viewer within one poll cycle (~5s).
- Given a group member reorders widgets via move-up/move-down, when they click, then their own view updates immediately and DOM/focus order matches the new configured order.
- Given a reorder/hide PATCH fails, when the error returns, then the acting member's local state reverts to its pre-request order/visibility and an error toast appears.
- Given a non-member calls the widget-layout API, when the request is made, then it is rejected with 403 and no row is written.

## Implementation Notes

- Widget keys used throughout (DB CHECK constraint, service, API, UI): `photos`, `checklist`, `timeline`, `logistics`, `polls` -- matching the existing `app/api/groups/[groupId]/events/[eventId]/<key>` route segment names and today's `EventPlanningTab` render order (positions 1-5).
- Shared client-safe constants (`WIDGET_KEYS`, `WidgetKey`, `WidgetLayoutItem`, `WIDGET_LABELS`, `defaultWidgetLayout()`) live in `lib/utils/dashboardWidgets.ts`, separate from `lib/services/dashboardWidgetsService.ts` (which touches the `pg` pool) so the `'use client'` components (`EventPlanningTab`, `DashboardWidgetCustomizer`) can import the fixed widget set/default order without pulling DB code into the client bundle.
- `PATCH /api/groups/:groupId/dashboard-widgets` takes a full-layout replace (`{ widgets: WidgetLayoutItem[] }`, all 5 entries) rather than a partial diff -- the customize-mode UI always has the complete desired state after a move/hide (mirrors how `EventChecklist`'s optimistic updates work against one full item), and `updateWidgetLayout` validates the payload is exactly the 5 fixed keys with unique positions before writing.
- `DashboardWidgetCustomizer` intentionally lists all 5 widgets (visible and hidden) while active, separate from the actual widget cards below it (which only ever render visible ones, per the "hidden renders for nobody" boundary) -- otherwise a hidden widget could never be found again to re-show it.
- `updateWidgetLayout` wraps its 5 upserts in an explicit `BEGIN`/`COMMIT`/`ROLLBACK` transaction on the checked-out client so a mid-batch failure can't leave a group's layout in a half-written state.
- `DashboardWidgetCustomizer`'s optimistic revert (`onLayoutChange(previousLayout)` in `saveLayout`) reverts the whole 5-widget layout array on failure, not a single item -- there's one PATCH per user action carrying the complete desired layout, so this is a whole-array revert, not a per-item one like `EventChecklist.handleToggle`'s. Because of that, `EventPlanningTab`'s 5s poll and the customizer's save/revert needed explicit coordination: `onSavingChange` lifts a pending-save flag (`isSavingRef`, counted across overlapping saves in the customizer) up to `EventPlanningTab`, and `fetchLayout` skips applying a poll response while any save is in flight -- otherwise a poll landing mid-save could flicker an optimistic change back to stale state, or a revert could stomp a second, still-pending change made in the interim.
- `EventPlanningTab`'s fetch defensively ignores an empty/malformed layout response (falls back to the default-order state already held) even though the real endpoint's contract never returns fewer than 5 widgets -- this also fixed an existing `EventDetail.test.tsx` mock that generically answered unmatched fetches with `data: []`, which would otherwise have blanked out the whole dashboard once that mock started matching the new `/dashboard-widgets` endpoint too. Updated that test's fallback to answer `/dashboard-widgets` with a realistic default layout instead.
- `EventPlanningTab` polls `/dashboard-widgets` every 5s (`pollingIntervalRef`/`isFetchingRef`, cleared on unmount), same pattern as `EventChecklist.tsx`/`EventLogistics.tsx` -- first pass only fetched on mount, which missed the spec's "propagate to other viewers via the existing ~5s poll" boundary and the two I/O matrix rows requiring other viewers see a hide/reorder within one poll cycle. Caught in review before this went to review status; fixed and covered by a new polling test in `EventPlanningTab.test.tsx` (fake timers, asserts a second GET fires at the 5s mark and a widget hidden between the two responses disappears).
- Second review pass (Review Triage Log below) surfaced 6 more `patch`-routed findings, all fixed: migration 033 now has a surrogate `id`, `created_at`/`updated_at` (the upsert's `ON CONFLICT` also sets `updated_at = NOW()`), `UNIQUE(group_id, widget_key)` instead of a bare composite PK, and `CHECK (position BETWEEN 1 AND 5)`, with the now-redundant standalone `group_id` index removed -- matching `021_create_event_poll_votes_table.sql`'s precedent exactly; a new `app/api/groups/[groupId]/dashboard-widgets/__tests__/route.test.ts` exercises the route's own auth/validation branches (GET 401/403/200/500, PATCH 400/403/400/200) rather than relying on every consumer mocking `fetch` past it; `DashboardWidgetCustomizer.handleMove` now refocuses that row's visibility-toggle button (always enabled) after a move, so hitting a boundary that disables the up/down button just clicked no longer strands focus; `fetchLayout` validates a fetched/polled layout is exactly the 5 recognized widgets (`isValidWidgetLayoutResponse`) before applying it; and `EventPlanningTab` shows "All widgets are hidden — use Customize to show one." instead of a silently empty dashboard when every widget is hidden.
- `EventPlanningTab.test.tsx`'s widget stubs now render their received `eventId`/`groupId` props as `data-event-id`/`data-group-id` attributes on the existing `data-testid="widget-*"` element, asserted in the default-order test, so a prop-wiring bug (e.g. swapped ids) would fail a test, not just the visual/order checks the stubs previously supported.

## Spec Change Log

## Review Triage Log

- [verification-gap] `GET /dashboard-widgets`'s membership check (`route.ts` 403 `FORBIDDEN`) is the *only* access-control gate for read access — `getWidgetLayout(groupId)` takes no `userId` and checks nothing — yet no test anywhere (service, component, or route) exercises it; a future refactor moving/losing that check would ship undetected. **Verdict: medium.** Confirmed by grep: nothing imports `GET`/`PATCH` from the route module; all three consuming test files mock `fetch` directly. Route: **patch**.
- [verification-gap] The route's `errorCode`→HTTP-status mapping (`VALIDATION_ERROR`→400, `FORBIDDEN`→403, else→500) is untested at the route layer for both GET and PATCH. **Verdict: low** (the one real caller, `DashboardWidgetCustomizer`, only branches on `response.ok`, so a wrong status code wouldn't currently change user-visible behavior) — folded into the same route-test patch as the finding above rather than treated separately.
- [blind-hunter] `group_dashboard_widgets` (migration 033) is the only table in `lib/db/migrations/` with no surrogate `id` and no `created_at`/`updated_at` — every sibling, including the closest structural analog `021_create_event_poll_votes_table.sql` (also a composite-natural-key join table), uses a surrogate `id UUID PRIMARY KEY` plus a `UNIQUE` constraint on the natural key, not a bare composite PK. **Verdict: medium.** Confirmed by reading both migrations directly; no audit trail for a table any group member can concurrently write to. Route: **patch** (migration hasn't run anywhere yet, safe to amend in place).
- [blind-hunter] `CREATE INDEX idx_group_dashboard_widgets_group_id ON group_dashboard_widgets(group_id)` is redundant — `group_id` is already the leading column of the composite key, so Postgres already has a usable index for `WHERE group_id = $1`. **Verdict: low.** Confirmed by the table definition. Route: **patch** (delete the line).
- [blind-hunter] `position` has no DB-level range/uniqueness constraint — enforced only in `validateLayout()`. **Verdict: low** for the range half (`CHECK (position BETWEEN 1 AND 5)` is a safe, trivial addition); the uniqueness half is **rejected** — a `UNIQUE(group_id, position)` constraint would need `DEFERRABLE INITIALLY DEFERRED` to survive the existing per-row upsert loop's transient swap states, which is more than a direct correction, and app-level `validateLayout` already fully covers this given it's the only write path. Route: **patch** (range check only).
- [blind-hunter] `handleMove` in `DashboardWidgetCustomizer.tsx` can leave the very button a keyboard user just activated `isDisabled` on the next render (moving a widget to the first/last row disables that row's now-irrelevant direction button), silently dropping focus with nothing focused afterward and no `aria-live` announcement. **Verdict: medium.** Confirmed by reading `handleMove`/the `isDisabled={index === 0}` / `isDisabled={index === sorted.length - 1}` logic — this directly undermines the frozen boundary's explicit "keyboard-operable" requirement. Route: **patch**.
- [edge-case-hunter, blind-hunter] No coordination exists between `EventPlanningTab`'s 5s poll and `DashboardWidgetCustomizer`'s optimistic save/revert: (a) a poll response landing mid-save can flicker an optimistic change back to stale server state until the next poll; (b) a failed save's whole-array revert (`onLayoutChange(previousLayout)`) can wipe a second, still-pending optimistic change made in the interim — unlike the claimed-equivalent `EventChecklist.handleToggle`, which reverts only its own single item. **Verdict: medium** (real, user-visible during active customization, self-healing within 5s, no server-side data loss, but caused by this diff's new parent/child poller-vs-optimistic-actor split, which none of the single-component polling widgets have). Route: **patch** (add a pending-save guard so the poll skips applying its result while a customize-mode save is in flight; also soften the Implementation Notes' "mirrors EventChecklist's handleToggle shape" claim to note the scope difference).
- [edge-case-hunter] `EventPlanningTab`'s `fetchLayout` accepts any non-empty array from the endpoint without validating it's exactly the 5 expected widgets with recognized keys before calling `setLayout`. **Verdict: low** (the DB `CHECK` constraint already prevents an invalid `widget_key` from ever being written, and `updateWidgetLayout`'s `validateLayout` requires exactly 5 entries on every write path, so this is defense-in-depth against a scenario with no current path to trigger it). Route: **patch** (trivial to add alongside the other fixes).
- [edge-case-hunter] `validateLayout` allows a payload that sets `visible: false` on all 5 widgets, leaving the Dashboard's `VStack` completely empty with no explanatory state — not listed in the spec's I/O matrix. **Verdict: medium** (a real, plausible UX trap — a member clicking "hide" repeatedly during customize mode has no guardrail). Route: **patch** (render a lightweight explanatory message in `EventPlanningTab` when the visible list is empty, rather than restricting the underlying action).
- [edge-case-hunter] `EventPlanningTab.test.tsx`'s rewrite mocks every widget as a bare `data-testid` stub and no longer asserts `eventId`/`groupId` are correctly passed through to each, unlike the pre-13.4 suite's fetch-URL assertions it replaced. **Verdict: low.** Confirmed — a prop-wiring bug (e.g. swapped `eventId`/`groupId`) would no longer be caught by this suite. Route: **patch** (have the stubs render/assert their received props).
- [blind-hunter] `EventPlanningTab` never consults `useAuth()`'s `isLoading`/`isAuthenticated`, only `accessToken` truthiness — an expired/refresh-failed session could show an indefinite "Loading dashboard..." spinner. **Verdict: low.** Confirmed identical to `EventChecklist.tsx`'s own `if (!accessToken) return` gate (same file, same shape) — pre-existing, app-wide, not introduced by this story. Route: **defer**.
- [blind-hunter] No concurrency/conflict handling on the shared per-group layout — `PATCH` is a full-replace with no version/timestamp check, so two members customizing simultaneously silently last-write-wins. **Verdict: low** (bounded — no data corruption, self-heals on the next poll — and no versioning/conflict pattern exists anywhere in this codebase to build the correct fix on, making a proper fix more than a direct correction). Both auto-reject conditions met (unlikely in everyday use, given customize mode is already an infrequent action, and the correct fix is non-trivial) — **rejected**, but recorded since a real scenario could surface it.
- [blind-hunter] Spec's own `status` frontmatter (currently `in-review`) "disagrees" with `sprint-status.yaml`'s tracking state. **Verdict: false.** Same documented, expected mid-workflow lag already established in `13-2`/`13-3`'s own Review Triage Logs: sprint-status only syncs to `review` during step-05.
- [blind-hunter] `DashboardWidgetCustomizer.saveLayout` calls `response.json()` unconditionally on a non-OK response, which would throw a raw parse error into the toast if the server ever returns a non-JSON error body (e.g. a 502/504 HTML page). **Verdict: false.** Confirmed identical to `EventChecklist.handleToggle`'s established pattern (same unconditional `.json()` on `!response.ok`) — the spec's Design Notes explicitly directed mirroring that exact shape; not a new defect.
- [blind-hunter] `ALTER TABLE group_dashboard_widgets ENABLE ROW LEVEL SECURITY;` with no policies defined, undocumented. **Verdict: false.** Matches the established app-wide convention (e.g. `021_create_event_poll_votes_table.sql` does the same) — the app connects via a privileged `pg` role that bypasses RLS (confirmed via `lib/db/client.ts` and verification-gap's independent check), so this isn't a gap unique to this table.
- [blind-hunter] `await Promise.resolve(params)` in the new route is redundant versus `await params`. **Verdict: false.** Matches the exact precedent in `app/api/groups/[groupId]/events/[eventId]/checklist/route.ts` — the file this story's own Code Map cited as the GET/PATCH structural template — even though a *different* sibling route uses the plain form; both conventions already coexist in this codebase, so this isn't a new inconsistency.
- [blind-hunter] Spec's Tasks line claims the new tests "cover the matrix: ... empty-but-visible widget," but no test in this diff asserts that. **Verdict: false.** That matrix row describes behavior 13.4 deliberately never touches (per its own "Never: do not change any individual widget's internal behavior" boundary) and which each widget's own pre-existing suite already covers (e.g. `EventChecklist.test.tsx`'s "No checklist items yet." case, untouched by this diff); the only available "fix" would be editing this spec's task wording, which triage explicitly excludes from action.

## Design Notes

"Customize mode" is a dashboard-level toggle (a new `IconButton`, mirroring the existing per-item `EditIcon` pattern) rather than a separate settings page or modal — consistent with this epic's "no separate flow, upgrade in place" philosophy already established by Story 13.1's login-in-place pattern. While in customize mode, every visible widget card shows inline move-up/move-down/hide controls; there is no drag-and-drop, per the epic's explicit keyboard-operable requirement.

## Verification

**Commands:**
- `npx jest __tests__/services/dashboardWidgetsService.test.ts __tests__/components/EventPlanningTab.test.tsx __tests__/components/DashboardWidgetCustomizer.test.tsx "app/api/groups/[groupId]/dashboard-widgets/__tests__/route.test.ts"` -- expect all passing
- `npx eslint components/groups/EventPlanningTab.tsx components/groups/DashboardWidgetCustomizer.tsx lib/services/dashboardWidgetsService.ts` -- expect no new error classes vs baseline
- `npm run build` -- expect the same pre-existing, unrelated baseline failure (`app/api/user/invitations/route.ts:55`), not a new one

**Results (2026-09-23):**
- All 3 target suites pass: 19/19 tests (`dashboardWidgetsService.test.ts` 9, `EventPlanningTab.test.tsx` 4, `DashboardWidgetCustomizer.test.tsx` 6).
- ESLint on the 3 target files plus the new route/util file: only pre-existing error classes (`@typescript-eslint/no-explicit-any` in catch blocks, `react-hooks/set-state-in-effect` in the polling-init effect) -- confirmed identical classes already present in `EventChecklist.tsx`/`eventChecklistService.ts`, the precedent these files mirror.
- `npm run build`: fails at the same pre-existing `app/api/user/invitations/route.ts:55` TS error, nothing new.
- Full `npx jest` run: 421 failed / 3189 passed with changes vs. 421 failed / 3172 passed on baseline (`git stash`) -- identical failure count, so zero regressions; the 17 extra passing tests are this story's new suites plus one revived assertion.
- One pre-existing test needed a compatible update (not a regression, a mock gap): `__tests__/components/EventDetail.test.tsx`'s generic fetch fallback answered any unmatched URL with `data: []`; once it also started matching the new `/dashboard-widgets` GET, that emptied the whole dashboard in the test. Updated its fallback to answer `/dashboard-widgets` with a realistic default 5-widget layout.

**Results, round 2 (2026-09-23, addressing Review Triage Log findings above) -- scoped to touched files only, per reviewer instruction:**
- New `app/api/groups/[groupId]/dashboard-widgets/__tests__/route.test.ts`: 9/9 passing (GET 401/403/200/500, PATCH 401/400/403/400/200).
- `__tests__/components/EventPlanningTab.test.tsx` (updated stubs + prop-passthrough assertion): passing.
- `__tests__/components/DashboardWidgetCustomizer.test.tsx`, `__tests__/services/dashboardWidgetsService.test.ts`: passing, unaffected by these changes.
- Full-suite `npx jest`/`npm run build` re-verification deferred to the reviewer per their instruction to scope this pass to edited files only.
