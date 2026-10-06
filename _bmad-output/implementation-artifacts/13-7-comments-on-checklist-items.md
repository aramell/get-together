---
title: 'Comments on Checklist Items'
type: 'feature'
created: '2026-09-24'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 1
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-13-context.md', '{project-root}/_bmad-output/implementation-artifacts/spec-13-6-general-trip-comment-access.md']
baseline_commit: '71ab512'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Checklist items on the event dashboard are not commentable; group members cannot discuss individual to-dos (e.g., "who's bringing the tent?") without leaving comments on the event itself or using an external chat. This fragments trip logistics discussion and violates the epic's goal of a single, unified dashboard view.

**Approach:** Add comments support to checklist items using a dedicated `checklist_comments` table (mirroring `event_comments`/`wishlist_comments`). Build a reusable comment popover/modal component — icon always visible on every item, showing a count badge once comments exist — that previews on focus/click and opens a full read/write thread in a modal. Guests (no-login view) get read-only access; attempting to add a comment prompts login.

## Boundaries & Constraints

**Always:**
- `checklist_comments` table mirrors `event_comments`/`wishlist_comments`: `id`, `checklist_item_id` FK `ON DELETE CASCADE`, `group_id` FK, `created_by VARCHAR(128)` (matches `users.id`, **not** `UUID` — see Code Map), `content`, `created_at`, `updated_at`, `edited_at`, `updated_count`, `deleted_at`; same CHECK constraints and partial index `WHERE deleted_at IS NULL` as the siblings.
- **Resolved intent gap (2026-10-05):** the comment icon is always visible on every checklist item. With 0 comments it renders without a count badge; clicking/focusing it opens the popover/modal in an empty state ready for the first comment. Once ≥1 comment exists, the badge shows the count.
- Reusable `ChecklistCommentPopover` built in this story, reused by 13.8–13.10 for Logistics/Timeline/Polls (generic `itemId`, `itemType`, `fetchCommentsUrl`/`addCommentUrl` props).
- Icon sits in the item's trailing area (right side), consistent with edit/delete controls.
- Popover preview opens on focus or click (not hover alone); click-outside or Escape closes it.
- Guests (public-link view) see the icon and a read-only preview/thread; attempting to add/edit/delete prompts login.
- Edit/delete are creator+admin only; the host component must pass the current user's *real* role (`members.find(m => m.user_id === userId)?.role ?? null`), never a hardcoded value.
- All comments use the Story 13.2 5s-polling pattern for live sync.

**Never:**
- No changes to `event_comments`/`wishlist_comments` tables, APIs, or `EventCommentSection` itself.
- No polymorphic/shared comments table — own table per item type.
- No new permissions, rate limiting, moderation, or validation rules beyond the existing `content` rules.
- Comments are discussion only, not a substitute for item metadata (due date, assignee, checked state).
- Do not model the integration point on `EventDetail.tsx`'s modal-button wiring — that route is orphaned from the live dashboard; integrate into `EventChecklist.tsx`'s own render path.
- Do not add Postgres RLS ownership policies — this codebase only ever does `ENABLE ROW LEVEL SECURITY` with zero `CREATE POLICY` statements (app connects as table owner; RLS only blocks other Postgres roles).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Item has 0 comments | Member views item | Icon visible, no badge; click/focus opens popover/modal in empty state ready to post | N/A |
| Member posts first comment | Modal open, empty state, submits | Comment posted, appears immediately, badge now shows "1"; all viewers sync within ~5s | POST failure → toast |
| Item has N comments | Member views item | Icon with "N" badge; click/focus → preview of most recent + "View all" | N/A |
| Member edits/deletes own comment | Modal open | Change reflected immediately, syncs within ~5s | Failure → toast |
| Escape pressed | Popover or modal open | Closes cleanly, no side effects, focus returns to trigger | N/A |
| Guest (no-login) views item, any comment count | Valid `public_token` | Icon visible (badge if count > 0); click opens read-only preview/thread; attempting to add → login prompt | N/A |

</frozen-after-approval>

## Code Map

- `lib/db/migrations/013_create_users_table.sql` -- `users.id VARCHAR(128)` is the PK (Cognito sub); **no `sub` column exists**.
- `lib/db/migrations/022_fix_user_reference_column_types.sql` -- the exact UUID→VARCHAR(128) fix already applied to `event_comments`/`wishlist_comments.created_by`; this story's new table must be created correctly as `VARCHAR(128)` from the start, not UUID.
- `lib/db/migrations/010_add_edit_support_to_comments.sql` -- reference for the `edited_at`/`updated_count` columns the new table needs from the start.
- `lib/db/migrations/012_enable_rls_default_deny.sql`, `033_create_group_dashboard_widgets_table.sql` -- the bare `ENABLE ROW LEVEL SECURITY;`-only pattern to copy (no policies).
- `lib/services/eventService.ts:962-1047` (`getEventComments`) -- copy its flat-SQL→nested-`creator`-object shaping (`creator: { display_name, email, avatar_url }`), and its join `created_by = u.id`.
- `lib/services/eventService.ts:1144-1147` (`addEventComment`) -- **known-bad pattern, do not copy**: looks up the creator via `WHERE sub = $1` against a table with no `sub` column. New code must use `WHERE id = $1`.
- `lib/validation/commentSchema.ts` -- add a new `checklistCommentSchema`/`validateChecklistCommentInput` (own `checklist_item_id` field), following the existing `commentSchema`/`wishlistCommentSchema` copy structure; not a drop-in generic reuse.
- `components/groups/EventCommentSection.tsx` -- structure to mirror for `ChecklistCommentSection`: props incl. `userRole?: 'admin' | 'member' | null`; `canModify = isAdmin || comment.created_by === userId`; 5s poll; optimistic post/edit/delete; `CommentEditModal`/delete `AlertDialog`.
- `components/groups/EventChecklist.tsx:36-43,69,73` -- `GroupMember.role` exists on `members` but is currently unused; derive the acting user's real role from it when rendering `ChecklistCommentPopover`. No separate `ChecklistItem.tsx` component exists — items render inline here.
- `components/groups/EventChecklist.tsx:55-65` (`EventChecklistProps`, guest path) -- a true guest has no `groupId`/`resolvedGroupId` until post-login, so the group-scoped comments route is unreachable for them; guest comment data must come from the public-token-gated path below instead.
- `lib/services/publicPlanningService.ts:15-20` (`PublicChecklistItem`) -- add `comment_count: number`, populated via a `COUNT(*)` subquery against `checklist_comments WHERE deleted_at IS NULL`, matching this file's existing first-name-only/no-raw-id convention.
- `app/api/events/public/[publicToken]/checklist/[itemId]/comments/route.ts` -- **new**, guest-readable GET only (resolves group/event from the public token server-side, no auth header required), returning the same guest-safe shape (first-name creator, no raw `created_by`); mirrors the existing no-auth-on-GET convention already used by group-scoped comment routes.
- `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/comments/route.ts` + `.../[commentId]/route.ts` -- **new**, GET/POST and PATCH/DELETE, mirroring the event-comments route pair.
- `lib/db/queries.ts` -- add `getChecklistComments`, `addChecklistComment`, `updateChecklistComment`, `deleteChecklistComment` (same signatures/error-handling as event counterparts, with the `id`-not-`sub` and nested-`creator` fixes baked in).

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/034_create_checklist_comments_table.sql` -- create table per Boundaries (VARCHAR(128) `created_by`, `edited_at`, `updated_count`, partial index, bare RLS enable) -- fixes the type/column gaps found in the prior attempt's review
- [x] `lib/validation/commentSchema.ts` -- add `checklistCommentSchema` / `validateChecklistCommentInput`
- [x] `lib/db/queries.ts` -- add the four checklist-comment functions, creator lookup by `id`, nested `creator` object in GET
- [x] `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/comments/route.ts` -- GET, POST
- [x] `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/comments/[commentId]/route.ts` -- PATCH, DELETE (creator+admin only)
- [x] `lib/services/publicPlanningService.ts` -- add `comment_count` to `PublicChecklistItem` + its query
- [x] `app/api/events/public/[publicToken]/checklist/[itemId]/comments/route.ts` -- new guest-readable GET
- [x] `components/groups/ChecklistCommentSection.tsx` -- new, mirrors `EventCommentSection`, takes real `userRole` prop
- [x] `components/groups/ChecklistCommentPopover.tsx` -- new, icon always visible (badge iff count > 0), generic reusable props
- [x] `components/groups/EventChecklist.tsx` -- integrate popover per item (both member and guest render paths), derive real `userRole` from `members`
- [x] `__tests__/components/ChecklistCommentPopover.test.tsx` -- zero-comment empty-state entry, badge-at-count behavior, focus/Escape, guest read-only
- [x] `__tests__/components/ChecklistCommentSection.test.tsx` -- add/edit/delete/polling/error-toast
- [x] `__tests__/api/checklist-comments.route.test.ts` -- GET/POST/PATCH/DELETE incl. creator-lookup-by-id and nested-creator-shape assertions, plus the new public GET route

**Acceptance Criteria:**
- Given a checklist item with 0 comments, when a member views it, then the comment icon is visible without a badge, and opening it shows an empty state ready for the first comment.
- Given a member posts a comment, when it succeeds, then it appears immediately and all group members see it within ~5s.
- Given a member edits/deletes their own comment, then the change reflects immediately and syncs within ~5s to all viewers.
- Given a non-admin, non-creator member, when viewing another member's comment, then no edit/delete controls render (role is read from real group membership, not hardcoded).
- Given a guest on the public link, when viewing any checklist item, then the icon (with badge if applicable) is visible and opens a read-only thread; attempting to add a comment prompts login.

## Implementation Notes

## Spec Change Log

- **2026-10-05** — Review pass 1 found an intent_gap (frozen spec contradicted itself on whether the comment icon shows with 0 comments) plus 12 other findings, several exposing real bugs in the `event_comments` pattern this story was copying (creator lookup by non-existent `sub` column; `created_by` type mismatch; no real-role wiring; guests never seeing the icon at all). Code reverted to baseline per workflow; this spec re-derived with the human's resolution (icon always visible, badge only when count > 0) folded into the frozen block, and the Code Map/Tasks updated to build the corrected patterns in directly rather than relying on a later patch pass. **KEEP:** the dedicated-table-per-item-type approach, the popover-then-modal UX, the reusable-component-for-13.8–13.10 design, and the 5s-polling reuse — all validated, none of this caused the review findings.

## Review Triage Log

### Review pass 1 (2026-10-05)

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `checklist_comments.created_by` declared `UUID`; `getChecklistComments` joins it to `users.id` (`VARCHAR(128)`); migration omits `edited_at`/`updated_count` that `getChecklistComments`/`getChecklistCommentById`/`updateChecklistComment` all select/update | high | patch | Migration 022 already fixed this exact UUID/VARCHAR mismatch for `event_comments`/`wishlist_comments`; migration 034 reintroduces it. Migration 010 added `edited_at`/`updated_count` to the sibling tables; 034 never got them. Every GET/PATCH on checklist comments will throw a Postgres column/type error. |
| 2 | GET route (`.../comments/route.ts`) returns flat `display_name`/`avatar_url`, but `ChecklistCommentSection.tsx:247` / `ChecklistCommentPopover.tsx:175` read `comment.creator?.display_name`; GET also drops `totalCount` from `getChecklistComments`'s return | high | patch | Sibling `getEventComments` (`lib/services/eventService.ts:1019-1029`) maps the same flat SQL columns into a nested `creator` object before returning — the established pattern this story should have followed. Without the fix, every comment renders "Anonymous" after the first 5s poll overwrites the correctly-shaped POST response. |
| 3 | POST creator lookup: `SELECT display_name, email, avatar_url FROM users WHERE sub = $1` — `users` has no `sub` column (PK is `id`) | high | patch (this story's new route) + defer (sibling) | Confirmed by reading `users` schema (`013_create_users_table.sql`). The identical bug already exists in `lib/services/eventService.ts:1145` (`addEventComment`), so it's a pre-existing pattern this story's spec told it to mirror — but it still means **every checklist comment POST 500s** on a path this story newly ships, so it's patched here. The sibling occurrence is filed to `deferred-work.md` as pre-existing, out of this story's scope. |
| 4 | Admin role hardcoded: `EventChecklist.tsx:405` passes `userRole={userId ? 'member' : null}` even though `members: GroupMember[]` already tracks real `role: 'admin' \| 'member'` | medium | patch | Spec's frozen boundary "Edit/delete remain creator+admin only" can't be exercised from this UI — admins never get edit/delete affordances on others' checklist comments, even though the backend (`commentService.ts`) checks the real role correctly. |
| 5 | Guests never see the comment icon: `fetchCommentCounts` only runs behind `canAttemptAuthenticated = Boolean(accessToken && effectiveGroupId)` (`EventChecklist.tsx:90,244`) | high | patch | Directly contradicts the frozen AC "guest opens the event via public link... the comment icon is visible." `commentCounts` stays `{}` for any real no-login guest, so `ChecklistCommentPopover` always renders `null` for them. |
| 6 | Guest click on the comment icon always fires `requestLogin` (`ChecklistCommentPopover.tsx:145`, `onClick={isGuest ? requestLogin : undefined}`) instead of opening the read-only preview | high | patch | Contradicts the frozen AC "clicking it shows a read-only preview; attempting to add a comment prompts login" — viewing and adding are conflated. The test suite (`ChecklistCommentPopover.test.tsx`) currently asserts the wrong behavior and needs updating alongside the fix. |
| 7 | Migration 034 has no `ENABLE ROW LEVEL SECURITY` statement | medium | patch | Every sibling Epic-12/13 table (migrations 012, 014–021, 024–026, 028–029, 033) enables RLS; 034 is the one gap. |
| 8 | `isLoading` state in `ChecklistCommentSection.tsx` is declared and rendered but `setIsLoading(true/false)` is never called | low | patch | Dead code; trivial direct fix (wire it around the fetch, or delete the unreachable block). |
| 9 | GET route has no auth/membership check at all | medium | defer | Verified the identical no-auth pattern already exists on the sibling `GET .../events/:eventId/comments` route — intentional, pre-existing (supports the public-link guest-read flow), not introduced by this story. |
| 10 | Three independent, uncoordinated poll/fetch paths hit the same comments endpoint (per-item count fetch on every items-change, popover fetch-on-open, modal's own 5s poll) | medium | defer | Real inefficiency, but the Design Notes already describe polling being reused per-widget rather than centrally cached, and the smallest real fix (a shared cache/dedup layer) is more than a direct correction — out of scope for this story's patch pass. |
| 11 | Spec's own Code Map lists `components/groups/ChecklistItem.tsx` and `__tests__/components/ChecklistItem.test.tsx`; neither was created — integration happened inline in `EventChecklist.tsx` instead | low | rejected | Fix would be editing this spec's Code Map; rejected per the "never patch or defer a finding whose fix is to edit this build's spec" rule. |
| 12 | Tasks & Acceptance checklist left fully unchecked despite the corresponding code existing | low | rejected | Same rule — fix is editing the spec, not the code. |
| 13 | **Zero-comment state is unreachable**: `ChecklistCommentPopover` returns `null` whenever `commentCount === 0` (`ChecklistCommentPopover.tsx:127-129`), and there is no other UI entry point to add a checklist item's first comment | high | **intent_gap** | Root cause is inside `<frozen-after-approval>`: the "Always" boundary states the icon "appears on a checklist item only when that item has at least one non-deleted comment," while the I/O matrix's "Item has 0 comments" row describes clicking an icon that boundary says can't exist yet ("No comment icon initially; clicking open popover shows empty state"). Two genuinely different, mutually exclusive resolutions are possible (e.g. "render the icon always, just without the badge" vs. "add a separate always-visible add-comment affordance") — not a single inferable reading. Per workflow, this triggers a loopback to the human before any other finding is patched. **Resolved 2026-10-05** per the human: icon always visible, badge only when count > 0 (folded into the frozen block above). Findings 1–8 were never applied to code (code was reverted) and are carried here as reference for the next review pass; the re-derived Code Map/Tasks above already build the corrected patterns in from the start. |

## Design Notes

No existing sibling pattern lets a true (pre-login) guest reach a group-scoped route — `groupId` is unknown client-side until after login (see `EventChecklist.tsx` guest path). Rather than invent group-resolution-from-public-token logic inside the existing group-scoped comments route, this story adds one small, separate public-token-gated GET endpoint for guest reads, following the same shape convention `publicPlanningService.ts` already uses elsewhere (first-name-only creator identity, no raw IDs). Guests never post/edit/delete through it — those actions always require login first.

## Verification

**Commands:**
- `npm run build` -- expect no new TypeScript errors
- `npx jest __tests__/components/ChecklistCommentPopover.test.tsx __tests__/components/ChecklistCommentSection.test.tsx __tests__/api/checklist-comments.route.test.ts` -- expect all pass
- `npm run lint` -- expect no new errors on new files

**Manual checks:**
- As a member, open a checklist item with 0 comments: icon shows without badge; add a comment; badge appears; confirm another browser session sees it within ~5s.
- As a non-creator, non-admin member, confirm no edit/delete controls on someone else's comment; as an admin, confirm they do.
- Open the public event link (no login): confirm the icon is visible on items with and without comments, the thread opens read-only, and attempting to add prompts login.

### Review pass 2 (2026-10-06) — abbreviated

Human requested a shorter review: no parallel reviewer layers. Orchestrator read the diff and spot-checked the pass-1 findings against code; targeted tests pass (60/60 across 5 suites).

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | `created_by` type, `edited_at`/`updated_count`, RLS in migration 034 | false (fixed) | Migration has VARCHAR(128), both columns, partial index, bare RLS enable. |
| 2 | Creator lookup by `id` not `sub` | false (fixed) | No `sub =` in new queries. |
| 3 | PATCH/DELETE creator+admin, scoped to item and group | false (fixed) | Route checks real role and `group_id`/`checklist_item_id` match. |
| 4 | Real role wired in `EventChecklist.tsx` | false (fixed) | `userRole={currentUserRole}`. |
| 5 | Migration 034 not run against a real Postgres; manual checks not run | medium | Needs manual verification before merge. |
| 6 | Pre-existing `npm run build` type error in `app/api/user/invitations/route.ts:55` | low | Unrelated to this story. |
