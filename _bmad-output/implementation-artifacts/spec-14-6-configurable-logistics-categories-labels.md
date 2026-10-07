---
title: '14-6 Configurable Logistics Categories and Labels'
type: 'feature'
created: '2026-10-07'
status: 'done'
route: 'dispatch'
baseline_commit: '4f6c10dab01e7e6baa361c4ba21262991e796814'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Logistics items are hard-wired to two categories, "Bring" and "Carpool". A dinner or practice cannot rename them or add its own, such as "Snacks" or "Equipment".

**Approach:** Add a per-group `logistics_categories` table (key, label, `mode`, position). `mode` is `single` (one person claims, today's bring) or `seats` (a driver offers N seats, today's carpool). A group with no rows uses the built-in defaults `bring` ("Bring List", single) and `carpool` ("Carpool", seats). Group admins edit categories in a "Manage categories" dialog in the Logistics widget. Items keep their `category` column, which now holds a category key validated in application code.

## Boundaries & Constraints

**Always:** Groups never edited behave exactly as today. Only group admins create, rename, reorder or delete categories. The first edit saves the full list as the group's rows. Keys are generated from the label on create, are unique per group, and never change on rename. Labels are 1..50 characters. A category cannot be deleted while any item in the group uses its key (409 `CATEGORY_IN_USE`), and at least one category must remain. `mode` cannot change once items use the category. Section headings, the add-form radio and the Today badge use the label; button wording stays mode-specific. Guests see the same labels; the public planning response gains `logistics_categories` with no `group_id` leaked. Claiming follows the item's category mode, so `seats` allows claim and capacity, and `single` allows self-claim of `assigned_to`.

**Never:** Add event types or presets (14.7), per-event categories, or wording changes outside logistics (14.8). No new modes. Do not rename the `event_logistics_*` tables. Do not apply the migration to any database. Do not change comments, widgets or layout.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Untouched group | No rows | Default two categories returned, `customized: false` | N/A |
| Admin saves | Valid full list | Rows replaced transactionally; order follows position | N/A |
| Item add, seats mode | Capacity and driver given | Created as today | 400 `INVALID_CAPACITY` / `MISSING_DRIVER` |
| Item add, unknown key | Key not in group list | Rejected | 400 `INVALID_CATEGORY` |
| Delete in use | Items use key | Rejected | 409 `CATEGORY_IN_USE` |
| Mode change in use | Items use key | Rejected | 400 `CATEGORY_IN_USE` |
| Non-admin edit | Member PATCH | Rejected | 403 `FORBIDDEN` |
| Bad list | Empty, duplicate keys, bad mode or label | Rejected | 400 `VALIDATION_ERROR` |
| Public view | Token | Labels and modes in the planning response | Unknown 404, cancelled 410 |

</frozen-after-approval>

## Code Map

- `lib/db/migrations/039_create_logistics_categories_table.sql` -- new; UUID id, `group_id` FK cascade, `category_key VARCHAR(50)`, `label VARCHAR(50)`, `mode VARCHAR(10)`, `position INT`, timestamps, `UNIQUE(group_id, category_key)`, RLS enabled, no CHECKs. Also drop the `category` CHECK and `carpool_requires_capacity` on `event_logistics_items` using the name-lookup pattern from 036, and widen `category` to `VARCHAR(50)`. No backfill. Latest migration is 038.
- `lib/logistics/defaultCategories.ts` -- new; the two defaults and `mode` type shared by service, UI and tests.
- `lib/services/logisticsCategoriesService.ts` -- new; `getLogisticsCategories(groupId, userId?)` (rows else defaults, returns `customized`), `updateLogisticsCategories(groupId, userId, list)` (admin check, validation, key generation, transactional replace, in-use check), reusing `getUserGroupRole`.
- `lib/services/eventLogisticsService.ts` -- replace the `'bring' | 'carpool'` checks in `addLogisticsItem`, `updateLogisticsItem`, `claimLogisticsSeat` with a category lookup by key and `mode` (`carpool` becomes `seats`, `bring` becomes `single`). `LogisticsCategory` becomes `string`.
- `lib/services/publicPlanningService.ts` -- add `logistics_categories` to the response; type `category` as `string`.
- `app/api/groups/[groupId]/logistics-categories/route.ts` -- new GET (member) and PATCH (admin), mirroring `dashboard-widgets/route.ts`.
- `app/api/groups/[groupId]/events/[eventId]/logistics/route.ts` -- drop the hard-coded category check; the service validates.
- `components/groups/EventLogistics.tsx` -- fetch categories alongside items (guest: from the planning response); render one section per category in position order; mode picks the row renderer; add-form radio lists categories; admin-only "Manage categories" dialog (rename, add, remove, reorder, mode select for new rows, disabled for in-use) in a new `LogisticsCategoryEditor.tsx`.
- Tests to extend: `__tests__/services/eventLogisticsService.test.ts`, `__tests__/services/publicPlanningService.test.ts`, `__tests__/components/EventLogistics.test.tsx`, `app/api/groups/[groupId]/events/[eventId]/logistics/__tests__/route.test.ts`; new service, route and editor tests beside them.

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/039_create_logistics_categories_table.sql`, `lib/logistics/defaultCategories.ts` -- schema and shared defaults -- storage and one source for the built-ins
- [x] `lib/services/logisticsCategoriesService.ts` -- get and admin update with validation, key generation, in-use checks -- single resolution point
- [x] `lib/services/eventLogisticsService.ts`, `lib/services/publicPlanningService.ts`, logistics `route.ts` -- mode-driven checks, categories in public payload -- behavior follows data
- [x] `app/api/groups/[groupId]/logistics-categories/route.ts` -- GET/PATCH -- member API
- [x] `components/groups/EventLogistics.tsx`, `components/groups/LogisticsCategoryEditor.tsx` -- dynamic sections, form and editor -- UX
- [x] Tests -- service (defaults, replace, admin-only, in-use delete, mode lock, key uniqueness), item service with a custom `single` and `seats` category, route, public payload, UI (default render unchanged, custom labels, editor visible only to admins, guest labels)

**Acceptance Criteria:**
- Given a group that has never edited categories, when the dashboard loads, then Logistics shows "Bring List" and "Carpool" exactly as before.
- Given an admin renames "Bring List" to "Snacks" and adds "Rides" as seats, when members open Logistics, then both sections appear and items behave by mode.
- Given a guest opens a public link, when logistics render, then they see the group's labels, read-only.
- Given a category has items, when an admin tries to delete it, then it is rejected with a clear message.

## Implementation Notes

Implemented by a subagent from this spec; review patches applied. Migration 039 is not applied to any database and has not run against real Postgres. Category edits take effect for other members on the ~5s poll. The editor only knows in-use categories from the current event; the server enforces group-wide. Verification: 16 jest suites / 241 tests pass; tsc errors unchanged at 706; eslint reports only `no-explicit-any`, the pattern already used across these services. "Public Events API" suite has 9 pre-existing failures unrelated to this change.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| In-use check and key validation run outside the transaction, no lock (edge, blind, verification-gap) | medium | patch | Reads precede BEGIN; a concurrent item add or second admin save can orphan items or hit the unique key. Moved inside the transaction under an advisory lock. |
| Categories are not refreshed by the 5s poll (edge, blind) | medium | patch | Only `fetchItems` polls; another admin's edit is invisible until reload. Categories fetch added to the poll. |
| `updateLogisticsItem` untested with custom categories (verification-gap, blind) | medium | patch | All update fixtures use `bring`; reverting the mode checks would pass. Three tests added. |
| Failed categories fetch silently falls back to defaults; flash of defaults on load (edge, blind) | low | reject | Needs a failing fetch of a small endpoint; fix adds loaded-state and error UI. |
| Items with an unknown category key are invisible; null `itemMode` ignored in update (edge, blind) | low | reject | Reachable only through the race fixed above; the service rejects unknown keys on create. |
| Add-form radio and Today badge read "Bring List" instead of "Bring" for unedited groups (edge, blind) | low | reject | The frozen spec says headings, radio and badge use the label, and the default label is "Bring List"; fix would edit the spec. |
| Mode-specific copy ("What are you bringing?", "I'll bring this") on custom single categories (blind) | low | reject | Spec: button wording stays mode-specific; 14.8 owns wording. |
| Editor "in use" lock only sees the current event's items (edge, blind, verification-gap) | low | reject | Server enforces group-wide and the dialog shows its error; matches the implementer's documented note. |
| Duplicate labels allowed; no cap on list length; slug drops non-ASCII (edge, blind) | low | reject | Not reachable in everyday use; each fix adds validation branches. |
| `CATEGORY_IN_USE` returned as 400 for mode lock and 409 for delete (edge, blind, verification-gap) | low | reject | Matches the frozen I/O matrix. |
| Migration drops every CHECK matching `%category%` (edge, blind) | false | reject | The only such constraints on `event_logistics_items` are the category CHECK and `carpool_requires_capacity` from 017. |
| Missing updated_at trigger, RLS policies, down script (blind) | false | reject | Mirrors migrations 033/038 and the table-owner connection. |
| Public planning fails if the categories query fails or table is missing (edge) | low | reject | A missing table means the migration was not applied, which breaks other paths too. |
| Malformed JSON or null body gives 500 on PATCH (edge) | low | defer | Same behavior in the other routes; pre-existing pattern. |
| Non-JSON error response parse, unsaved-edit confirmation, a11y of disabled controls, brittle mock regex (blind) | low | reject | Polish only; no hidden defect. |
| Spec bookkeeping and sprint-status mismatch (blind) | false | reject | Status is updated by the workflow at present time. |

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: error count not above baseline (706 pre-existing)
- `npx jest --testPathPatterns "ogistics|publicPlanning"` -- expected: all pass
- `npm run lint` -- expected: no new errors
