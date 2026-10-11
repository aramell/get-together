---
title: '14-1 Widget Registry'
type: 'refactor'
created: '2026-10-06'
status: 'done'
baseline_commit: '289ebcd200753a82b5ffe59af71d8edaed448aa1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The dashboard's widget set is hard-wired in five places (DB CHECKs on `widget_key`/`position`, `WIDGET_KEYS`/`WIDGET_LABELS` constants, two duplicated `WIDGET_COMPONENTS` maps, service validation, client response validation). Adding any widget type means touching all of them, which blocks the Epic 14 flexibility work.

**Approach:** Introduce a single code registry (key, label, renderer, commentable flag, public-view flag) that the dashboard, customizer, public view, layout service and route validation all read from. Drop the two CHECK constraints so keys and positions are validated in application code. Behavior-preserving: no visible change.

## Boundaries & Constraints

**Always:** Same five widgets, same default order, same labels, same API response shape (`{widget_key, position, visible}[]`). Registry metadata (keys, labels, flags, default order) stays client- and server-safe, with no DB or component imports; renderers live in a separate client-side map. Existing tests keep passing, adjusted only where they assert the old constants or the "exactly 5" rule.

**Never:** Add instance identity, per-event layout, per-widget title override, new widget types, or any UI change (all later Epic 14 stories). Do not apply the migration to any database. Do not touch comment tables or components (14.2).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default layout | Group with no rows | Registry default order, all visible (identical to today) | N/A |
| Valid PATCH | Every registry widget once, unique positions 1..N | Persisted, full layout returned | N/A |
| Unknown key | `widget_key` not in registry | Rejected | 400 `VALIDATION_ERROR`, `INVALID_WIDGET_LAYOUT` |
| Bad positions | Duplicate, non-integer, or outside 1..N | Rejected | Same 400 |
| Missing/duplicate widget | A registry widget absent or repeated | Rejected | Same 400 |
| Stored key not in registry | DB row with a key the registry no longer knows | Skipped on read (not rendered) | Client keeps current state if response invalid |

</frozen-after-approval>

## Code Map

- `lib/utils/dashboardWidgets.ts` -- current constants, `isWidgetKey`, `defaultWidgetLayout`, `isValidWidgetLayoutResponse`; becomes the registry-backed metadata module (or re-exports from `lib/dashboard/widgetRegistry.ts`).
- `lib/services/dashboardWidgetsService.ts` -- `getWidgetLayout`, `updateWidgetLayout`, `validateLayout` (hard-codes `WIDGET_KEYS.length` and 1..5 range); derive from registry.
- `components/groups/EventPlanningTab.tsx:23` and `components/groups/PublicEventPlanning.tsx:35` -- duplicated `WIDGET_COMPONENTS` maps; replace with one client-side renderer map keyed by registry key.
- `components/groups/DashboardWidgetCustomizer.tsx:115` -- reads `WIDGET_LABELS`; switch to registry label.
- `app/api/groups/[groupId]/dashboard-widgets/route.ts`, `app/api/events/public/[publicToken]/dashboard-widgets/route.ts` -- call the service only; update doc comments saying "5 widgets".
- `lib/db/migrations/033_create_group_dashboard_widgets_table.sql` -- source of the two CHECKs; do not edit, add a new migration (next number is 036).
- `__tests__/services/dashboardWidgetsService.test.ts`, `__tests__/components/{EventPlanningTab,DashboardWidgetCustomizer,PublicEventPlanning,EventDetail}.test.tsx`, `app/api/**/dashboard-widgets/__tests__/route.test.ts` -- existing coverage to keep green.

## Tasks & Acceptance

**Execution:**
- [x] `lib/dashboard/widgetRegistry.ts` -- create registry: per widget `key`, `label`, `commentable` (checklist, logistics true; photos, timeline, polls false for now), `publicView` (all true), plus `DEFAULT_WIDGET_ORDER`; helpers `isWidgetKey`, `getWidgetDefinition`, `defaultWidgetLayout` -- single source of truth
- [x] `lib/utils/dashboardWidgets.ts` -- re-point constants and helpers to the registry; make `isValidWidgetLayoutResponse` registry-driven rather than `length === 5` -- keeps existing imports working
- [x] `lib/services/dashboardWidgetsService.ts` -- validate against registry (all registry widgets exactly once, positions a permutation of 1..N); skip unknown stored keys on read -- removes hard-coded 5
- [x] `components/groups/widgetRenderers.ts(x)` -- one client-side map from registry key to component for member and guest props; use from `EventPlanningTab` and `PublicEventPlanning` -- removes the duplicated maps
- [x] `components/groups/DashboardWidgetCustomizer.tsx` -- label from registry
- [x] `lib/db/migrations/036_drop_dashboard_widget_checks.sql` -- drop the `widget_key` and `position` CHECKs on `group_dashboard_widgets` (look up constraint names; use `IF EXISTS`) -- application code now validates
- [ ] Tests -- registry unit tests (defaults, flags, unknown key); update service/route/component tests for the new validation errors and unknown-key skip

**Acceptance Criteria:**
- Given a group with no layout rows, when the dashboard loads, then the five widgets render in today's order with today's labels.
- Given the registry lists a widget, when it is added to the registry and renderer map only, then layout validation, customizer and both dashboards accept it with no other code edit.
- Given migration 036, when it runs on a database with migration 033 applied, then inserting a `widget_key` outside the old set and a `position` above 5 succeeds at the DB level.
- Given the public link, when it loads, then it renders the same widgets in the same order as the member dashboard.

## Implementation Notes

- Registry exports `validateWidgetLayout`, shared by the service and the client response check (client check is now stricter: unique positions in 1..N, not just length 5; server always returns valid data).
- `lib/utils/dashboardWidgets.ts` kept as a re-export shim so existing imports work; unused `WIDGET_LABELS` removed (customizer uses `getWidgetDefinition`).
- One shared `WIDGET_RENDERERS` map (`components/groups/widgetRenderers.ts`) with a props type covering member and guest renders; all five widgets already accept the same optional props.
- Migration 036 also widens `widget_key` from VARCHAR(20) to VARCHAR(50) so registry keys are not silently capped (small addition beyond the two CHECK drops). Not applied to any DB and not run against Postgres here; the constraint lookup is by `pg_get_constraintdef`.
- Verification: new `__tests__/lib/widgetRegistry.test.ts`, unknown-key skip test in the service test; related suites pass (68 + 21). Full jest run has the same pre-existing failing suites before and after (timing-related), tsc error count unchanged at 706, pre-existing lint errors only.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| `getWidgetLayout` returns partial/gapped layout that the client validator rejects; registry growth breaks existing groups (blind, edge, gap, AC claim) | medium | patch | Reproduced by reading: 5 stored rows + a 6th registry widget fails client length check and PATCH. Fixed with `reconcileWithRegistry` (drop unknown, append missing, renumber) plus tests. |
| Client validator stricter than before (unique positions) | low | patch (resolved) | Server now always returns a 1..N permutation, so the stricter check cannot reject server data. |
| Service test pins the 1-element result | medium | patch | Test rewritten to the reconciled contract; added all-unknown fallback test. |
| No test that every key has a renderer / keys unique / fit VARCHAR(50) | low | patch | Added to `widgetRegistry.test.ts`. |
| Stale comments (13.4 header, "5 real widget") | low | patch | Fixed. |
| Migration `ILIKE` could drop unrelated CHECKs | false | reject | Migration 033 defines exactly two CHECKs on this table (widget_key, position); no others exist. |
| No rollback migration; varchar widening locks table | false | reject | Repo has no down migrations; widening VARCHAR in Postgres is metadata-only. |
| `getWidgetDefinition` non-null assertion / renderer undefined | low | reject | Layout is now reconciled to registry keys server-side; guard would add branches for an unreachable state. |
| `publicView`/`commentable` flags have no consumer | low | defer | Spec requires the flags exist; consumers come with 14.3/14.4 and any non-public widget. |
| `WidgetRendererProps` all-optional loses member/guest type distinction | low | defer | Widget components already declared these props optional before this change. |
| Migration 036 not run against Postgres | maybe-false | defer | Needs a DB to verify. |

## Design Notes

Instance identity ("two widgets of one kind") is deliberately deferred to 14.5, where the Add-widget control and per-event table need it; adding it now would change the API shape for no visible benefit. This story keeps `UNIQUE(group_id, widget_key)`.

The Epic 14 architecture addendum (decisions 14a-14e) is still pending the architect; this spec follows decision 14a as written in the sprint change proposal, all marked `[ASSUMPTION]`.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: no type errors
- `npx jest __tests__/services/dashboardWidgetsService.test.ts __tests__/components app/api --testPathPattern "dashboard|Widget|EventPlanning|EventDetail"` -- expected: all pass
- `npm run lint` -- expected: no new errors

### Review Findings

Code review 2026-10-09 of commit `ebc16cc` (diff `289ebcd..ebc16cc`), four layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor. All four ACs hold in code; AC3 (the migration) was never run.

- [x] [Review][Patch] `updateWidgetLayout` returns `reconcileWithRegistry(result.rows)` but no test pins it; the success test mocks an already-valid layout, so reverting the reconcile still passes. Add a case whose final SELECT includes a retired key and expects a reconciled full layout [`__tests__/services/dashboardWidgetsService.test.ts`, `lib/services/dashboardWidgetsService.ts:138`]
- [x] [Review][Patch] Stale "5 widgets" doc comment left in the group dashboard-widgets route (Code Map item not done) [`app/api/groups/[groupId]/dashboard-widgets/route.ts:9`]
- [x] [Review][Patch] Stale "Blocked on the Epic 14 architecture addendum" comment in sprint tracking while Epic 14 is `in-progress` and all stories are built [`sprint-status.yaml:185`]
- [x] [Review][Defer] `publicView` (and `commentable`) flag has no consumer; a future widget with `publicView: false` would still render for guests in `PublicEventPlanning` [`lib/dashboard/widgetRegistry.ts`] — deferred: already in the spec's triage log; fix when the first non-public widget is added
- [x] [Review][Defer] Open item from `epic-14-context.md` has no owner: confirm migrations 033-035 (and now 036) are applied to production before this code deploys — deferred: needs a human with production access; migration 036 has never been run, so AC3 is unverified (unverified severity: high if the CHECK-drop fails)

#### Rejected

- `false` Duplicate `widget_key` rows break `reconcileWithRegistry`: migration 033 has `UNIQUE(group_id, widget_key)`, so duplicates cannot exist.
- `false` `visible` null/undefined in stored rows: the column is `BOOLEAN NOT NULL DEFAULT true`.
- `false` Renumbered layout collides with a hidden stale row on a position UNIQUE: no UNIQUE exists on position, only on `(group_id, widget_key)`.
- `false` Migration `ILIKE` could drop an unrelated CHECK: 033 is the only migration defining CHECKs on this table (grep of all migrations), and it has exactly the two.
- `false` `WIDGET_RENDERERS[key]` undefined crashes the dashboard: layouts are always reconciled/validated to registry keys first.
- `false` Customizer `getWidgetDefinition(...)!` throws on an unknown key: the key is typed `WidgetKey` and layouts are reconciled.
- `false` Registry tests break when a widget is added: tests pass at HEAD after 14.9 added a sixth widget.
- `low` Stale tab rejects polled layouts after a deploy adds a widget: self-heals on reload; a tolerant validator adds branching for a rare window.
- `low` `ALTER COLUMN TYPE` lock / no `lock_timeout`: tiny table, one-time migration.
- `low` Migration widens `widget_key` to VARCHAR(50): disclosed in Implementation Notes and harmless.
- `low` Stale client gets generic 400 instead of a distinct 409: adds a new error contract for a rare case.
- `low` `WidgetRendererProps` all-optional: props were already optional on the widgets before this change (see Triage Log).
- `low` Shim re-export and two import paths for registry: blurs nothing observable; shim is temporary.
- `low` Stricter client validator and changed "missing widget" error text: disclosed, covered by server reconcile.
- Spec bookkeeping (Tests task unchecked, status/I-O matrix/"behavior-preserving" wording, `tsc` 706 baseline): fix is to edit the spec under review; rejected.

#### Second pass (2026-10-11, uncommitted review-patch diff)

Four layers reviewed the uncommitted diff that applies the patches above. 0 decision-needed, 2 patch, 0 new defer, 7 rejected.

- [x] [Review][Patch] New reconcile test asserts only length, positions, no retired key and `data[0]`; it does not pin the gap-filled entries (`visible: true`, registry order). Replace with a full `toEqual` of the expected layout [`__tests__/services/dashboardWidgetsService.test.ts:155-162`]
- [x] [Review][Patch] Stale "5 widgets" wording remains (registry has 6): customizer doc comment, test title, route-test error string [`components/groups/DashboardWidgetCustomizer.tsx:32`, `__tests__/services/dashboardWidgetsService.test.ts:175`, `app/api/groups/[groupId]/dashboard-widgets/__tests__/route.test.ts:111`]

##### Rejected (second pass)

- `false` Sprint-status comment patch is "checked but not in the diff": `sprint-status.yaml` is unmodified and no longer contains "Blocked on the Epic 14"; it was already gone at HEAD.
- `low` once-value queue could leak between tests (`clearAllMocks` keeps once-queues): the new test consumes exactly the values it queues; no leak shown. A guard adds config.
- `low` out-of-order stored positions untested: not reachable by a demonstrated failure; the fix is a new test case.
- `low` final SELECT after COMMIT not asserted: queue-order mocks; marginal.
- Spec bookkeeping (Tests task unchecked, circular "rejected" wording, `tsc` baseline, shim removal condition, "Same five widgets" wording): fix edits the spec under review.
- AC3 migration 036 never run, no owner: already recorded as a deferral in the first pass above and in `deferred-work.md`; not re-filed.
- `false` `publicView`/`commentable` have no consumer: already deferred above.
