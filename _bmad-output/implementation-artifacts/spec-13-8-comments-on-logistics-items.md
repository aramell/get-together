---
title: 'Comments on Logistics Items'
type: 'feature'
created: '2026-10-06'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md', '{project-root}/_bmad-output/implementation-artifacts/13-7-comments-on-checklist-items.md']
baseline_commit: 'd1594ad88f40c43365ba17129a457b9daac3184a'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Logistics items (Bring List and Carpool) on the event dashboard are not commentable, so members cannot discuss "who's bringing what" or "pickup time for this carpool" on the item itself.

**Approach:** Repeat Story 13.7 for logistics: a dedicated `logistics_comments` table, group-scoped and public-token comment routes, and the already-generic `ChecklistCommentPopover`/`ChecklistCommentSection` wired into every Bring and Carpool row (member and guest render paths, including the Today group).

## Boundaries & Constraints

**Always:**
- `logistics_comments` mirrors `checklist_comments` (migration 034) exactly, with `logistics_item_id UUID NOT NULL REFERENCES event_logistics_items(id) ON DELETE CASCADE`: `created_by VARCHAR(128)`, `edited_at`, `updated_count`, content CHECKs, partial index `WHERE deleted_at IS NULL`, bare `ENABLE ROW LEVEL SECURITY` (no policies). Next migration number: `035`.
- Comment icon is always visible on every logistics row (Bring and Carpool, general lists and Today group); count badge only when count > 0 (13.7's resolved decision).
- Reuse `ChecklistCommentPopover` and `ChecklistCommentSection` unchanged, passing `itemType="logistics"` and logistics URLs. No rename or refactor of those components.
- Edit/delete comments: creator or group admin only; pass the real role already tracked in `EventLogistics` (`userRole` state), never hardcoded.
- Creator lookups use `users.id` (never `sub`); GET shapes a nested `creator` object.
- Guests: icon visible, read-only thread via a public-token GET route (first-name-only creator, no raw `created_by`); adding prompts login.
- Live sync via the existing 5s polling; the item-list poll carries `comment_count`.
- Icon sits in the row's trailing area; hidden while a row is in title-edit mode.

**Never:**
- No changes to `checklist_comments`, event/wishlist comments, or their routes/components.
- No polymorphic/shared comments table; no photos/timeline/poll comments (13.9/13.10).
- No new permissions, rate limiting, or validation beyond existing `content` rules; no RLS policies.
- Comments never replace item metadata (assignee, claims, capacity, date).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 0 comments | Member views a bring or carpool row | Icon, no badge; opening shows empty state ready to post | N/A |
| First comment | Member posts | Appears immediately, badge shows "1"; others sync in ~5s | POST failure → toast |
| Edit/delete | Creator or admin | Reflected immediately, syncs ~5s | Failure → toast |
| Other member's comment | Non-admin, non-creator | No edit/delete controls | N/A |
| Edit/claim/unclaim an item | Item mutation response lacks `comment_count` | Existing badge count is preserved, not reset to 0 | N/A |
| Guest views row | Valid `public_token` | Icon (badge if > 0); read-only thread; add → login prompt | N/A |
| Item not in event/group | Bad `itemId` | 404 | `NOT_FOUND` |
| Non-member POST | Valid token, not a member | 403 | `FORBIDDEN` |

</frozen-after-approval>

## Code Map

- `lib/db/migrations/034_create_checklist_comments_table.sql` -- copy structure for 035; FK target is `event_logistics_items(id)`.
- `lib/db/queries.ts:1523-1680` -- checklist comment block (`getChecklistItemInEvent`, `get/add/getById/update/deleteChecklistComment`); add logistics counterparts (`getLogisticsItemInEvent`, etc.) verbatim-style.
- `lib/validation/commentSchema.ts:~85-115` -- `checklistCommentSchema`; add `logisticsCommentSchema` / `validateLogisticsCommentInput` (`logistics_item_id` field).
- `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/comments/route.ts` and `.../[commentId]/route.ts` -- templates for the new `logistics/[itemId]/comments` route pair (GET no-auth, POST member-only; PATCH/DELETE creator+admin, scoped to item and group).
- `app/api/events/public/[publicToken]/checklist/[itemId]/comments/route.ts` + `getPublicChecklistComments` in `lib/services/publicPlanningService.ts` -- template for the guest GET and `getPublicLogisticsComments`.
- `lib/services/publicPlanningService.ts` (`PublicLogisticsItem`, logistics query in `getPublicPlanningData`) -- add `comment_count` (subquery on `logistics_comments WHERE deleted_at IS NULL`; query already uses `GROUP BY eli.id`, so use a correlated subquery, not a join).
- `lib/services/eventLogisticsService.ts` (`LogisticsItem`, `mapRow`, `getLogisticsItems` SELECT at ~221) -- add `comment_count` via the same subquery; add/update/claim responses go through `mapRow` and will report 0, so the client must preserve counts.
- `components/groups/EventLogistics.tsx` -- `renderBringRow`, `renderCarpoolRow` (shared by Today group), guest bring/carpool rows (~523-590); `userRole` state (line 101) already holds the real role; `setItems` replacements at ~235/266/313 must keep `comment_count`. Add `handleCommentCountChange` as in `EventChecklist.tsx`.
- `components/groups/ChecklistCommentPopover.tsx` / `ChecklistCommentSection.tsx` -- reuse as-is.
- `__tests__/api/checklist-comments.route.test.ts`, `__tests__/components/EventLogistics.test.tsx` -- test templates (mock only `@/lib/db/client` so real SQL is asserted).

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/035_create_logistics_comments_table.sql` -- create table per Boundaries -- mirrors 034
- [x] `lib/validation/commentSchema.ts` -- add `logisticsCommentSchema`/`validateLogisticsCommentInput`
- [x] `lib/db/queries.ts` -- add the logistics comment functions plus `getLogisticsItemInEvent`
- [x] `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/comments/route.ts` -- GET, POST
- [x] `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/comments/[commentId]/route.ts` -- PATCH, DELETE
- [x] `lib/services/publicPlanningService.ts` -- `comment_count` on `PublicLogisticsItem`; add `getPublicLogisticsComments`
- [x] `app/api/events/public/[publicToken]/logistics/[itemId]/comments/route.ts` -- guest-readable GET
- [x] `lib/services/eventLogisticsService.ts` -- `comment_count` on `LogisticsItem`/`mapRow`/`getLogisticsItems`
- [x] `components/groups/EventLogistics.tsx` -- popover on member bring/carpool rows and guest rows; preserve `comment_count` across item updates; real `userRole`
- [x] `__tests__/api/logistics-comments.route.test.ts` -- GET/POST/PATCH/DELETE (id-not-sub, nested creator, role checks, item scoping) plus public GET (404s, 410, first-name-only)
- [x] `__tests__/components/EventLogistics.test.tsx` -- icon on bring/carpool/Today/guest rows, badge iff count > 0, count preserved after claim toggle, no icon while editing

**Acceptance Criteria:**
- Given a logistics item with 0 comments, when a member views it, then the icon shows with no badge and opens an empty-state thread.
- Given a member posts, edits, or deletes a comment, then it reflects immediately and syncs to other viewers within ~5s.
- Given a non-admin, non-creator member, then another member's comment shows no edit/delete controls; an admin sees them.
- Given a guest on the public link, then every Bring and Carpool row shows the icon, the thread is read-only, and adding prompts login.

## Implementation Notes

- Implemented directly from the spec (no implementation subagent). Files: migration 035, `commentSchema.ts`, `queries.ts` (typed `LogisticsCommentRow` instead of copying 13.7's `any`), group + public comment routes, `eventLogisticsService.ts` and `publicPlanningService.ts` (`comment_count`, `getPublicLogisticsComments`), `EventLogistics.tsx`, plus tests.
- `ChecklistCommentPopover`/`ChecklistCommentSection` reused unchanged, as the spec required.
- `EventLogistics.tsx` places the icon inside the `editingId !== item.id` block, so it is hidden while a row's title is being edited.

## Spec Change Log

## Review Triage Log

### Review pass 1 (2026-10-06) — abbreviated

No parallel reviewer layers (no subagent instruction from the human). The orchestrator read the diff and checked it against the I/O matrix and boundaries.

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Migration 035 correctness | false | Applied in a scratch Postgres with stub parent tables: `VARCHAR(128)` `created_by`, `edited_at`/`updated_count`, partial index, CHECKs, RLS on with no policies, and cascade delete of comments when the item is deleted all behave as intended. Real parent-table schema not exercised. |
| 2 | Edit/claim/unclaim resets badge to 0 | false | `EventLogistics.tsx` spreads `comment_count` from the previous item on both PATCH paths; covered by a test. |
| 3 | Creator lookup by `sub` | false | New code uses `WHERE id = $1`; route test asserts it. |
| 4 | Real role passed, not hardcoded | false | `userRole` state from the members endpoint is passed on member rows. |
| 5 | Lint regressions | false | New route files lint clean; four new `any` errors in `queries.ts` were fixed with a typed row. Remaining errors in touched files are pre-existing. |
| 6 | Three uncoordinated fetch paths per item (count/preview/modal poll) | low | Same pre-existing design as 13.7 (already deferred there); not worsened here. |
| 7 | Comment components keep "Checklist" names while serving logistics | low | Spec requires reuse unchanged; naming cleanup is better done once before 13.9/13.10. |
| 8 | Manual checks (two-session sync, signed-out public link) not run | medium | Needs manual verification before merge. |

## Verification

**Commands:**
- `npm run build` -- expect no new TypeScript errors (known pre-existing error in `app/api/user/invitations/route.ts:55`)
- `npx jest __tests__/api/logistics-comments.route.test.ts __tests__/components/EventLogistics.test.tsx __tests__/components/ChecklistCommentPopover.test.tsx __tests__/components/ChecklistCommentSection.test.tsx __tests__/api/checklist-comments.route.test.ts` -- expect all pass
- `npm run lint` -- expect no new errors on touched files

**Manual checks:**
- Apply migration 035 against a real Postgres and confirm table, partial index, and RLS exist.
- As a member, comment on a bring and a carpool item; confirm a second session sees the badge within ~5s.
- Open the public link signed out: icons visible, thread read-only, add prompts login.
