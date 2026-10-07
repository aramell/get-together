---
title: '14-9 Notes and Links Widget'
type: 'feature'
created: '2026-10-07'
status: 'done'
route: 'dispatch'
baseline_commit: 'c4fbe684d6a6ae75b5bba97d7f45fec28fea8ecd'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-14-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Groups have nowhere on the event dashboard to put free-form reference info (a venue site, a reservation link, a packing note). Epic 14 also claims a new widget type can be added through the registry alone, and nothing has proved it yet.

**Approach:** Add a `notes` widget to the registry and renderers that shows shared notes and links for an event, in both the member and no-login views.

## Boundaries & Constraints

**Always:** Entries live in a new `event_notes` table (migration 041; event and group FKs with cascade delete, RLS enabled, no CHECK on widget keys). Any group member adds entries; a member edits or deletes their own; admins edit or delete any. Guests on the public link read entries and open links but cannot edit. Only `http`/`https` URLs are accepted, validated server-side, and links open with `rel="noopener noreferrer"` in a new tab. The widget appears through the registry and renderer map alone: no change to layout tables, `validateWidgetLayout`, or the layout service. Existing layouts pick it up through the layout service's existing append-missing-key behavior (visible, last). The public API never returns `group_id`.

**Never:** Add comments on notes (`commentable: false`), rich text or markdown, link previews, attachments, per-event label editing, or preset changes. Do not restyle UI or touch other widgets' data.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add entry | Member posts title, optional URL, optional text | Entry listed, newest last | 400 if title empty or over 255 chars |
| Bad URL | `javascript:...` or malformed | Rejected | 400 with message |
| Edit or delete | Author, or admin | Succeeds | 403 for another member |
| Non-member | Not in group | N/A | 403 |
| Guest view | Public token | Entries read-only, links clickable, no add/edit controls | Invalid token 404 |
| Empty | No entries | Empty-state text, add form for members | N/A |
| Existing event | Layout saved before this story | Notes widget appears last, visible | N/A |
| Event deleted | Cascade | Entries removed | N/A |


</frozen-after-approval>

## Code Map

- `lib/dashboard/widgetRegistry.ts` -- add the `notes` definition; `validateWidgetLayout` already derives its expected count from the registry.
- `components/groups/widgetRenderers.ts` -- add the renderer entry; typed by `WidgetKey`, so omission fails to compile.
- `lib/services/dashboardWidgetsService.ts` -- layout resolution.
- `lib/services/eventChecklistService.ts`, `components/groups/EventChecklist.tsx`, `app/api/groups/[groupId]/events/[eventId]/checklist`, `app/api/events/public/[publicToken]/checklist` -- closest pattern for service, widget and member/public routes.
- `lib/events/eventTypes.ts` -- presets build layouts from visible-widget lists via `layout()`; leave unchanged (Trip uses the default order and so shows notes).
- `lib/db/migrations/` -- latest is 040.
- `lib/services/dashboardWidgetsService.ts` (~line 66) -- appends missing registry keys visible; reuse, do not change.

## Tasks & Acceptance

**Execution:**
- [x] `lib/db/migrations/041_create_event_notes_table.sql` -- table (id, event_id, group_id, created_by, title, url, body, timestamps), index on event_id, RLS on -- storage
- [x] `lib/dashboard/widgetRegistry.ts`, `components/groups/widgetRenderers.ts` -- add `notes` (label "Notes & Links", commentable false, publicView true) and renderer -- the registry-only proof
- [x] `lib/services/eventNotesService.ts` (+ URL validation) -- list/create/update/delete with member/author/admin rules -- mirror `eventChecklistService.ts`
- [x] `app/api/groups/[groupId]/events/[eventId]/notes/` and `app/api/events/public/[publicToken]/notes/` -- member CRUD and guest read-only routes -- mirror checklist routes
- [x] `components/groups/EventNotes.tsx` -- widget for member and guest renders, heading via `useWidgetLabel` -- the visible change
- [x] Tests -- service, both routes, widget, registry/layout (existing layout gains `notes`) -- every matrix row

**Acceptance Criteria:**
- Given an event with a saved layout, when its dashboard loads, then Notes & Links appears last and other widgets are unchanged.
- Given a member adds an entry with a link, when the page refreshes, then members and guests both see it and the link opens safely.
- Given an admin hides the widget in customize mode, when guests load the public link, then it is absent.

### Review Findings

- [x] [Review][Patch] Notes route 500 responses leak raw DB/driver error text (medium) — `noteErrorResponse` returns `result.error` (the service's `e?.message`) on the 500 path; sibling handlers (`itemCommentHandlers.ts`) return a generic 'Internal server error'. Return a generic message, keep detail in the server log. [lib/api/notesRouteHelpers.ts:15]
- [x] [Review][Patch] Route tests don't pin service call arguments (low) — both notes route test files auto-mock `eventNotesService` and assert only status codes; dropping `url`/`body` forwarding or swapping `eventId`/`groupId` would still pass. Add `toHaveBeenCalledWith` on the success cases. [app/api/groups/[groupId]/events/[eventId]/notes/__tests__/route.test.ts, .../notes/[noteId]/__tests__/route.test.ts]
- [x] [Review][Patch] `updateEventNote` / `deleteEventNote` skip `verifyEventInGroup` (low) — notes on a soft-deleted event stay editable/deletable by the author or an admin via the API; the triage-log claim "unreachable" holds for list/add only. [lib/services/eventNotesService.ts]
- [x] [Review][Patch] Edit/Delete buttons share identical aria-labels on every row (low) — screen-reader users cannot tell which note a button affects; include the note title in the label. [components/groups/EventNotes.tsx]
- [x] [Review][Defer] Migration 041 never run against a database (unverified, would be high if it fails) — deferred: run it against a dev database; `gen_random_uuid()` is already used by migration 001 and the FK targets are the tables the service queries, so the remaining risk is small. [lib/db/migrations/041_create_event_notes_table.sql]

**Rejected:**
- Public notes exposed for soft-deleted event (edge) — false: `getEventByPublicToken` filters `deleted_at IS NULL`.
- Presets/event overrides untested with `notes` (blind) — false: `layout()` builds from `DEFAULT_WIDGET_ORDER` and appends hidden keys, so presets include `notes` automatically.
- PATCH route skips title type check (edge) — false: `normalizeFields` rejects non-string titles with 400 INVALID_TITLE.
- Double-click delete restores a deleted row (blind, edge) — false in practice: the optimistic update removes the button before a second click can land; the stale-snapshot rollback needs overlapping requests (low, rejected, already in triage log).
- Role effect omits `userId` (edge) — low, rejected: login sets `userId` and `accessToken` together and the refresh path sets them in one batch, so the race is unlikely.
- Add on cancelled event; non-member 404 vs 403; fetch failure shows empty state; stale 5-widget clients; body length before trim; edit of vanished note; silent role-fetch failure; delete confirmation / Enter-to-submit / invalid-URL message; TOCTOU; unused `requestLogin`; redundant `group_id`; RLS-without-policies; missing extra tests (blind, edge, acceptance, verification-gap) — low, rejected: unlikely in everyday use and each fix adds guards, states or branches; most already in the triage log.
- Spec `status: done` vs sprint-status `review` (blind) — rejected: the fix edits the spec.

## Implementation Notes

Implemented by a subagent from this spec; nine review patches applied (JSON 400s, vanished-row handling, guest payload without `created_by`, double-submit guard, URL credential rejection, input limits, stable ordering, service/UI test gaps). Migration 041 not run against a database. Guests stay read-only after login and notes do not poll; body/URL caps (5000/2000) were an implementation choice. Verification: tsc errors unchanged at 706; targeted suites pass (16 suites, 164 tests); lint adds only existing-style `no-explicit-any`, `require()` in tests and setState-in-effect.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---------|---------|-------|----------|
| Malformed JSON on POST/PATCH returns 500 (edge, blind) | medium | patch | `request.json()` throws inside a catch-all; client error reported as 500. |
| Update/delete report success or return undefined data when the row vanishes mid-request (edge) | medium | patch | UPDATE/DELETE results never checked; client would insert undefined into the list. |
| Guest payload includes `created_by` user IDs (blind, edge) | low | patch | Guest UI never uses it; fix is deleting a column from the SELECT and type. |
| Add/update with ok but `success:false`/missing data inserts undefined (edge) | medium | patch | Render would crash on `n.id`. |
| Double-click on Add/Save sends duplicate requests (edge) | medium | patch | No in-flight guard; duplicates created. |
| URLs with embedded credentials accepted (blind, edge) | low | patch | One-line validator addition. |
| Equal `created_at` makes order nondeterministic (edge) | low | patch | Add `id` tie-break. |
| No `maxLength` on inputs (blind, edge) | low | patch | Attributes only; server already rejects. |
| Update/delete lookup scoping, UPDATE SQL/params, and edit/delete UI untested (verification-gap) | medium | patch | Mocks return canned rows; dropping `group_id` from the lookup or breaking PATCH/DELETE passes all tests. |
| Non-members see 404 vs 403 depending on resource existence (blind, edge, verification-gap) | low | reject | Same order as sibling services; ids are UUIDs and the fix reorders every service call. |
| Fetch failure shows empty state with add form (blind, edge) | low | reject | Same as sibling widgets; needs a new error/retry state. |
| Fetch race, token-refresh spinner flicker, stale delete rollback (blind, edge) | low | reject | Needs overlapping requests; fix adds cancellation machinery. |
| Role fetched per widget via extra request (blind) | low | reject | Matches sibling widget pattern; not a defect of this change. |
| Delete lacks confirmation; identical aria-labels; invalid-URL message; Enter to submit (blind) | low | reject | Polish; no named harm. |
| No per-event cap, rate limit, or cancelled-event write check (blind) | low | reject | Matches checklist behavior; spec set no limits. |
| Guests see empty widget (blind) | low | reject | Spec requires `publicView: true`; hiding is a product choice. |
| Existing layouts gain visible Notes widget (verification-gap, blind) | false | reject | Intended by the spec (append visible, last), pinned by a test. |
| Stricter layout validation may reject stale 5-widget clients (blind) | low | reject | Registry-derived count is the 14.1 design; reconcile appends on read. |
| Soft-deleted event keeps its notes (edge claim) | low | reject | Service queries exclude soft-deleted events, so notes are unreachable; cascade covers hard delete. |
| Body length check runs before trim (edge) | low | reject | Negligible; 5000 is an arbitrary cap. |
| Save with invalid edit does nothing silently; no sign-in prompt on expired session (edge) | low | reject | Needs expired session or invalid edit; fix adds UI states. |
| API error shape inconsistencies; redundant `group_id`; stale test comment; RLS untested (blind) | low | reject | Mirrors checklist conventions; no named harm. |

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: error count not above baseline
- `npx jest --testPathPatterns "eventNotes|notes|widgetRegistry|dashboard-widgets|EventPlanningTab|PublicEventPlanning"` -- expected: no new failures
- `npm run lint` -- expected: no new errors
