---
title: 'Item comment email exposure'
type: 'bugfix'
created: '2026-10-13'
status: 'done'
baseline_commit: '9ab931a5c8f1f61ba9c711be80951ab49ae1d65d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The group-scoped item-comment GET routes (timeline, checklist, logistics, poll) need no auth, yet `getItemComments` returns each commenter's `email` and `avatar_url`. Anyone holding group, event and item UUIDs can read member emails. Found in the Story 14.3 review and deferred.

**Approach:** Fix it once in the shared item-comment query layer so every item type changes together. Decision: drop `email` from the comment creator payload and keep GET public ("anyone can read" is unchanged; no auth or membership check is added).

## Boundaries & Constraints

**Always:** One fix in the shared layer (`getItemComments`, `ItemCommentRecord`, `handleGetItemComments`), not per-route. Comment display must still work for commenters without a display name. Existing add/edit/delete permissions are unchanged.

**Never:** Add a migration. Require auth or membership on GET. Touch event comments or wishlist comments in this change (decision: item comments only; log those two in `deferred-work.md` as still returning creator email). Change the guest (`/api/events/public/...`) routes, which already return first names only. Expose email through a new field or alias.

</frozen-after-approval>

## Code Map

- `lib/db/queries.ts:1539-1551` -- `ItemCommentRecord.creator` type includes `email`
- `lib/db/queries.ts:1597-1630` -- `getItemComments` selects and returns `u.email`
- `lib/db/queries.ts:~1640-1672` -- `addItemComment` also returns `creator.email` (poster's own record; keep the shape consistent)
- `lib/api/itemCommentHandlers.ts:41-63` -- shared GET handler, no auth; the four per-type route files only wrap it
- `components/groups/ItemCommentPopover.tsx:221`, `ItemCommentSection.tsx:39,228` -- display name falls back to `creator.email`; both fetch GET without auth headers
- `__tests__/db/itemComments.queries.test.ts:56-62`, `__tests__/api/timeline-comments.route.test.ts:62-74,117,241` -- assert `email` in the creator payload; other `*-comments.route.test.ts` files may too

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/queries.ts` -- remove `email` from `ItemCommentRecord.creator`, `getItemComments` and `addItemComment`
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- log that event and wishlist comments still return creator email
- [x] Comment UI components -- replace the email display fallback with the existing `'Anonymous'` label
- [x] Item-comment query and route tests -- update payload assertions and add a test that no creator email reaches the GET response

**Acceptance Criteria:**
- Given an unauthenticated request to any item-comment GET route, when it succeeds, then the response contains no commenter email address.
- Given a commenter with no display name, when the thread renders, then it shows 'Anonymous' and no email.
- Given the existing add, edit, delete and guest flows, when the suite runs, then they behave as before.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Other consumers of `creator.email` may remain (blind) | false | reject | Repo grep finds only `EventCommentSection.tsx:245` (event comments, out of scope, logged in deferred-work); `ItemComment`/`ItemCommentRecord` no longer type the field. |
| Mock rows lack an email, so the no-leak assertions cannot fail (blind, edge) | false | reject | The GET mock rows set `email: 'a@example.com'` (e.g. timeline test lines 62, 118, 242) and the tests assert it is absent from the body. |
| Edit/PATCH path untested for email leaks (blind) | false | reject | `updateItemComment` returns `id, content, edited_at, updated_count` only; no creator or email. |
| Null display name now renders "Anonymous" (blind, edge, gap) | false | reject | Specified fallback, decided in the approved spec. |
| Whitespace-only `display_name` renders blank (edge) | low | reject | Needs a user to save a blank name; fix adds a branch in two components. |
| `not.toContain('email')` SQL check is brittle and case-sensitive (blind, edge) | low | reject | Test-hygiene only; the paired body assertion on a seeded email catches a real leak. |
| `avatar_url` and `created_by` still public (blind, edge) | low | reject | Chosen scope: GET stays public with names and avatars; `created_by` drives the edit/delete UI. |
| Old 14.3 deferred entry now overlaps the new one (blind) | low | reject | Documentation only; editing existing deferred entries is not allowed by the process. |
| Event/wishlist reachability unverified (blind) | low | reject | Deferral is the decided scope (2A); the fix lives in other epics' code. |
| Spec manual-check grep still matches `EventCommentSection.tsx:245` (edge) | false | reject | That is an event comment, not an item comment; the check says "no item-comment hits". |

## Verification

**Commands:**
- `npx jest --testPathPattern "comment|Comment"` -- expected: all pass apart from the known pre-existing failures
- `npx tsc --noEmit` -- expected: error count not above baseline

**Manual checks (if no CLI):**
- `grep -rn "creator.email\|u.email" lib/db/queries.ts components/groups` -- expected: no remaining item-comment hits
