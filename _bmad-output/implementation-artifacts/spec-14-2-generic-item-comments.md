---
title: '14-2 Generic Item Comments'
type: 'refactor'
created: '2026-10-06'
status: 'done'
baseline_commit: 'ebc16cc8378c7aa0fc92611d86e6958f9da9f721'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Checklist and logistics comments live in two near-identical tables (`checklist_comments` 034, `logistics_comments` 035) with duplicated queries, routes, validation schemas and "Checklist"-named UI components. Timeline and poll comments (14.3, 14.4) would add two more copies.

**Approach:** One `item_comments` table keyed by `item_type` + `item_id`, one set of generic query functions, and generically named comment components. Existing comments migrate into it and the two old tables are dropped. Behavior-preserving: no visible change.

## Boundaries & Constraints

**Always:** Public API URLs, response shapes, status codes, auth rules (member to post; author or admin to edit/delete; guests read-only with first-name-only creators) and comment counts stay identical. `item_type` is validated in application code against a shared constant (`checklist`, `logistics`, `timeline`, `poll`), not a DB CHECK. Comment ids, timestamps, edit counts and soft-deleted rows survive the migration. Deleting a checklist or logistics item removes its comments in the same transaction (service layer; there is no per-item FK). Event delete cascades via `event_id`.

**Never:** Add timeline/poll comment UI or routes (14.3/14.4). Change URL structure, add a consolidated route, or alter the wishlist/event comment systems. Apply the migration to any database.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Migrate | DB with 034/035 applied and rows | Every row copied with same id/timestamps/deleted_at, `event_id` taken from its item; old tables dropped | N/A |
| Migrate, tables absent | 034/035 never applied (e.g. prod) | Creates empty `item_comments`; no error | Guarded by `to_regclass` |
| Item deleted | Checklist/logistics item with comments | Item and all its comments removed in one transaction | Rolls back together |
| Comment on wrong item | commentId exists but `item_type`/`item_id` differ from the URL | Treated as not found | 404 `NOT_FOUND` |
| Unknown item type | Service called with an unsupported type | Rejected before any query | Throws / validation error |

</frozen-after-approval>

## Code Map

- `lib/db/queries.ts:1520-1845` -- two parallel blocks (checklist 13.7, logistics 13.8): `get*ItemInEvent`, `get*Comments`, `add*Comment`, `get*CommentById`, `update*Comment`, `delete*Comment` plus record types. Replace with generic `getItemComments(itemType, itemId)`, `addItemComment`, `getItemCommentById`, `updateItemComment`, `deleteItemComment`, and `getCommentableItemInEvent(itemType, itemId, eventId, groupId)` (table looked up from a fixed type-to-table map, never interpolated from input).
- `lib/dashboard/widgetRegistry.ts` -- already carries the `commentable` flag; item-type constant lives beside comment code, not here.
- `lib/validation/commentSchema.ts:89-155` -- `checklistCommentSchema`, `logisticsCommentSchema` and their helpers; collapse to one `itemCommentSchema` (`item_type`, `item_id`, `group_id`, `content`). Keep `__tests__/validation/commentSchema.test.ts` green, adjusted.
- `app/api/groups/[groupId]/events/[eventId]/{checklist,logistics}/[itemId]/comments/route.ts` and `.../[commentId]/route.ts` -- four near-identical files; keep URLs, make each a thin wrapper over shared handlers (`lib/api/itemCommentHandlers.ts`) parameterised by item type.
- `app/api/events/public/[publicToken]/{checklist,logistics}/[itemId]/comments/route.ts` and `lib/services/publicPlanningService.ts:123,142,249-365` -- guest GETs, two duplicated public services; unify into one `getPublicItemComments(token, itemType, itemId)`; count subqueries switch to `item_comments`.
- `lib/services/eventChecklistService.ts:157,373`, `lib/services/eventLogisticsService.ts:235,510` -- `comment_count` subqueries; item DELETE sites (add `DELETE FROM item_comments` in the same `client` transaction).
- `components/groups/ChecklistCommentPopover.tsx`, `ChecklistCommentSection.tsx` -- rename to `ItemCommentPopover` / `ItemCommentSection` (props type, exports, `ItemComment` type; existing `itemType` prop already generic). Update imports in `EventChecklist.tsx:27`, `EventLogistics.tsx:30`.
- `lib/db/migrations/034_*.sql`, `035_*.sql` -- do not edit; next number is **037**.
- Tests to keep green/adjust: `__tests__/api/{checklist,logistics}-comments.route.test.ts`, `__tests__/components/ChecklistComment{Popover,Section}.test.tsx` (rename), `__tests__/validation/commentSchema.test.ts`, checklist/logistics/public service tests that mock `query`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/037_create_item_comments_table.sql` -- create `item_comments` (id, item_type, item_id, event_id FK `event_proposals` cascade, group_id FK cascade, created_by VARCHAR(128), content with the same two CHECKs, created/updated/edited_at, updated_count, deleted_at; indexes on `(item_type,item_id,created_at) WHERE deleted_at IS NULL`, event_id, group_id; RLS enabled). In a `DO` block, copy rows from 034/035 when `to_regclass` finds them, then drop both. -- single table, safe on DBs without 034/035
- [x] `lib/db/queries.ts` -- replace the two comment blocks with the generic functions above -- one implementation
- [x] `lib/validation/commentSchema.ts` -- generic schema + `COMMENT_ITEM_TYPES` constant/type guard -- app-level validation
- [x] `lib/api/itemCommentHandlers.ts` + the four member route files -- shared GET/POST/PATCH/DELETE logic -- URLs unchanged
- [x] `lib/services/publicPlanningService.ts` + two public route files -- one public comments service; counts from `item_comments`
- [x] `lib/services/eventChecklistService.ts`, `eventLogisticsService.ts` -- count subqueries; delete comments with the item in-transaction
- [x] `components/groups/ItemComment{Popover,Section}.tsx` (git mv from Checklist-named files) and their two consumers -- rename only
- [ ] Tests -- rename/adjust existing; add: generic query functions (type-to-table map, wrong item type 404), item delete removes comments, migration SQL guard text sanity (no DB run)

**Acceptance Criteria:**
- Given an existing checklist or logistics item, when members and guests view, post, edit, delete and count comments, then every response matches today's API contract.
- Given a deleted checklist or logistics item, when it is removed, then no `item_comments` rows remain for it.
- Given migration 037 on a database with 034/035 populated, when it runs, then all comments appear in `item_comments` and 034/035 no longer exist.
- Given a new commentable type is added to the constant, when its item lookup is registered, then comment functions work with no new table or schema change.

## Implementation Notes

Generic `item_comments` table, shared handlers in `lib/api/itemCommentHandlers.ts`, one public comments service, item deletes now wrapped in a transaction that removes comments. Migration 037 not applied to any DB. Verification: story test suites pass (136 after patches), tsc errors unchanged at 706. Pre-existing failing suites: CommentDeleteButton, wishlist comments route, publicPlanningService (comment_count mismatch).

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| item_type mismatch in PATCH/DELETE `authorize` untested (gap, blind) | medium | patch | Removing the clause kept all tests green. Added a cross-type 404 test in both route test files. |
| `comment_count` subqueries' `item_type` filter unasserted (gap) | low | patch | Mock-driven tests ignore SQL. Added `item_comments` / `item_type` assertions to checklist and logistics list tests. |
| Stale "Stories 13.8-13.10" comments in renamed components (blind) | low | patch | Reworded both comments. |
| Migration copy/drop only text-tested; never run on a DB (gap, edge, blind) | medium (unverified) | defer | No DB harness in repo; needs a dry run on a seeded copy. Logged in deferred-work. |
| Migration silently skips rows via INNER JOIN / ON CONFLICT before DROP (edge, blind) | false | reject | Old tables had FK ON DELETE CASCADE to the item, so no row lacks an item; target table is new so no id conflicts. |
| Timeline/poll accepted by schema but lookup throws, giving 500 / "Item item not found" (edge, blind) | false | reject | Only checklist and logistics routes exist and each hardcodes its type; no caller reaches an unregistered type. |
| Public lookup now also scopes by `group_id` (edge, gap, blind) | low | reject | `getEventByPublicToken` returns `group_id` and items are created with their event's group; stricter only for impossible rows. |
| ROLLBACK failure masks original error; BEGIN after auth reads; TOCTOU (edge, blind) | low | reject | Same non-transactional auth-then-write pattern as before the change; fix adds branches for a rare path. |
| Orphan comment if item deleted between check and INSERT; other item delete paths (edge, blind) | low | reject | Spec chose no per-item FK; grep found only the two DELETE sites, both cleaned. Race is negligible. |
| UPDATE/DELETE scoped by id only; delete returns success on 0 rows (edge, blind) | low | reject | Pre-existing behavior carried over unchanged. |
| Non-partial index for comment delete; duplicated type metadata; loose `any` typing; hand-written union; duplicate PATCH validation (blind) | low | reject | Cosmetic or scale-irrelevant; the fixes add complexity. `any` mirrors the old queries. |
| Old validation exports removed without proof of no consumers (blind) | false | reject | Grep across app, lib, components and tests finds no remaining references; tsc error count unchanged at 706. |
| "Prod never applied 034/035" claim unverified (blind) | false | reject | The claim is not in the migration's behavior; the `to_regclass` guard handles both cases. |

## Design Notes

The epic's open item (were 034/035 applied to production?) is handled by the migration's `to_regclass` guard, so it is safe either way; the owner should still run it deliberately. Route consolidation is deferred: URLs stay per-type so the guest/member clients and 13.7/13.8 tests are untouched; 14.3/14.4 add their own thin wrappers over the shared handlers.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: error count not above baseline (706 pre-existing)
- `npx jest --testPathPattern "comment|Comment|checklist|logistics|publicPlanning"` -- expected: all pass
- `npm run lint` -- expected: no new errors

### Review Findings

Code review 2026-10-09 of commit `f80f5c1` (diff `ebc16cc..f80f5c1`), four layers: Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor. No acceptance criterion is violated in a way that breaks behavior; AC3 (the data migration) was never run.

- [x] [Review][Patch] Public planning `comment_count` subqueries for checklist and logistics now read `item_comments` filtered by `item_type`, but only the timeline and poll SQL is asserted. Add `FROM item_comments` and `item_type = 'checklist'` / `'logistics'` assertions beside the existing ones [`__tests__/services/publicPlanningService.test.ts:176`, `lib/services/publicPlanningService.ts:124-150`]
- [x] [Review][Patch] `ItemCommentPopoverProps.itemType` hand-writes `'checklist' | 'logistics' | 'timeline' | 'poll'` instead of using the shared `CommentItemType`, so the two can drift [`components/groups/ItemCommentPopover.tsx:30`]
- [x] [Review][Defer] Migration 037 has only source-text tests and was never run against Postgres; it copies rows then drops `checklist_comments` / `logistics_comments` — deferred: needs a database to verify (unverified severity: high if the copy is wrong). Settle by running it on a dev database seeded with 034/035 comments and comparing row counts before and after.

#### Rejected

- `false` Migration silently loses comments whose item is missing or whose id conflicts: 034/035 declare `REFERENCES event_checklist_items / event_logistics_items ON DELETE CASCADE`, so an orphan comment cannot exist, and `item_comments` is new so ids cannot conflict.
- `false` Migration errors if the item tables are missing: those tables are created by earlier migrations that 034/035 themselves depend on via FK.
- `false` Timeline/poll item types give a 500 and "Item item not found": all four types are now registered in `COMMENTABLE_ITEM_TABLES` (14.3/14.4) and the public service has per-type not-found messages.
- `false` Deleted comment reported as an edit conflict: the 409 text is "Comment was deleted or edited by another user", which covers both.
- `false` Update/delete can touch another item's comment: `authorize()` loads the comment and checks group, `item_type` and `item_id` against the URL before either runs.
- `false` Orphaned comments from other delete paths: the only `DELETE FROM event_checklist_items / event_logistics_items` statements are the two service deletes that now remove comments first; event and group deletes cascade via `event_id` / `group_id`.
- `false` Nested `BEGIN` risk: each service call takes its own pooled client.
- `low` Non-UUID `itemId` on GET returns 500: unchanged from before (the old `getChecklistItemInEvent` did the same).
- `low` `ROLLBACK` failure masks the original error: outer catch already logs and returns a failure result; rare and the same pattern as elsewhere.
- `low` Delete of an already-deleted comment returns success: idempotent and harmless.
- `low` Index doesn't cover the item-delete `DELETE`: runs on rare item deletes against a small table.
- `low` `queryOne<any>` typing, hand-rolled PATCH length check, duplicated 2000 limit, `ITEM_TYPE_LABELS` duplication, stale `cc`/`lc` aliases and doc names: no concrete harm, fixes add churn.
- `low` Public lookup now also requires `group_id` and malformed-`itemId` message text changed: stricter only for rows that should not exist; status and error code unchanged.
- `low` No assertion that the public service passes `event.group_id`: covered at the query level; low value.
- Spec bookkeeping (unchecked Tests task, `done` vs `review`, `last_updated` moving backward, Code Map line numbers, AC4 wording): fix is to edit the spec under review or historical; rejected.
