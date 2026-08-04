# Story 6.6: Fix Comment Edit & Delete (Wire Missing Routes + UI)

Status: review

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

- [x] Task 1: Investigate the orphaned `CommentsView` chain before deciding its fate (AC: #8)
  - [x] Run `git log --follow --oneline -- components/groups/CommentsView.tsx components/groups/CommentList.tsx` to find when/why these were added and whether any commit message or linked story explains an intended page.
  - [x] Grep `_bmad-output/planning-artifacts/epics.md` and `ux-design-specification.md` for any "unified comments," "all comments," or similar concept that might describe an intended host page for `CommentsView`.
  - [x] Check `app/` for any route stub or page that looks like it was meant to host a unified comment view (e.g., anything under a hypothetical `app/comments/` — confirm it doesn't exist, or find where it might).
  - [x] **Decide based on findings**: no evidence of an intended host page found anywhere (`CommentsView` had zero importers, epics.md/UX spec only describe comments rendered inline on event/wishlist pages). Deleted `CommentsView.tsx`, `CommentList.tsx`, and their tests, plus `CommentFilterPanel.tsx`/`CommentSearchBox.tsx` (comment-specific, only ever used by `CommentsView`, so they'd become newly orphaned too) and their tests. Carried `CommentEditButton`/`CommentEditModal`/`CommentDeleteButton`/`CommentEditIndicator` forward into Task 4.
- [x] Task 2: API routes (AC: #1, #2, #3, #4)
  - [x] Added `app/api/groups/[groupId]/events/[eventId]/comments/[commentId]/route.ts` — `PATCH` (calls `editEventComment`) and `DELETE` (calls `deleteEventCommentWithAuth`), matching the sibling route's Bearer+`getSubFromJWT` auth and `errorCode`→status mapping (`VALIDATION_ERROR`→400, `FORBIDDEN`→403, `NOT_FOUND`→404, `CONFLICT`→409, else→500).
  - [x] Added `app/api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]/route.ts` — same shape, calling `editWishlistComment`/`deleteWishlistCommentService`, matching that directory's Bearer/JWT auth and `{success, message, errorCode}` response shape.
  - [x] Used `PATCH`, not `PUT`.
- [x] Task 3: Fix the broken test import (AC: #5)
  - [x] `lib/services/__tests__/deleteComment.test.ts` — fixed the `deleteEventComment` → `deleteEventCommentWithAuth` import and all call sites (left `queriesModule.deleteEventComment` — the real, correctly-named db-layer mock target — untouched). All 28 tests in the file now pass (the story's estimate of "33 tests" didn't match the file's actual size, but the fix and full pass are confirmed).
- [x] Task 4: Wire Edit/Delete into the live comment UIs (AC: #6, #7, #8)
  - [x] `components/groups/EventCommentSection.tsx`: added `CommentEditButton`/`CommentEditModal`/`CommentDeleteButton`/`CommentEditIndicator` per comment, gated on `comment.created_by === userId` or `userRole === 'admin'`. `userRole` is now fetched in `EventDetail.tsx` via `/api/groups/:groupId}` (matching the existing `WishlistDetail.tsx` convention) and passed down. Also attached the missing `Authorization: Bearer` header to the existing POST call (it had none — a real, adjacent latent bug in the same function this story already had to touch for the new PATCH/DELETE calls; the established convention across `EventChecklist.tsx`/`EventTimeline.tsx`/`EventPhotoGrid.tsx` is `useAuth().accessToken` + an `authHeaders()` builder, which this component now also follows).
  - [x] Wishlist `CommentItem.tsx`/`CommentSection.tsx`: same treatment. `WishlistDetail.tsx` already fetched `userId`/`userRole`; now passes `userRole` into `CommentSection`, which builds `canModify` per comment and calls the new AC #3/#4 routes.
  - [x] Both follow the existing convention: deleted comments are hard-filtered out of `GET` listings (`deleted_at IS NULL`), no "deleted comment" placeholder anywhere else in the app — so post-delete UX is optimistic local-state removal, not a placeholder.
  - Extended `getEventComments` (`eventService.ts`) and `getWishlistCommentsService`/`getWishlistComments` (`wishlistService.ts`/`queries.ts`) to also select/return `edited_at`/`updated_count`, so the already-built `CommentEditIndicator` ("Edited Xm ago") can render — required to make the pre-existing (already-committed, previously partially-failing) `EventCommentSection.polling.test.tsx` pass, which already asserted this exact indicator behavior.
- [x] Task 5: Tests (AC: #9, #10)
  - [x] New route tests for both new `route.ts` files (author success, admin-override success, wrong-user 403, nonexistent-comment 404, already-deleted-comment conflict) — 22 tests, all passing.
  - [x] Converted `components/wishlist/__tests__/CommentComponents.test.tsx` from `vitest` (never actually ran — `vitest` isn't a project dependency) to Jest, added the `AuthContext` mock now required by `CommentSection`, fixed three pre-existing test-authoring bugs unrelated to this story (a `getByText` assertion split across sibling text nodes, an assumption that Chakra's `Spinner` exposes `role="status"` by default — it doesn't, so added the prop explicitly — and a `toHaveBeenCalledWith` assertion on a second `fetch()` argument that's never passed), and added new Edit/Delete coverage (visibility gating incl. admin override, edit flow, delete flow). 0 → 38/38 passing.
  - [x] Fixed 2 pre-existing failures in `components/groups/__tests__/EventCommentSection.polling.test.tsx` (6/16 failing before this story): added a `CommentDeleteButton` mock (its real `@chakra-ui/icons` import broke this file's Chakra mock, which doesn't export `createIcon`) and fixed the file's `CommentEditIndicator` mock to only render when `editedAt` is truthy (matching the real component's behavior) plus one assertion needing a `waitFor` wrapper.
  - [x] Re-ran `editCommentService.test.ts` (25 tests, unaffected) and the now-fixed `deleteComment.test.ts` (28 tests).
- [x] Task 6: Verify no regressions
  - [x] Ran the full suite (scoped away from the gitignored, stray nested `get-together-web/` copy via `--testPathIgnorePatterns`, which jest's default config otherwise happily includes). Spot-verified the three suspect pre-existing-failure candidates I touched (`WishlistDetail.test.tsx`, `EventDetail.test.tsx`, `CommentDeleteButton.test.tsx`) by re-running each with my change to that specific file stashed — identical failure counts with and without, confirming none are regressions. All other ~430 pre-existing failures (accessibility, auth, logging, DB-integration, encryption) are unrelated categories untouched by this story.
  - [x] Confirmed existing comment POST/GET flows (event and wishlist) still pass unchanged (`eventService.comments.test.ts`, route tests).

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

claude-sonnet-5

### Debug Log References

- Discovered a real, adjacent latent bug in `EventCommentSection.tsx`: the existing comment-posting `fetch()` call sent no `Authorization` header at all, even though every other event-planning component (`EventChecklist`, `EventTimeline`, `EventPhotoGrid`) sends `Bearer ${accessToken}`. Fixed it in passing since this story already had to touch the same function to add auth headers for the new PATCH/DELETE calls.
- `getEventComments`/`getWishlistCommentsService` didn't select `edited_at`/`updated_count`, so the already-built, already-tested `CommentEditIndicator` had nothing to render. Extended both (and the underlying `getWishlistComments` query) to select and return those columns — needed to make the pre-existing `EventCommentSection.polling.test.tsx` (which already asserted edit-indicator behavior) actually pass.
- `components/wishlist/__tests__/CommentComponents.test.tsx` had never actually run — it imported from `vitest`, which isn't a dependency of this project (only Jest is). Converted it in full.
- `jest`'s default config (and a plain `npx tsc --noEmit`) both happily pick up the gitignored, stray nested `get-together-web/` project copy in this repo, since neither `jest.config.js` nor `tsconfig.json` excludes it. This inflated an early type-check pass to ~950 "errors" and would have double-counted/contaminated test runs; all commands in this story were re-run with `--testPathIgnorePatterns="/node_modules/|get-together-web"` (tsc: filtered post-hoc) to get accurate numbers.

### Completion Notes List

- **Task 1 (AC #8):** Investigated `CommentsView.tsx`'s history and found zero importers anywhere in `app/` or `components/`, no backing API route, and no "unified comments page" concept in `epics.md` or the UX spec. Deleted `CommentsView.tsx`, `CommentList.tsx`, `CommentFilterPanel.tsx`, `CommentSearchBox.tsx`, and their four tests. Kept `CommentEditButton`/`CommentEditModal`/`CommentDeleteButton`/`CommentEditIndicator` (all independently reusable, and `CommentEditModal` is already used directly by the accessibility test suite).
- **Task 2 (AC #1-#4):** Added both `[commentId]/route.ts` files, matching each directory's existing auth/response-shape conventions exactly (the events routes use an `error` key; the wishlist routes use `message` — preserved that difference rather than unifying it).
- **Task 3 (AC #5):** Fixed the import/call-site rename in `deleteComment.test.ts`. All 28 tests pass.
- **Task 4 (AC #6-#8):** Wired real Edit/Delete controls into `EventCommentSection.tsx` and the wishlist `CommentItem.tsx`/`CommentSection.tsx`, gated on author-or-admin. `EventDetail.tsx` now fetches `currentUserRole` the same way `WishlistDetail.tsx` already did. Deletes are optimistic (removed from local state on success); no "deleted comment" placeholder, matching the app's existing `deleted_at IS NULL` filtering convention.
- **Task 5 (AC #9-#10):** Added 22 new route tests across both new endpoints. Converted and extended `CommentComponents.test.tsx` (0 → 38/38). Fixed 2 pre-existing failures in `EventCommentSection.polling.test.tsx` (6/16 → 16/16) as a byproduct of correctly implementing the edit-indicator data flow this story's UI work required.
- **Task 6:** Full-suite run confirms no regressions — spot-verified via stash/re-run on every file this story touched that already had pre-existing failures.

### File List

**Added:**
- `app/api/groups/[groupId]/events/[eventId]/comments/[commentId]/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/comments/[commentId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]/route.ts`
- `app/api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]/__tests__/route.test.ts`

**Modified:**
- `components/groups/EventCommentSection.tsx`
- `components/groups/EventDetail.tsx`
- `components/groups/WishlistDetail.tsx`
- `components/groups/__tests__/EventCommentSection.polling.test.tsx`
- `components/wishlist/CommentItem.tsx`
- `components/wishlist/CommentSection.tsx`
- `components/wishlist/__tests__/CommentComponents.test.tsx`
- `lib/db/queries.ts`
- `lib/services/__tests__/deleteComment.test.ts`
- `lib/services/eventService.ts`
- `lib/services/wishlistService.ts`

**Deleted:**
- `components/groups/CommentsView.tsx`
- `components/groups/CommentList.tsx`
- `components/groups/CommentFilterPanel.tsx`
- `components/groups/CommentSearchBox.tsx`
- `components/groups/__tests__/CommentsView.test.tsx`
- `components/groups/__tests__/CommentList.test.tsx`
- `components/groups/__tests__/CommentFilterPanel.test.tsx`
- `components/groups/__tests__/CommentSearchBox.test.tsx`

## Change Log

- 2026-08-04: Implemented Story 6.6 — added PATCH/DELETE comment routes for events and wishlist items, wired real Edit/Delete UI into the live comment components, removed the orphaned `CommentsView` chain, fixed the `deleteComment.test.ts` import bug, fixed a missing `Authorization` header on the existing comment-post call, and extended comment queries to surface `edited_at`/`updated_count` for the edit indicator. Status: ready-for-dev → review.
