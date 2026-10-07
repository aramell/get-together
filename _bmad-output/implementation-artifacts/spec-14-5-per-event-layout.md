---
title: '14-5 Per-Event Layout'
type: 'feature'
created: '2026-10-07'
status: 'done'
baseline_commit: 'f118107666e9fd1a53a9e86a3d6885b82d189e14'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The dashboard layout is stored per group only, so every event in a group shows the same widgets in the same order. A dinner and a trip in one group cannot differ.

**Approach:** Add an `event_dashboard_widgets` table (same shape as the group table plus `event_id`, cascade delete). An event gets rows only once customized. Layout resolves event override, then group default, then system default (the preset step arrives in 14.7). Customize mode asks "This event only" or "All events in this group", and an event with its own layout shows "Customized for this event" with "Reset to group default". The no-login view resolves the same way.

## Boundaries & Constraints

**Always:** Any group member may change either layout, as the group layout works today. Events with no override render exactly as today. Existing `GET/PATCH /api/groups/:groupId/dashboard-widgets` stay unchanged. The first change in "This event only" saves the full visible layout as the event's rows. Scope defaults to "This event only" when the event is already customized, otherwise "All events in this group". Reset deletes the event's rows. Other viewers pick up changes on the existing ~5s poll. Same validation as the group layout (registry keys once each, positions 1..N).

**Never:** Add instance identity, per-widget titles, new widget types, event types or presets (14.7), or logistics categories (14.6). Do not apply the migration to any database. Do not change widget content, comments or voting.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No override | Event without rows | Group layout (or system default) returned, `customized: false` | N/A |
| Override exists | Event with rows | Event layout, `customized: true`; sibling events unaffected | N/A |
| Member saves | Valid full layout, scope "This event only" | Rows upserted for the event; group layout untouched | N/A |
| Group scope | Same save, scope "All events" | Existing group PATCH; event overrides untouched | N/A |
| Reset | Member resets an event | Event rows deleted; layout falls back to group | Reset with no rows succeeds |
| Public view | Token for an event with override | Event layout, read-only, no `group_id` leaked | Unknown 404, cancelled 410 |
| Bad layout | Unknown key, duplicates, bad positions | Rejected | 400 `VALIDATION_ERROR`, `INVALID_WIDGET_LAYOUT` |
| Non-member / wrong event | Not in group, or event not in group | Rejected | 403 `FORBIDDEN` / 404 `NOT_FOUND` |

</frozen-after-approval>

## Code Map

- `lib/db/migrations/038_create_event_dashboard_widgets_table.sql` -- new; model on 033 (UUID id, `widget_key VARCHAR(50)`, `position INT`, `visible`, timestamps, `UNIQUE(event_id, widget_key)`, RLS enabled, no CHECKs, `event_id` FK to `event_proposals` cascade). No backfill. Latest migration is 037.
- `lib/services/dashboardWidgetsService.ts` -- reuse `reconcileWithRegistry` and `validateWidgetLayout`. Add `getEventWidgetLayout(groupId, eventId)` (event rows, else group rows, else default; returns `customized`), `updateEventWidgetLayout(groupId, eventId, userId, changes)` (member check, event-in-group check, transactional upsert) and `resetEventWidgetLayout(groupId, eventId, userId)`. Leave `getWidgetLayout`/`updateWidgetLayout` unchanged.
- `app/api/groups/[groupId]/events/[eventId]/dashboard-widgets/route.ts` -- new GET (`{data, customized}`), PATCH (`{widgets}`), DELETE (reset); mirror `dashboard-widgets/route.ts` and the `polls/route.ts` params handling.
- `app/api/events/public/[publicToken]/dashboard-widgets/route.ts` -- switch from `getWidgetLayout(event.group_id)` to `getEventWidgetLayout(event.group_id, event.id)`; response shape unchanged.
- `components/groups/EventPlanningTab.tsx` -- fetch the event route, keep `customized` in state, show the "Customized for this event" badge with a "Reset to group default" button, pass `eventId` and `customized` to the customizer.
- `components/groups/DashboardWidgetCustomizer.tsx` -- add `eventId`, `customized`, `onReset`; scope radio ("This event only" / "All events in this group"); the save URL and method follow the scope. In "All events" scope, edit and display the group layout (fetched from the group route); switching scope reloads the matching layout. Keep move/hide behavior, optimistic revert and focus handling.
- `components/groups/PublicEventPlanning.tsx` -- no change expected (URL and shape unchanged).
- Tests to extend: `__tests__/services/dashboardWidgetsService.test.ts`, `app/api/events/public/[publicToken]/dashboard-widgets/__tests__/route.test.ts`, `__tests__/components/{EventPlanningTab,DashboardWidgetCustomizer}.test.tsx`; new route test beside `app/api/groups/[groupId]/dashboard-widgets/__tests__/route.test.ts`.
- Note: `EventPlanningTab` is only reachable through `components/groups/EventDetail.tsx` (see the orphaned-route finding); this story does not rewire the page.

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/038_create_event_dashboard_widgets_table.sql` -- create table per Code Map -- event override storage
- [x] `lib/services/dashboardWidgetsService.ts` -- event get/update/reset with resolution order and checks -- single resolution point for member and public views
- [x] `app/api/groups/[groupId]/events/[eventId]/dashboard-widgets/route.ts` -- GET/PATCH/DELETE -- member API
- [x] `app/api/events/public/[publicToken]/dashboard-widgets/route.ts` -- resolve via event -- public view matches member view
- [x] `components/groups/EventPlanningTab.tsx`, `components/groups/DashboardWidgetCustomizer.tsx` -- scope choice, customized indicator, reset -- UX from the epic
- [x] Tests -- service (resolution order, upsert transaction + rollback, reset, non-member, event not in group), both routes, UI (scope radio changes URL, badge and reset shown only when customized, group scope leaves event untouched)

**Acceptance Criteria:**
- Given two events in one group, when a member customizes one with "This event only", then the other still shows the group layout.
- Given an event with an override, when a member chooses "Reset to group default", then the event shows the group layout and the indicator disappears.
- Given a customized event, when a guest opens its public link, then widgets appear in the event's order with hidden ones omitted.
- Given a group with no overrides, when the dashboard loads, then nothing looks or behaves differently from before.

## Implementation Notes

Implemented by a subagent from this spec. Beyond the Code Map: `getEventWidgetLayout` takes an optional `userId` (member API enforces membership and event-in-group; the public route omits it because the event is resolved from its token), and the customizer has an optional `onCustomizedChange` prop so the badge appears right after the first "This event only" save. Migration 038 is not applied to any database and has not run against real Postgres; the service tests mock `getClient`. Verification: targeted jest 8 suites / 84 tests pass; tsc errors unchanged at 706. `--testPathPattern` is rejected by this Jest version; use `--testPathPatterns`.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| `onCustomizedChange` first-save behavior untested (verification-gap) | medium | patch | No test passed the prop. Added a customizer test: called with true on first event-scope save; not called in group scope or when already customized. |
| `updateEventWidgetLayout` test does not check bound params or returned data (verification-gap) | medium | patch | Count-only assertions. Test now asserts the photos INSERT params and that `data` equals the post-commit rows. |
| Radio group has no accessible label (blind) | low | patch | Added `aria-label="Layout scope"`; one-attribute fix. |
| Malformed JSON / null body gives 500 (edge, blind) | low | defer | Same behavior in the group dashboard-widgets route and others; pre-existing pattern. |
| Non-UUID event/group id gives 500 (edge, blind) | low | defer | Same as other item routes, already logged in earlier stories. |
| Scope state does not follow `customized` after reset/remote change (edge, blind) | low | reject | The radio still shows the scope the user chose, so the next edit does what it says; a fix adds an effect and state sync. |
| Stale revert after switching scope mid-save (edge, blind) | low | reject | Needs a failed save plus a scope switch inside the request window; the fix adds setter capture and complexity. |
| Post-commit SELECT failure reports failure although saved (edge) | low | reject | Same shape as `updateWidgetLayout`; the next poll corrects the UI. |
| Poll without `customized` hides the badge (edge) | low | reject | The server always returns the boolean; no reachable case. |
| Reset double-click / `isSavingRef` overlap with the customizer (edge, blind) | low | reject | DELETE is idempotent; worst case is a brief poll overwrite that matches the server state. |
| Misleading "change" message on GET denial (edge, blind) | low | reject | Cosmetic; message text is shared with existing tests. |
| Group-scope edit while event is customized gives no explanation; empty list while loading (blind, edge) | low | reject | UX polish beyond the spec; the badge already shows the event is customized. |
| Default scope "All events" could rewrite every event (blind) | false | reject | Spec decision recorded in the frozen block; keeps today's behavior. |
| Overrides limited to admins, no concurrency check, event status handling (blind) | false | reject | Spec says any member, matching the group layout; last-write-wins matches the existing group PATCH. |
| Migration lacks policy/GRANT/trigger/UNIQUE position/down script (blind) | false | reject | Mirrors migrations 033/036 and the app's table-owner connection. |
| Route test asserts hardcoded `customized`; redundant mock chain; dead ternary in tests (verification-gap, blind) | low | reject | Test tidiness only, no hidden defect. |
| Stray ROLLBACK before BEGIN (verification-gap, edge) | low | reject | Same pattern as `updateWidgetLayout`; `.catch` swallows it. |
| Doc comments and API docs not updated (blind) | low | reject | Cosmetic. |

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: error count not above baseline (706 pre-existing)
- `npx jest --testPathPattern "dashboard|Dashboard|EventPlanningTab|PublicEventPlanning|widgetRegistry"` -- expected: all pass
- `npm run lint` -- expected: no new errors
