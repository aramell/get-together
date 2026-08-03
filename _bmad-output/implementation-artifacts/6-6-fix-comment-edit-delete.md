# Story 6.6: Fix Comment Edit & Delete (Wire Missing Routes + UI)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user who posted a comment on an event or wishlist item,
I want to actually be able to edit or delete it,
so that Stories 6.4 and 6.5 — marked `done` in sprint tracking — are actually true.

## Background: what's actually broken

Discovered while researching Story 12.3 (unrelated). Sprint tracking marks Story 6.4 (Edit Comments) and Story 6.5 (Delete Comments) `done`, but neither works end-to-end today. This is a 4-layer feature; two layers are fine, two are missing or dead:

1. **Database** — complete and correct. `010_add_edit_support_to_comments.sql` added `edited_at`/`updated_count` to both comment tables; `deleted_at` already existed. No work needed.
2. **Service layer** (`lib/services/commentService.ts`) — complete, correct, unit-tested. `editEventComment`, `editWishlistComment`, `deleteEventCommentWithAuth`, `deleteWishlistCommentService` all correctly implement creator-or-admin authorization and soft-delete. **Zero callers anywhere in `app/`** (confirmed by grep) — no route, anywhere, calls any of them.
3. **API routes** — **missing entirely.** No `PATCH`/`PUT`/`DELETE` handler exists for an individual comment anywhere in the app. No `[commentId]` route segment exists under either `events/[eventId]/comments/` or `wishlist/[itemId]/comments/`.
4. **Frontend** — split in two:
   - The pages users actually visit (`EventCommentSection.tsx` for events, `CommentItem.tsx`/`CommentSection.tsx` for wishlist items) have **zero Edit/Delete UI at all** — not broken, just never built.
   - A separate, fully-built, well-tested Edit/Delete UI chain exists (`CommentEditButton` → `CommentEditModal` → `CommentList` → `CommentsView`) but **is not rendered by any real page** — `CommentsView.tsx` has no importers anywhere in `app/` or `components/`. Its one working fetch call (`CommentsView.tsx:178-189`) also targets a route that doesn't exist and uses `PUT` instead of `PATCH`, so even if it were wired in, it would still 404 today.
   - `lib/services/__tests__/deleteComment.test.ts` itself has a broken import (`deleteEventComment` instead of the real export `deleteEventCommentWithAuth`) — 8 of 33 tests in that file currently fail.

## Acceptance Criteria

1. `PATCH /api/groups/:groupId/events/:eventId/comments/:commentId` exists, wired to `editEventComment`, same auth/error-mapping conventions as the sibling GET/POST handlers in that same route file (Bearer + `getSubFromJWT`).
2. `DELETE /api/groups/:groupId/events/:eventId/comments/:commentId` exists, wired to `deleteEventCommentWithAuth`.
3. `PATCH /api/groups/:groupId/wishlist/:itemId/comments/:commentId` exists, wired to `editWishlistComment`.
4. `DELETE /api/groups/:groupId/wishlist/:itemId/comments/:commentId` exists, wired to `deleteWishlistCommentService`.
5. `lib/services/__tests__/deleteComment.test.ts`'s broken import fixed (`deleteEventComment` → `deleteEventCommentWithAuth`); all 33 tests in that file pass.
6. `EventCommentSection.tsx` (the live event-comments UI) gains a working Edit and Delete control on each comment, visible only when `comment.created_by === userId` (or the user is a group admin), calling the new routes from AC #1/#2.
7. The wishlist comment UI (`CommentItem.tsx`/`CommentSection.tsx` — the live components rendered from `WishlistDetail.tsx`) gains the same capability, calling the new routes from AC #3/#4.
8. The orphaned `CommentsView.tsx`/`CommentList.tsx`/`CommentDeleteButton.tsx` chain is resolved — either genuinely wired into a real page (only if investigation in Task 1 finds clear evidence that was the intent), or removed with its reusable pieces (`CommentEditButton`, `CommentEditModal`) repurposed into AC #6/#7's live-component wiring. **Default to removal if the investigation is inconclusive** — do not leave it in its current unreachable, half-broken state either way.
9. No regression to existing comment posting (`POST`) or listing (`GET`) — both routes' existing tests still pass unmodified in spirit.
10. New tests for the PATCH/DELETE routes: author can edit/delete, admin can edit/delete another member's comment, non-author/non-admin gets 403, editing/deleting a nonexistent comment gets 404, deleting an already-deleted comment gets a conflict response (matching `deleteEventCommentWithAuth`'s existing `deleted_at` check).

## Tasks / Subtasks

- [ ] Task 1: Investigate the orphaned `CommentsView` chain before deciding its fate (AC: #8)
  - [ ] Run `git log --follow --oneline -- components/groups/CommentsView.tsx components/groups/CommentList.tsx` to find when/why these were added and whether any commit message or linked story explains an intended page.
  - [ ] Grep `_bmad-output/planning-artifacts/epics.md` and `ux-design-specification.md` for any "unified comments," "all comments," or similar concept that might describe an intended host page for `CommentsView`.
  - [ ] Check `app/` for any route stub or page that looks like it was meant to host a unified comment view (e.g., anything under a hypothetical `app/comments/` — confirm it doesn't exist, or find where it might).
  - [ ] **Decide based on findings**: if there's clear, specific evidence of an intended page, wire `CommentsView` into it (fixing its `PUT`→`PATCH` bug and pointing it at the new AC #1-#4 routes). Otherwise, delete `CommentsView.tsx`, `CommentList.tsx`, and their now-unreachable tests, and carry `CommentEditButton.tsx`/`CommentEditModal.tsx` forward into Task 3's work (they're solid, reusable, already-tested pieces — no need to rebuild them from scratch).
- [ ] Task 2: API routes (AC: #1, #2, #3, #4)
  - [ ] Add `app/api/groups/[groupId]/events/[eventId]/comments/[commentId]/route.ts` — `PATCH` (calls `editEventComment`) and `DELETE` (calls `deleteEventCommentWithAuth`). Match the existing sibling `route.ts` (`.../comments/route.ts`) file's auth extraction and `errorCode`→status mapping exactly (Bearer header + `getSubFromJWT`, `VALIDATION_ERROR`→400, `FORBIDDEN`→403, `NOT_FOUND`→404, else→500).
  - [ ] Add `app/api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]/route.ts` — same shape, calling `editWishlistComment`/`deleteWishlistCommentService`. Confirm the sibling `.../comments/route.ts` in this directory uses the same Bearer/JWT auth (it does — checked directly) before assuming; don't introduce a third auth pattern into this codebase.
  - [ ] Use `PATCH`, not `PUT` (matching the semantically-correct choice already made for Story 12.3's checklist-item updates) — if Task 1 decided to reuse/fix `CommentsView.tsx`'s fetch call, update it from `PUT` to `PATCH` too.
- [ ] Task 3: Fix the broken test import (AC: #5)
  - [ ] `lib/services/__tests__/deleteComment.test.ts:2` — change `deleteEventComment` to `deleteEventCommentWithAuth` (the real export from `commentService.ts:396`). Verify all 33 tests pass after the fix; do not just silence/skip the failing 8.
- [ ] Task 4: Wire Edit/Delete into the live comment UIs (AC: #6, #7, #8)
  - [ ] `components/groups/EventCommentSection.tsx`: add Edit/Delete controls per comment (reuse `CommentEditButton`/`CommentEditModal` per Task 1's decision, or build equivalent inline controls if those were deleted and Task 1 judged rebuilding directly was cleaner — use judgment, don't mechanically force reuse if it doesn't fit this component's existing structure). Gate visibility on `comment.created_by === userId` (or admin). Call the new AC #1/#2 routes.
  - [ ] Wishlist `CommentItem.tsx`/`CommentSection.tsx`: same treatment, calling AC #3/#4 routes.
  - [ ] Both should follow this app's established soft-delete UX expectation (comment marked deleted, not silently vanished — check how `deleted_at`/`getEventCommentById` filtering is already handled in the GET routes for the exact expected display behavior post-delete).
- [ ] Task 5: Tests (AC: #9, #10)
  - [ ] New route tests for both new `route.ts` files: author success, admin-override success, wrong-user 403, nonexistent-comment 404, already-deleted-comment conflict.
  - [ ] Update/extend `EventCommentSection.test.tsx`/wishlist comment component tests for the new Edit/Delete UI (button visibility gating, edit flow, delete flow, error handling).
  - [ ] Re-run `editCommentService.test.ts` (already passing, confirm still passing) and the now-fixed `deleteComment.test.ts`.
- [ ] Task 6: Verify no regressions
  - [ ] Run the full suite scoped away from `get-together-web/`; confirm 0 new failures beyond already-known pre-existing ones.
  - [ ] Confirm existing comment POST/GET flows (event and wishlist) still work unchanged.

## Dev Notes

- **This is a fix, not new scope** — Epic 6's FRs (FR46 "edit own comments", FR47 "delete own comments") were already correctly identified and partially built; this story completes what 6.4/6.5 claimed to deliver. `epics.md`'s Epic 6 definition doesn't need updating — the FRs were always accurately scoped, just not fully implemented.
- **Don't rebuild the service layer — it's already correct.** `editEventComment`, `editWishlistComment`, `deleteEventCommentWithAuth`, `deleteWishlistCommentService` (`lib/services/commentService.ts:177-274, 287-384, 396-464, 476-544`) are complete, correctly implement creator-or-admin authorization, and are already unit-tested. This story's job is exclusively: (a) call them from real routes, (b) give users a way to trigger those routes.
- **`CommentsView.tsx`'s existing fetch call is a useful reference for the URL shape**, even though it currently 404s: `` `/api/groups/${groupId}/events/${comment.target_id}/comments/${commentId}` `` / `` `/api/groups/${groupId}/wishlist/${comment.target_id}/comments/${commentId}` ``. Confirms the intended route shape already assumed by the (unreachable) frontend code — matches what Task 2 builds.
- **Ownership check for comment edit/delete already has an established shape to follow** (`commentService.ts`'s `isAuthor = comment.created_by === userId; isAdmin = userRole === 'admin'; if (!isAuthor && !isAdmin) return FORBIDDEN`) — this is already correctly implemented in the service layer, nothing new to design here, just to expose via a route.
- **Don't confuse this story's `CommentEditButton`/`CommentEditModal`/`CommentDeleteButton` with new components to build** — they already exist, are already tested, and are good building blocks regardless of what Task 1 decides about `CommentsView`/`CommentList` specifically (those two are the orphaned *page-level* pieces; the individual button/modal pieces are smaller and more obviously reusable regardless).
- **Soft-delete display behavior**: comments use `deleted_at`, not hard deletion. Check how the existing `GET` routes/queries already filter or display soft-deleted comments (`getEventCommentById`/equivalent wishlist query) to make sure the UI's post-delete behavior matches what the rest of the app already expects — don't invent new soft-delete display logic if there's already a convention from how deleted comments are (or aren't) shown in listings.

### Project Structure Notes

- New: `app/api/groups/[groupId]/events/[eventId]/comments/[commentId]/route.ts`, `app/api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]/route.ts`.
- Modified: `components/groups/EventCommentSection.tsx`, wishlist `CommentItem.tsx`/`CommentSection.tsx`, `lib/services/__tests__/deleteComment.test.ts`.
- Possibly deleted (per Task 1's investigation): `components/groups/CommentsView.tsx`, `components/groups/CommentList.tsx`, and their tests — do not delete without completing Task 1's investigation first.

### References

- [Source: lib/services/commentService.ts#L177-274, L287-384, L396-464, L476-544] — the four already-correct, already-tested, currently-unreachable service functions this story wires up
- [Source: lib/db/migrations/010_add_edit_support_to_comments.sql] — confirms DB schema is already complete
- [Source: components/groups/CommentsView.tsx#L178-189] — the broken (unreachable, wrong-method, wrong-route) fetch call whose URL shape is still a useful reference
- [Source: components/groups/EventCommentSection.tsx] — live event-comments UI to extend (currently has zero edit/delete controls)
- [Source: components/wishlist/CommentItem.tsx, components/wishlist/CommentSection.tsx] — live wishlist-comments UI to extend
- [Source: components/groups/CommentEditButton.tsx, CommentEditModal.tsx, CommentDeleteButton.tsx] — existing, tested, reusable UI pieces
- [Source: app/api/groups/[groupId]/events/[eventId]/comments/route.ts] — sibling GET/POST route whose auth/status-code conventions the new PATCH/DELETE route must match
- [Source: app/api/groups/[groupId]/wishlist/[itemId]/comments/route.ts#L36-45] — confirms this route also uses Bearer+JWT auth, same as the events comments route
- [Source: lib/services/__tests__/deleteComment.test.ts#L2] — the broken import to fix
- [Source: lib/services/__tests__/editCommentService.test.ts] — already-passing reference for how the service layer is correctly tested in isolation
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml] — 6-4/6-5 marked `done`; this story's existence and its note explain the discrepancy without altering that historical record

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created

### File List
