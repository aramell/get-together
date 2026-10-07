---
title: '14-7 Event Types and Presets'
type: 'feature'
created: '2026-10-07'
status: 'done'
route: 'dispatch'
baseline_commit: 'd17db285903ca9f3b0ee6129951d0a445b1a4ee0'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every event starts with the same trip-shaped dashboard. A dinner or practice must be rearranged and relabeled by hand each time.

**Approach:** A code registry of event types (Trip, Dinner, Game night, Practice). A preset is data: ordered widget list, logistics categories, label overrides, starter checklist items. Creating an event with a type copies the preset's values into that event. A group admin can set a default event type that preselects the picker.

## Boundaries & Constraints

**Always:** `event_type` is nullable on `event_proposals` and validated against the registry. A null or Trip event behaves exactly as today (Trip's widgets equal the system default, so no rows are written). Applying a preset runs in the same transaction as the event insert; a failure rolls the event back. Widgets: copy the preset's layout into `event_dashboard_widgets` only when it differs from the system default and the group has no layout rows of its own (group default wins). Categories: copy the preset's into the group's `logistics_categories` only when the group has no rows (never customized); otherwise leave them. Starter items become `event_checklist_items` created by the event creator. Later preset edits never change existing events. Label overrides are stored in the preset and exposed from the registry only. The wishlist-to-event conversion uses the group's default type, if any. Only group admins set the group default (`groups.default_event_type`, nullable, validated, null clears). The picker preselects the group default, else Trip.

**Never:** Render label overrides anywhere (14.8). Add widget types, per-event categories, or user-defined presets. Do not rename or restyle existing UI beyond the picker and the group setting. Do not apply the migration to any database.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No type | `event_type` omitted | Event as today; no extra rows | N/A |
| Dinner, fresh group | Type `dinner`, no group layout or categories | Event stores type; event layout rows, group categories and starter items written | N/A |
| Group has layout | Type `dinner`, group layout rows exist | Widgets not copied; categories and starter items still apply per rules | N/A |
| Group has categories | Group already customized | Categories untouched | N/A |
| Trip | Type `trip` | Type stored; no layout rows | N/A |
| Unknown type | `event_type: 'rave'` | Rejected, nothing written | 400 `VALIDATION_ERROR` |
| Preset step fails | Insert error mid-apply | Whole creation rolled back | 500 `INTERNAL_ERROR` |
| Default type | Admin sets `dinner`, then null | Stored, then cleared; picker preselects accordingly | Non-admin 403; unknown 400 |
| Conversion | Wishlist converted, group default `dinner` | Event created with that type applied | N/A |

</frozen-after-approval>

## Code Map

- `lib/db/migrations/040_add_event_types.sql` -- new; `event_proposals.event_type VARCHAR(30)` and `groups.default_event_type VARCHAR(30)`, both nullable, no CHECKs. Latest is 039.
- `lib/events/eventTypes.ts` -- new registry, client-safe: `EVENT_TYPES` (key, label, description, widgets, categories, labels, starterItems), `isEventTypeKey`, `getEventType`. Widgets use `lib/dashboard/widgetRegistry.ts` keys; categories use the `mode` type from `lib/logistics/defaultCategories.ts`. Trip: default layout, default categories, no starters.
- `lib/services/eventTypePresetService.ts` -- new; `applyEventTypePreset(client, event, userId)` doing the three copies above with the existing client inside the caller's transaction. Reuse `defaultWidgetLayout`/`validateWidgetLayout` and the key generation from `lib/services/logisticsCategoriesService.ts`.
- `lib/services/eventService.ts` (`createEvent`) and `lib/services/wishlistService.ts` (convert, ~line 646) -- accept `event_type`, insert it, wrap in BEGIN/COMMIT with the preset call. Extend `eventCreateSchema` and the `EventProposal` type with `event_type`.
- `app/api/groups/[groupId]/events/route.ts` and `app/api/groups/[groupId]/route.ts` -- pass `event_type`; PATCH accepts `default_event_type` (admin only), GET returns it. Update `updateGroupSettings` in `lib/services/groupService.ts` and the group query/type.
- `components/groups/CreateEventModal.tsx` -- add `EventTypePicker` (new, `components/groups/EventTypePicker.tsx`): radio cards with a preview of widgets, categories and starter items; send `event_type`.
- `components/groups/AdminGroupSettings.tsx` -- default event type select beside `PlanningStyleSetting` pattern (new `DefaultEventTypeSetting.tsx`).
- Tests: new for registry, preset service (each rule in the matrix, rollback), picker, setting; extend event service, wishlist convert, create-event route and `CreateEventModal` tests.

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/040_add_event_types.sql`, `lib/events/eventTypes.ts` -- schema and registry -- source of truth
- [x] `lib/services/eventTypePresetService.ts` -- apply rules transactionally -- one place for preset copying
- [x] `lib/services/eventService.ts`, `lib/services/wishlistService.ts`, event and group routes, `groupService.ts` -- accept and persist types, group default -- API
- [x] `components/groups/EventTypePicker.tsx`, `CreateEventModal.tsx`, `DefaultEventTypeSetting.tsx`, `AdminGroupSettings.tsx` -- picker and setting -- UX
- [x] Tests -- every matrix row, plus UI (preselect, preview text, admin-only setting)

**Acceptance Criteria:**
- Given a group with no customization, when a member creates a Dinner event, then its dashboard shows the Dinner widgets in order, with starter checklist items present.
- Given a group with a customized layout, when a Dinner event is created, then the event shows the group's layout.
- Given an existing event created before this change, when its page loads, then nothing differs.
- Given the Dinner preset is edited in code later, when an existing Dinner event loads, then it is unchanged.

## Implementation Notes

Implemented by a subagent from this spec; review patches applied. Migration 040 is not applied to any database and has not run against real Postgres; group queries now select `default_event_type`, so apply 040 before deploying. Group widget rows equal to the system default (migration 033 backfill) count as no customization. Preset categories seed the group for the first typed event when the group has none, written by any member (decided at planning). Widget lists and starter items in `lib/events/eventTypes.ts` are content choices. Verification: new and touched suites pass (71 tests); tsc errors unchanged at 706; 81 failing tests in 10 suites fail identically on the baseline.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Widget presets never apply to pre-existing groups because migration 033 backfilled default rows (edge) | medium | patch | 033 inserts rows for every group; "has rows" is always true. Group layout now counts only when it differs from the system default. |
| Rollback on the two `createEvent` early-return failures not asserted (verification-gap) | medium | patch | Existing failure tests check only the result; assertions added. |
| Any member's first typed event seeds group-wide categories, bypassing the admin gate (blind, edge) | low | reject | Decided by the human at planning ("seed group only if untouched"); recorded as a known trade-off. |
| Null type vs `'trip'` differ between conversion and modal (blind) | low | reject | Trip's preset equals the default, so behavior is identical. |
| Event type not read back or shown after creation (blind, edge) | low | reject | Spec does not require display; labels are 14.8. |
| Existing wishlist tests not updated for the extra SELECT (blind) | low | reject | Those suites already fail identically on the baseline; new tests cover the path. |
| Lock partial, hash collisions, widget-check race, conversion default read unlocked (blind, edge) | low | reject | Same lock key as the category editor; races need simultaneous admin edits and cost one mis-seeded event. |
| Duplicate validation; swallowed error message in default-type setting; picker accessibility; modal resets selection when default changes mid-form (blind, edge) | low | reject | Polish or very unlikely; fixes add branches. |
| `labels` map is dead data; no registry-change migration plan (blind) | low | reject | Spec stores labels for 14.8; removed keys fall back to no type. |
| Starter inserts skip service invariants (blind) | false | reject | `event_checklist_items` has only defaults beyond the inserted columns; the checklist service adds nothing else. |
| Group page wiring from default type to modal untested (verification-gap) | low | reject | Each piece is tested; thin prop wiring. |
| Dinner widgets may not show because the live page skips the dashboard (edge) | false | reject | `EventDetail` renders `EventPlanningTab`, which resolves the event's layout rows. |
| Empty-string PATCH, group soft-delete lookup, ROLLBACK can throw (edge) | low | reject | Not reachable in normal use. |

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: error count not above baseline (706 pre-existing)
- `npx jest --testPathPatterns "eventType|EventType|eventService|wishlist|CreateEventModal|AdminGroupSettings|groups"` -- expected: all pass
- `npm run lint` -- expected: no new errors beyond existing `no-explicit-any` pattern

### Review Findings

Code review of commit 65ac5bb (2026-10-07). Layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor.

- [x] [Review][Patch] Widget presets never apply to groups with the 5 backfilled rows since Story 14.9 added the 6th `notes` widget — `groupCustomized` compares the raw rows (5) with `defaultWidgetLayout()` (6) via `layoutsEqual`, which fails on length, so every group backfilled by migration 033 now counts as customized and Dinner/Game night/Practice never write `event_dashboard_widgets` rows. Compare the rows after reconciling them with the registry (the same drop-unknown, append-missing, renumber step `getWidgetLayout` uses) [lib/services/eventTypePresetService.ts:52-61]
- [x] [Review][Patch] No test that `CreateEventModal` sends the selected `event_type` — the picker tests only read radio state and the route test builds its own body, so dropping `event_type: eventType` from the POST body would pass every test. Add a submit test that stubs `fetch` and asserts the parsed body: a non-default pick is sent, and the group default is sent when nothing is changed [components/groups/CreateEventModal.tsx:145]
- [x] [Review][Defer] Deploy order: `getGroupById`, `getGroupDetailsWithMembers`, `updateGroup` and `createGroupWithMembership` select `default_event_type`, so deploying before migration 040 is applied breaks every group read and write [lib/db/queries.ts:1211] — deferred: real but operational; apply 040 before deploying this code. Check whether 040 has been applied to production.
- [x] [Review][Defer] `CreateEventModal.test.tsx` submit tests assert on a mocked `createEvent`, but the modal submits via `fetch` (19 of 32 tests fail) [__tests__/components/CreateEventModal.test.tsx:100-125] — deferred: pre-existing, the modal already used `fetch` before 14.7 and the file was not touched.

#### Rejected

- Any member's first typed event seeds the group's logistics categories and bypasses the admin gate (3 layers) — `low`: a recorded planning decision ("seed group only if untouched"), so the only fix is to change the spec.
- Widget-customization check treats a group that deliberately saved the default layout as uncustomized (Blind Hunter, Acceptance Auditor) — `low`: deliberate and documented trade-off, since 033 backfill rows are indistinguishable from a saved default. The `notes` regression above is the separate, fixable defect.
- Widget SELECT-then-INSERT has no advisory lock; `hashtext` collisions; lock only taken for non-default categories — `low`: a race needs a simultaneous admin layout save and costs one mis-seeded event; same lock key as the category editor.
- Unique violation if `event_dashboard_widgets` rows already exist for the new event — `false`: the event was just inserted in this transaction and no code or trigger seeds event widget rows.
- `ROLLBACK` can throw on the two early returns, and the connection is not destroyed on rollback failure — `low`: the early returns need `INSERT ... RETURNING` to return no row, which does not happen in practice.
- Wishlist conversion reads `default_event_type` without `deleted_at IS NULL`, and fails if 040 is missing (Blind Hunter, Edge Case Hunter, Acceptance Auditor) — `low`: conversion is member-gated earlier, and the 040 case is covered by the deploy-order item above.
- Empty-string `default_event_type` or `event_type` gets a 400 — `low`: the UI sends null or omits the field; only a non-UI client could hit it.
- `CreateEventModal` resets the pick if `defaultEventType` changes while it is open; `DefaultEventTypeSetting` does not re-sync with its prop — `low`: needs a group-data refresh mid-form, and the fix adds transition tracking.
- Modal may send a stale or removed type key — `false`: `eventType` is only ever set from `initialEventType` (validated with `isEventTypeKey`) or from the picker's registry options.
- Generic error toast in `DefaultEventTypeSetting`, picker accessibility, duplicated validation, dead `labels` data, event type not shown after creation, starter items skip the checklist service — `low`/`false`: polish or already decided in the spec's triage log; `event_checklist_items` has no extra invariants beyond the inserted columns.
- Group page and `AdminGroupSettings` wiring untested; preset SQL only run against mocks; positional `mockResolvedValueOnce` BEGIN entries — `low`: thin prop wiring, and the same mock boundary the repo uses everywhere.
- Spec `status: done` vs sprint `review`, empty Spec Change Log, accepted 81 failing tests and 706 tsc errors — `low`: fixing means editing the spec, and the baseline counts are recorded as known.

