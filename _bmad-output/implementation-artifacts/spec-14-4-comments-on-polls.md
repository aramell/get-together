---
title: '14-4 Comments on Polls'
type: 'feature'
created: '2026-10-06'
status: 'done'
baseline_commit: 'def9f35b47f6862e8951fa01016de7d25fdf6133'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Polls cannot be commented on, though checklist, logistics and timeline items can. Story 14.2 built the generic `item_comments` table and shared handlers, so the `poll` type is accepted by the schema but has no item lookup, routes or UI.

**Approach:** Register `poll` in the item lookup map, add thin per-type member and guest routes over the shared handlers, show the existing comment popover on each poll (members and guests), and include `comment_count` on poll data. No new table, no migration.

## Boundaries & Constraints

**Always:** Behavior identical to the other item comments: anyone can read (guests first-name-only, read-only; adding prompts login), members post, author or admin edit/delete, soft delete, 2000-char limit. Same URL shape: `.../polls/:itemId/comments[/:commentId]` and `/api/events/public/:token/polls/:itemId/comments`. Deleting a poll removes its `item_comments` in the same transaction. Comment counts show a badge only when above zero and update live on polling.

**Never:** Add a migration or table. Change checklist, logistics, timeline, wishlist or event comments. Change voting behavior or poll delete permissions (creator or admin today). Apply any migration to a database.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Member posts | Authenticated member, valid poll | 201 with the comment; badge count increments | N/A |
| Guest reads | Public token, poll in that event | Comments with first-name-only creators | Unknown poll 404 `NOT_FOUND`; cancelled event 410 |
| Wrong item | Poll id not in this event/group | Treated as not found | 404 `NOT_FOUND`, message "Poll not found" |
| Cross-type id | Timeline comment id on a poll URL | Treated as not found | 404 `NOT_FOUND` |
| Poll deleted | Poll with comments | Poll, options, votes and comments removed together | Rolls back together |
| Non-author edit | Member who is neither author nor admin | Rejected | 403 `FORBIDDEN` |

</frozen-after-approval>

## Code Map

- `lib/db/queries.ts:1548` -- `COMMENTABLE_ITEM_TABLES`: add `poll: 'event_polls'` (has `event_id` and `group_id`); remove the "poll: 14.4" note from the comment above it.
- `lib/api/itemCommentHandlers.ts` -- reuse unchanged; each route supplies `{ itemType: 'poll', label: 'Poll' }`.
- `app/api/groups/[groupId]/events/[eventId]/timeline/[itemId]/comments/{route.ts,[commentId]/route.ts}` -- templates for new `polls/[pollId]/comments/` routes. The existing polls folder uses `[pollId]`; sibling routes (`[pollId]/route.ts`, `vote/`) must keep that segment name, and the shared handler context still reads `itemId`, so map `pollId` to `itemId` in the wrapper.
- `app/api/events/public/[publicToken]/timeline/[itemId]/comments/route.ts` -- template for a new public `polls/[pollId]/comments/route.ts` calling `getPublicItemComments(token, 'poll', pollId)`.
- `lib/services/publicPlanningService.ts:~180,~260` -- poll SELECT gets a `comment_count` per poll (subquery on `item_comments`, `item_type = 'poll'`, `deleted_at IS NULL`); with the poll/option join the subquery must not multiply rows. Map it onto `PublicPollItem`; add `poll: 'Poll'` to `ITEM_TYPE_LABELS`.
- `lib/services/eventPollService.ts` -- `getPolls` SELECT adds `comment_count` (`COUNT(*)::int`) and `mapRow` carries it (`createPoll` returns 0); `deletePoll` wraps `DELETE FROM item_comments WHERE item_type='poll' AND item_id=$1` + poll delete in BEGIN/COMMIT/ROLLBACK like `deleteTimelineItem`; update the cascade comment.
- `components/groups/EventPolls.tsx` -- add `comment_count` to `Poll` and `GuestPoll`; `handleCommentCountChange`; render `ItemCommentPopover` (`itemType="poll"`, `itemLabel={poll.question}`) beside each question in member cards (outside the creator/admin delete gate, with `userRole`) and guest cards (`isGuest`, `onRequestLogin={requestLogin}`). `userRole` is already fetched.
- `lib/dashboard/widgetRegistry.ts` -- set `commentable: true` for `polls` (and `timeline`, stale since 14.3); update the comment and `__tests__/lib/widgetRegistry.test.ts:25` expectation.
- `components/groups/ItemCommentPopover.tsx` -- already generic with `'poll'` in its type. No change expected.
- Tests to mirror: `__tests__/api/timeline-comments.route.test.ts`, `__tests__/db/itemComments.queries.test.ts:36` (asserts `poll` throws; change to an unregistered-type case or assert `poll` resolves), `__tests__/services/eventPollService.test.ts` (list SQL, delete transaction + rollback), `__tests__/services/publicPlanningService.test.ts:81` (poll rows), `__tests__/components/EventPolls.test.tsx`.

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/queries.ts` -- register `poll` in the item table map -- no schema change
- [x] `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/comments/route.ts` and `.../[commentId]/route.ts` -- thin wrappers over shared handlers -- URLs per type
- [x] `app/api/events/public/[publicToken]/polls/[pollId]/comments/route.ts` -- guest GET -- same as timeline
- [x] `lib/services/publicPlanningService.ts`, `lib/services/eventPollService.ts` -- `comment_count` on list/public data; transactional comment cleanup on poll delete
- [x] `components/groups/EventPolls.tsx` -- comment popover for members and guests with live counts
- [x] `lib/dashboard/widgetRegistry.ts` -- mark polls and timeline commentable
- [x] Tests -- route tests (member GET/POST/PATCH/DELETE, guest GET, 404s, cross-type 404, 403), query map test, poll service (count SQL, delete transaction + rollback), public service count, `EventPolls` UI (icon on every poll incl. non-creator polls, badge only when above zero, admin moderation role passed, guest read-only preview), registry test

**Acceptance Criteria:**
- Given a poll with comments, when a member or guest views polls, then each poll shows a comment icon with a count badge, and the thread opens like checklist/logistics/timeline.
- Given a member who is not the poll's creator, when they view polls, then they can comment but see no delete-poll control.
- Given a deleted poll, when removal completes, then no `item_comments` rows remain for it.
- Given the poll widget, when a member votes or removes a vote, then voting behaves exactly as before.

## Implementation Notes

Implemented directly (no subagent). `poll` registered in `COMMENTABLE_ITEM_TABLES`; three new route files under `polls/[pollId]/comments` (member list/post, member patch/delete, guest GET). The member routes map `pollId` to the handlers' `itemId`. `comment_count` added to `getPolls` and public planning poll data; `deletePoll` now deletes `item_comments` and the poll in one BEGIN/COMMIT with ROLLBACK. `EventPolls` renders `ItemCommentPopover` for member and guest cards. `polls` and `timeline` marked `commentable: true` in the widget registry.

Deviation from the Code Map ("reuse handlers unchanged"): the I/O matrix requires the not-found message "Poll not found", but the shared handlers always build "<label> item not found". Added an optional `notFoundMessage` to `ItemCommentConfig` (existing routes unaffected) and an equivalent `ITEM_NOT_FOUND_MESSAGES` override in `getPublicItemComments`.

Verification: tsc errors unchanged at 706; eslint errors unchanged at 20 on touched files; targeted jest passes. Under full parallel load, the admin-moderation tests (EventPolls, and 14.3's EventTimeline) and one ItemCommentPopover test time out intermittently; all pass in isolation. `CommentDeleteButton` and the wishlist comments route fail on the baseline too.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Guest poll-comments 404 message "Poll not found" not asserted (verification-gap) | medium | patch | Dropping the `ITEM_NOT_FOUND_MESSAGES` override left tests green (status-only assertion). Added an `error` message assertion to the guest 404 test. |
| `notFoundMessage` set in the PATCH/DELETE route config is dead (edge) | low | patch | PATCH/DELETE go through `authorize`, which returns "Comment not found" and never reads it. Removed from that file. |
| Non-UUID `pollId` may surface as 500 not 404 (edge) | low | defer | Same behavior across all item comment routes, not caused by this story. Logged in deferred-work. |
| ROLLBACK failure masks the original error; creator/role check outside the transaction (edge, blind) | low | reject | Same pattern as `deleteLogisticsItem`/`deleteTimelineItem`, already triaged in 14.2/14.3. |
| Poll comments orphaned by event or group deletion (edge, blind) | false | reject | `item_comments.event_id` is an FK with cascade (migration 037), so event deletion removes them; spec requires only same-transaction removal on poll delete. |
| Popover URLs use undefined `effectiveGroupId` (edge) | false | reject | The member card renders only when `interactive`, which requires `groupId` or a resolved and confirmed group id. |
| Stale refetch can briefly overwrite optimistic comment count (edge) | low | reject | Self-corrects on the next 5s poll; same as checklist/logistics/timeline. |
| Spec and sprint-status disagree on status (blind) | low | reject | Sprint status is synced in the next step; fix would edit this build's spec. |
| New admin-moderation test is flaky under full parallel load (blind) | low | reject | Same test shape as 14.3's, which flakes identically on the committed baseline; passes in isolation and with 4 workers. A fix adds timeouts and splits tests. |
| Hard-deleting poll comments differs from soft delete (blind) | false | reject | Spec requires removal in the same transaction, identical to checklist/logistics/timeline. |
| Two sources of truth for the not-found message (blind) | low | reject | Drift is now pinned by the guest message assertion added above; a shared table adds indirection for one type. |
| No test ties the commentable registry flag to the lookup map (blind) | low | reject | Needs a new test harness over two hand-maintained lists; not a defect in this diff. |
| Gaps: 2000-char limit, wrong-event POST, guest write attempts, cross-type id on public path, live-count refetch (blind) | low | reject | Shared handlers carry this logic and are covered by checklist/logistics/timeline tests; no guest write routes exist. |
| Public route token check, duplicated routes, nested ternary (blind) | low | reject | Mirrors the established timeline/logistics routes; changes would diverge. |
| `comment_count` SQL: per-row subquery, `p.id` in aggregate query (blind) | false | reject | `p.id` is the primary key and in `GROUP BY p.id`, so the correlated subquery is valid; the public query takes the count from the first row per poll, so rows are not multiplied. |
| `timeline` commentable flag folded into this story (blind) | low | reject | Listed in the spec's Code Map and Tasks; the flag was stale since 14.3. |
| Long poll question may push icon off screen; long accessible name; `publicToken` undefined; optional `comment_count` (blind) | low | reject | Chakra icon buttons do not shrink and text wraps; guest branch only renders when `publicToken` is set; optional type mirrors `EventTimeline`. |

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: error count not above baseline (706 pre-existing)
- `npx jest --testPathPattern "comment|Comment|poll|Poll|publicPlanning|widgetRegistry"` -- expected: all new/changed tests pass (known pre-existing failures: CommentDeleteButton, wishlist comments route)
- `npm run lint` -- expected: no new errors
