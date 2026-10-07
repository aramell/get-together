---
title: '14-8 Terminology and Copy Neutralization'
type: 'feature'
created: '2026-10-07'
status: 'done'
route: 'dispatch'
baseline_commit: '65ac5bba13acc95c19378cc8ed9f9220a637a246'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Dinner event still shows trip wording ("Loading trip details...", a campsite placeholder), and its section headings ignore the labels the Dinner preset already stores (14.7 left them unrendered).

**Approach:** Widget headings read the event type's `labels` through one helper and a React context, falling back to the registry label. Both dashboards provide the context from the event's `event_type`. Remaining hard-coded trip wording is made neutral.

## Boundaries & Constraints

**Always:** Resolution is `preset.labels[widgetKey]`, else the widget registry label, so a null or Trip event renders exactly today's text. The member and public views show identical headings. Widgets rendered outside a provider fall back to registry labels. The public API never returns `group_id`. Logistics category headings keep coming from category data.

**Never:** Add per-event label editing, new label keys, widget types, migrations, or schema changes. Do not change preset content. Do not restyle UI. Do not change `aria-label`s on item inputs or Trip's wording.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dinner | `event_type: 'dinner'` | Headings "To do", "Schedule", "Who brings what" | N/A |
| Trip or none | `trip` or null | Today's headings | N/A |
| Unknown or retired type | Key not in registry | Registry labels | N/A |
| Guest view | Public link to a Dinner event | Same headings as members; payload has `event_type`, no `group_id` | N/A |
| No provider | Widget rendered alone | Registry labels | N/A |
| Loading | Public view fetching | "Loading details..." | N/A |

</frozen-after-approval>

## Code Map

- `lib/events/eventTypes.ts` -- add `getWidgetLabel(eventType, widgetKey)`; `labels` already hold the values (keep client-safe).
- `lib/dashboard/widgetRegistry.ts` -- `getWidgetDefinition(key).label` is the fallback.
- `components/groups/EventLabelsContext.tsx` -- new: provider taking `eventType`, hook `useWidgetLabel(key)` defaulting to registry labels.
- `components/groups/EventChecklist.tsx`, `EventTimeline.tsx`, `EventLogistics.tsx`, `EventPolls.tsx`, `EventPhotoGrid.tsx` -- replace each hard-coded h2 (member and guest renders, e.g. Checklist lines ~436 and ~487) with the hook.
- `components/groups/EventPlanningTab.tsx` and `PublicEventPlanning.tsx` -- read `event_type` from the layout response, wrap widgets in the provider; change "Loading trip details..." to "Loading details...".
- `components/groups/DashboardWidgetCustomizer.tsx` (~line 185) and `EventTypePicker.tsx` (~line 17) -- use the event type's label for widget names.
- `app/api/groups/[groupId]/events/[eventId]/dashboard-widgets/route.ts` and `app/api/events/public/[publicToken]/dashboard-widgets/route.ts` -- return `event_type`; `getEventByPublicToken` in `lib/db/queries.ts` (~line 1481) must select it; the member side needs a lookup in `dashboardWidgetsService.ts`.
- `components/groups/CreateEventModal.tsx` (~line 247) -- neutral location placeholder; `app/events/public/[publicToken]/page.tsx` (~line 240) -- neutral comment.
- Tests: new for the helper and context; extend the two route tests and the widget heading tests.

## Tasks & Acceptance

**Execution:**
- [x] `lib/events/eventTypes.ts`, `components/groups/EventLabelsContext.tsx` -- helper, provider, hook -- single source of wording
- [x] Five widget components -- headings via hook -- the visible change
- [x] Both dashboard routes, `queries.ts`, `dashboardWidgetsService.ts`, both planning components -- deliver `event_type` and provide it -- member/guest parity
- [x] Customizer, picker, modal placeholder, loading text, comment -- neutral copy -- no leftover trip wording
- [x] Tests -- every matrix row

**Acceptance Criteria:**
- Given an event created from the Dinner preset, when its dashboard loads, then no heading or loading text mentions trips and headings match the Dinner labels.
- Given a Trip or pre-existing event, when its page loads, then nothing differs.
- Given the Dinner preset's labels are edited in code, when an existing Dinner event loads, then headings follow the registry (labels are read live; layout and categories stay copied).

## Implementation Notes

Implemented by a subagent from this spec; four review patches applied. Widget headings come from `getWidgetLabel` through `EventLabelsProvider`; both dashboard routes return `event_type` (member side via a small `getEventTypeKey` lookup per poll). No migration. Verification: tsc errors unchanged at 706; targeted suites pass (a Timeline/Polls failure seen once under load did not reproduce, and Polls comment tests already failed on the baseline); lint adds only `no-explicit-any` in the existing catch-block style.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| No member-side test that `EventPlanningTab` provides labels to widgets (verification-gap) | medium | patch | Widget stubs in its test never call `useWidgetLabel`; removing the provider would pass every test. |
| Member Timeline and Logistics headings never asserted with a Dinner provider (verification-gap) | medium | patch | Only Checklist has a provider test; reverting those headings to literals passes all tests. |
| `getEventTypeKey` calls `getClient()` outside its try, so a pool error returns 500 despite the docstring (edge) | low | patch | `getClient()` sits before `try`; moving it inside is a direct correction. |
| Public route test asserts `not.toContain('g1')` on stringified body (blind, edge) | low | patch | Substring check is brittle; assert on keys instead. |
| Polling resets `eventType` to null when the lookup fails or field is missing, so headings can flip (blind, edge) | low | reject | Needs a transient DB error; fix adds a branch in two components. |
| Extra DB client per 5s member poll (blind) | low | reject | One small indexed query; folding it into the layout call is a refactor. |
| Provider wrapper not re-indented (blind) | low | reject | Cosmetic; the repo has no prettier config. |
| Empty-string preset label renders empty heading (edge) | false | reject | Labels are code constants, all non-empty. |
| Retired type key exposed to guests (edge) | low | reject | Keys are not sensitive; rendering falls back safely. |
| Unknown widget key crashes `getWidgetLabel` (edge) | false | reject | `WidgetKey` is typed; same exposure existed before. |
| Trip or null text may differ from old literals (edge claim) | false | reject | Registry labels are exactly Photos, Checklist, Timeline, Logistics, Polls. |
| Trip wording left in empty states, toasts, aria-labels (blind, edge claim) | false | reject | Grep found no trip wording in widgets; the logistics empty text applies only to the default Bring List category. |
| Trip/null and unknown-type rows lack component-level tests on the public view (edge) | low | reject | Covered at helper and no-provider level; same code path. |
| Placeholder change untested; context named "labels" holds a type key; group-scope customizer labels; empty spec sections; status mismatch (blind) | low | reject | Polish or process notes with no named harm. |
| Polls and Photos headings untested (verification-gap) | low | reject | Preset labels for them equal the registry labels, so a regression would show no difference today. |

## Design Notes

Labels are read live from the registry, unlike layout and categories, which 14.7 copies. This follows the 14.7 decision that labels are "stored in the preset and exposed from the registry only", so a retired type falls back to registry labels instead of failing.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: error count not above baseline (706 pre-existing)
- `npx jest --testPathPatterns "eventType|EventLabels|dashboard-widgets|EventPlanningTab|PublicEventPlanning|EventChecklist|EventTimeline|EventPolls|EventLogistics|EventPhotoGrid"` -- expected: no new failures beyond baseline
- `npm run lint` -- expected: no new errors

### Review Findings

Code review of commit c4fbe68 (2026-10-07). Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor.

- [x] [Review][Patch] Customizer shows the current event's type labels in "All events in this group" scope — use registry labels when scope is `group` (decision: option 2) [components/groups/DashboardWidgetCustomizer.tsx:189]
- [x] [Review][Patch] No service-level test for `getEventTypeKey` [lib/services/dashboardWidgetsService.ts:216-237] — the route test mocks the whole service module, so the SQL, the null fallback on error and client release are never executed. Add tests to `__tests__/services/dashboardWidgetsService.test.ts`: returns the row's `event_type`; null for no rows or null column; null and client released when `query` throws; null when `getClient` rejects.

#### Rejected

- Dinner headings flip to registry labels for one poll cycle when `getEventTypeKey` fails (4 layers; `EventPlanningTab.tsx:51`, `PublicEventPlanning.tsx:53`) — `low`: real but needs a transient DB error right after a successful layout read, self-heals on the next 5s poll, and the fix adds a distinct failure signal plus client branches. Already rejected in the Review Triage Log.
- Extra pooled client per member poll; suggested `Promise.all` (`dashboard-widgets/route.ts:79`) — `low`: sequential order is intentional (the doc comment says membership is verified first), so `Promise.all` would query for non-members; folding it into `getEventWidgetLayout` is a refactor for a small cost.
- Public route sends raw `event.event_type` to guests (`public/.../dashboard-widgets/route.ts:53`) — `low`: type keys are internal labels like `dinner` and unknown keys already fall back to registry labels, so there is no secret to leak.
- `??` lets an empty preset label through (`eventTypes.ts:141`) — `false`: preset labels are code constants and none is empty.
- Possible orphaned member route, so the provider never reaches live widgets — `false`: `app/groups/[groupId]/events/[eventId]/page.tsx:69` renders `EventDetail`, which renders `EventPlanningTab` (`EventDetail.tsx:323`). The orphaning noted during Story 13.1 planning no longer holds.
- Other trip wording left in widgets — `false`: grep for "trip" across the widget, planning-tab and `CreateEventModal` components returns nothing.
- `getEventByPublicToken` selecting `event_type` is verified only through mocks — `low`: same mock boundary as the repo's other query tests; closing it needs a new DB-level test pattern.
- Missing component tests for the Trip/unknown matrix rows, Dinner Polls/Photos headings and the `CreateEventModal` placeholder — `low`: the helper and provider tests cover those rows, and Polls/Photos labels equal the registry labels today, so no regression would be observable.
- New route test file instead of extending the existing ones; spec `status: done` vs sprint `review`; empty Spec Change Log; provider wrapper not re-indented; unresolved flaky Timeline/Polls test "under load" — `low`: process or cosmetic only, or fixed by editing the spec. The flaky test is unverified, and would only be `low` if real.
