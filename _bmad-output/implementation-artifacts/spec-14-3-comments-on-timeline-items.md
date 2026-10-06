---
title: '14-3 Comments on Timeline Items'
type: 'feature'
created: '2026-10-06'
status: 'done'
baseline_commit: 'f80f5c16cbf6f4947fc653e6954ba4d85796c90d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Timeline items cannot be commented on, though checklist and logistics items can. Story 14.2 built the generic `item_comments` table and shared handlers, so the `timeline` type is accepted by the schema but has no item lookup, routes or UI.

**Approach:** Register `timeline` in the item lookup map, add thin per-type member and guest routes over the shared handlers, show the existing comment popover on each timeline row (members and guests), and include `comment_count` on timeline data. No new table, no migration.

## Boundaries & Constraints

**Always:** Behavior identical to checklist/logistics comments: anyone can read (guests first-name-only, read-only; adding prompts login), members post, author or admin edit/delete, soft delete, 2000-char limit. Same URL shape: `.../timeline/:itemId/comments[/:commentId]` and `/api/events/public/:token/timeline/:itemId/comments`. Deleting a timeline item removes its `item_comments` in the same transaction. Comment counts show a badge only when above zero and update live on polling.

**Never:** Add a migration or table. Change checklist, logistics, wishlist or event comments. Add poll comments (14.4). Change timeline item edit/delete permissions (creator-only controls today). Apply any migration to a database.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Member posts | Authenticated member, valid timeline item | 201 with the comment; badge count increments | N/A |
| Guest reads | Public token, timeline item in that event | Comments with first-name-only creators | Unknown item 404 `NOT_FOUND`; cancelled event 410 |
| Wrong item | Item id not in this event/group | Treated as not found | 404 `NOT_FOUND`, message "Timeline item not found" |
| Cross-type id | Checklist comment id on a timeline URL | Treated as not found | 404 `NOT_FOUND` |
| Item deleted | Timeline item with comments | Item and comments removed together | Rolls back together |
| Non-author edit | Member who is neither author nor admin | Rejected | 403 `FORBIDDEN` |

</frozen-after-approval>

## Code Map

- `lib/db/queries.ts:1548` -- `COMMENTABLE_ITEM_TABLES`: add `timeline: 'event_timeline_items'`; update the "timeline/poll: 14.3/14.4" comment (poll remains unregistered).
- `lib/api/itemCommentHandlers.ts` -- reuse unchanged; each route supplies `{ itemType: 'timeline', label: 'Timeline' }`.
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/comments/{route.ts,[commentId]/route.ts}` -- copy as the template for new `timeline/[itemId]/comments/` routes (beside the existing `timeline/[itemId]/route.ts`).
- `app/api/events/public/[publicToken]/logistics/[itemId]/comments/route.ts` -- template for a new `timeline` public route calling `getPublicItemComments(token, 'timeline', itemId)`.
- `lib/services/publicPlanningService.ts:110-250,260` -- timeline SELECT gets a `comment_count` subquery on `item_comments` (`item_type = 'timeline'`) and maps it; add `comment_count` to the timeline item type; add `timeline: 'Timeline'` to `ITEM_TYPE_LABELS`.
- `lib/services/eventTimelineService.ts:137,313` -- list SELECT adds the same `comment_count` subquery (`COUNT(*)::int`); `deleteTimelineItem` wraps `DELETE FROM item_comments WHERE item_type='timeline' AND item_id=$1` + item delete in BEGIN/COMMIT/ROLLBACK, exactly as `deleteLogisticsItem` does.
- `components/groups/EventTimeline.tsx` -- add `comment_count` to both item types; fetch group role (`/api/groups/:id` -> `data.currentUserRole`) as `EventLogistics.tsx:104,157` does; `handleCommentCountChange`; render `ItemCommentPopover` (`itemType="timeline"`, `itemLabel={item.title}`) in member rows (outside the edit/delete creator gate, so everyone sees it) and guest rows (`isGuest`, `onRequestLogin={requestLogin}`); drop the now-stale "no guest-triggerable action" comment and `void requestLogin`.
- `components/groups/ItemCommentPopover.tsx` -- already generic with `'timeline'` in its type; test ids derive from `itemType`. No change expected.
- Tests to mirror: `__tests__/api/logistics-comments.route.test.ts`, `__tests__/db/itemComments.queries.test.ts` (its "unregistered types" case currently asserts `timeline` throws -- change it to `poll`), `__tests__/services/eventLogisticsService.test.ts` (delete/transaction tests), `__tests__/components/EventLogistics.test.tsx:317` (comment UI tests), `__tests__/components/EventTimeline.test.tsx`, `__tests__/services/{eventTimelineService,publicPlanningService}.test.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/queries.ts` -- register `timeline` in the item table map -- no schema change
- [x] `app/api/groups/[groupId]/events/[eventId]/timeline/[itemId]/comments/route.ts` and `.../[commentId]/route.ts` -- thin wrappers over shared handlers -- URLs per type
- [x] `app/api/events/public/[publicToken]/timeline/[itemId]/comments/route.ts` -- guest GET -- same as logistics
- [x] `lib/services/publicPlanningService.ts`, `lib/services/eventTimelineService.ts` -- `comment_count` on list/public data; transactional comment cleanup on item delete
- [x] `components/groups/EventTimeline.tsx` -- comment popover for members and guests with live counts
- [x] Tests -- route tests (member GET/POST/PATCH/DELETE, guest GET, 404s, cross-type 404, 403), query map test, timeline service (count SQL, delete transaction + rollback), public service count, `EventTimeline` UI (icon on every row incl. non-creator rows, badge only when above zero, guest read-only preview)

**Acceptance Criteria:**
- Given a timeline item with comments, when a member or guest views the timeline, then each row shows a comment icon with a count badge, and the thread opens like checklist/logistics.
- Given a member who is not the item's creator, when they view the timeline, then they can comment but see no edit/delete item controls.
- Given a deleted timeline item, when removal completes, then no `item_comments` rows remain for it.

## Implementation Notes

Implemented directly (no subagent). `timeline` registered in `COMMENTABLE_ITEM_TABLES`; three new route files (member list/post, member patch/delete, guest GET) are thin wrappers over the shared handlers. `comment_count` added to the member timeline list and public planning data; `deleteTimelineItem` now deletes `item_comments` and the item in one BEGIN/COMMIT with ROLLBACK. `EventTimeline` renders `ItemCommentPopover` for member and guest rows and fetches the group role like `EventLogistics`. Also fixed `publicPlanningService.test.ts` logistics expectations (missing `comment_count: 0`) since that test was being edited anyway. Verification: tsc errors unchanged at 706; eslint errors unchanged at 29 on touched files; targeted jest 549 pass; remaining failures are pre-existing (wishlist comments route, CommentDeleteButton) plus an intermittent `EventLogistics` empty-state preview test that also flakes on the baseline commit.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Admin role passed to timeline comment popover is untested (verification-gap) | medium | patch | Dropping `userRole` left all tests green. Added an admin vs member moderation test; confirmed it fails when `userRole` is nulled. |
| Non-UUID `itemId` on comment routes may surface as 500 not 404 (edge) | low | defer | Same behavior in the checklist/logistics routes from 13.7/13.8/14.2, so not caused by this story. Logged in deferred-work. |
| Role fetch failure leaves `userRole` null with no retry (blind, edge) | low | reject | Identical to `EventLogistics`; admin loses only moderation UI until remount, and the server still enforces permissions. Retry adds branches. |
| Guest add-comment does nothing if `requestLogin` is undefined (edge) | low | reject | The public page always supplies it; same contract as checklist/logistics. |
| ROLLBACK failure masks original error; check-then-delete outside the transaction (blind, edge) | low | reject | Same pattern as `deleteLogisticsItem`, already triaged in 14.2. |
| Missing `(item_type, item_id)` index for count subqueries (blind, edge) | false | reject | Migration 037 indexes `(item_type, item_id, created_at) WHERE deleted_at IS NULL`. |
| Comments hard-deleted when item is deleted; other delete paths orphan rows (blind) | false | reject | Spec requires same-transaction removal; grep found only one `DELETE FROM event_timeline_items` site; event deletion cascades via `event_id`. |
| Live counts not delivered to guests or open popovers (blind) | false | reject | Guest path polls `fetchGuestPlanning` every 5s and member path polls `fetchItems`; both return `comment_count`. |
| Stale poll can briefly overwrite optimistic count (edge) | low | reject | Self-corrects on the next poll; same as checklist/logistics. |
| Count-change handler not exercised in `EventTimeline` tests (gap) | low | reject | Pure state update identical to the tested logistics handler; reviewer itself rated it cosmetic. |
| Route test gaps: 2000-char limit, admin PATCH, wrong-event 404 on POST (blind) | low | reject | Shared handlers carry this logic and are covered by the existing checklist/logistics route tests. |
| Guest test replaces `global.fetch` without restoring (edge) | low | reject | Guest `beforeEach` re-mocks fetch and it is the last describe block. |
| Duplicated public route token validation, `COUNT` coercion differences, no `encodeURIComponent`, layout/aria nits (blind) | low | reject | Mirrors the established checklist/logistics routes; changes would diverge from them. |
| Spec Verification text calls the publicPlanningService failure pre-existing though this diff fixes it; sprint status lags (blind, gap) | low | reject | Fix would edit this build's spec; sprint status is synced in the next step. |

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: error count not above baseline (706 pre-existing)
- `npx jest --testPathPattern "comment|Comment|timeline|Timeline|publicPlanning"` -- expected: all new/changed tests pass (pre-existing failures: CommentDeleteButton, wishlist comments route, publicPlanningService comment_count mismatch)
- `npm run lint` -- expected: no new errors
