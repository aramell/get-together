---
story_key: "10-5-bulk-invite-circle-to-event"
epic: "10"
story: "5"
title: "Bulk-Invite a Social Circle When Creating an Event"
status: "review"
created_date: "2026-06-30"
---

# Story 10.5: Bulk-Invite a Social Circle When Creating an Event

**Epic:** 10 - Social Circles
**Story Key:** 10-5-bulk-invite-circle-to-event
**Created:** 2026-06-30
**Status:** review

---

## Story

As a user creating an event proposal,
I want to select one of my social circles and bulk-invite all its contacts to the event,
So that I can reach the right people instantly without rebuilding the same guest list every time.

---

## Acceptance Criteria

### AC1: Circle Selector in Event Creation Flow
**Given** a user is on the Create Event form (or "Propose Event" modal)
**When** they view the form
**Then** they see an optional "Invite a circle" section below the event fields
**And** the section lists all their social circles with contact counts
**And** if they have no circles, the section shows: "No circles yet — create one in your profile" (non-blocking)

### AC2: Preview of Contacts Before Submitting
**Given** a user selects a circle from the event creation form
**When** they make the selection
**Then** a preview list shows the contacts in that circle
**And** they can deselect individual contacts before submitting
**And** they see the count: "Inviting [N] contacts from [Circle Name]"

### AC3: Event Created, Then Invites Dispatched
**Given** a user has selected a circle (with optional exclusions)
**When** they click "Create" / "Propose"
**Then** the event proposal is created as normal (Story 4.1 flow)
**And** the selected contacts are queued for invitation immediately after event creation

### AC4: SMS Magic Link Invites Sent to Phone Contacts
**Given** the selected circle contains phone-number contacts
**When** the event is created
**Then** an SMS magic link is sent to each phone contact (reusing Story 9.1 flow)
**And** each SMS link is scoped to the new event (`target_type='event'`, `target_id=newEventId`)
**And** each phone contact who clicks the link lands on the event detail and can RSVP immediately
**And** SMS delivery is best-effort with standard 30s SLA (NFR30)

### AC5: In-App Invites Sent to App-User Contacts
**Given** the selected circle contains app-user contacts
**When** the event is created
**Then** those users receive an in-app notification about the event proposal
**And** they can see and RSVP to the event if they are already a group member
**And** if they are NOT a group member, they are added to the event's guest list (event-level access)

### AC6: Circle Is NOT Modified by the Invite — Reusable Across Events
**Given** a user selects a circle to bulk-invite for an event
**When** the event is created and invites are dispatched
**Then** the circle itself is completely unchanged
**And** the circle can be used for any number of additional events in the future without restriction
**And** each usage is fully independent — no link is stored between the circle and the event (FR70)
**And** the same circle can be used for multiple concurrent events simultaneously

### AC7: Partial Failure Handling
**Given** some SMS messages in the bulk event invite fail
**When** the event creation completes
**Then** the event is still created successfully
**And** the creator sees: "Event proposed. [N] invites sent, [M] failed."
**And** failed invites do not block or roll back the event creation

### AC8: No Circle Selected — Normal Flow
**Given** a user creates an event without selecting a circle
**When** they submit the form
**Then** the event is created with no bulk invites (same as Story 4.1)
**And** the circle selector is purely optional

### AC9: Accessibility
**Given** the circle selector is visible in the Create Event form
**When** a user navigates via keyboard or screen reader
**Then** the circle dropdown is keyboard accessible
**And** the contact preview list is announced with roles and labels
**And** individual deselect checkboxes have aria-labels: "Remove [name] from invite list"

---

## Requirements Mapped

**Functional Requirements:**
- FR69: Users can select a social circle when creating an event, bulk-adding all circle members as invitees in a single action
- FR70: Social circles persist independently; a circle can be used for multiple events without modification

**Non-Functional Requirements:**
- NFR30: SMS delivery within 30 seconds per invite

---

## Dev Notes

### Event Creation API Extension
```
POST /api/groups/{groupId}/events
  Body: { title, date, threshold?, circleId?, excludedContactIds?: string[] }
  Response: 201 { eventId, invitesSent: N, invitesFailed: M }
```

The existing event creation endpoint is extended identically to the group creation extension in Story 10.4:
1. Event is created first (committed)
2. Contacts fetched from circle (excluding deselected)
3. Phone contacts → SMS magic link with `target_type='event'`
4. User contacts → in-app notification / event RSVP pre-seeding
5. Counts returned in response

### Reuse from Story 10.4
The `bulkInviteCircle()` core logic should be shared between group and event invite flows. Extract a generic `lib/services/circleInviteService.ts` that accepts `targetType: 'group' | 'event'` and `targetId`.

---

## Tasks/Subtasks

- [x] **Task 1:** Extract shared invite logic to `lib/services/circleInviteService.ts`
  - [x] 1a: `bulkInvite(circleId, targetType, targetId, groupId, requestingUserId, excludedContactIds)`
  - [x] 1b: SMS dispatch for phone contacts
  - [x] 1c: In-app notification / membership for user contacts
  - [x] 1d: Return sent/failed counts
- [x] **Task 2:** Extend event creation API (`app/api/groups/[groupId]/events/route.ts`)
  - [x] 2a: Accept `circleId` and `excludedContactIds`
  - [x] 2b: Call `circleInviteService.bulkInviteCircleToEvent()` after event creation
- [x] **Task 3:** Extend CreateEventModal/Form (Story 4.1 component)
  - [x] 3a: Add CircleSelector (reuse component from Story 10.4)
  - [x] 3b: Contact preview with individual deselect
  - [x] 3c: Show invite summary in success toast
- [x] **Task 4:** Write tests
  - [x] 4a: Event created with circle invite sends correct SMS count
  - [x] 4b: Excluded contacts not invited
  - [x] 4c: Circle unchanged after invite
  - [x] 4d: Circle reusable immediately after use for a different event
  - [x] 4e: Partial failure does not block event creation

---

## Dev Agent Record

### Implementation Plan

- **Ambiguity flagged to the user before coding:** AC5 describes non-group-member app-user contacts getting "event-level access" without joining the group, but no such mechanism exists in the codebase (no guest table, and every event route authorizes off `group_memberships`). Building real event-scoped guest access would mean a new migration plus loosening authorization on ~15 event routes, none of which is listed in Tasks/Subtasks. Asked the user; agreed to mirror Story 10.4's approach instead — non-member user contacts are added to `group_memberships` on the event's parent group. This also matches an existing precedent already in the codebase: `magicLinkService.addUserToTarget` does exactly this when a user clicks an SMS magic link scoped to an event ("event pages require group membership").
- **Dev Notes pointed at the wrong file for the server function (same issue as Story 10.4):** the story's File List says to modify `lib/services/groupService.ts` and `components/events/CreateEventModal.tsx`, but the real files are `lib/services/groupServerService.ts` (server-side, `'use server'`) and `components/groups/CreateEventModal.tsx` (the actual Story 4.1 component location) — `groupService.ts` is the client-side fetch wrapper for groups, unrelated to events, and there is no `components/events/` directory.
- Extracted the group/event-agnostic core into `lib/services/circleInviteService.ts`: `bulkInvite(circleId, targetType, targetId, groupId, requestingUserId, excludedContactIds)`. `groupServerService.bulkInviteCircleToGroup` is now a thin wrapper over it (Story 10.4's behavior is unchanged — its existing test suite, `bulkInviteGroup.test.ts`, passes unmodified against the refactor). Added a parallel `bulkInviteCircleToEvent(eventId, groupId, circleId, requestingUserId, excludedContactIds)` wrapper for this story, which threads `targetType: 'event'` (so the SMS magic-link token is scoped to the event, per AC4) while still adding app-user contacts to the event's `groupId` (per the guest-access decision above).
- `POST /api/groups/[groupId]/events` accepts `circleId`/`excludedContactIds` (added to `eventCreateSchema`), strips them before calling `createEvent`, and — after the event commits — calls `bulkInviteCircleToEvent`, returning `invitesSent`/`invitesFailed` on the response exactly like the group route does (AC7). The invite call is fire-and-forget relative to event creation, same race-condition handling as Story 10.4.
- `CreateEventModal.tsx` reuses `CircleSelector` unmodified (it was already group/event-agnostic — it only knows about circles, not its caller) and surfaces the invite summary in the success toast ("Event proposed. N invites sent, M failed.") per AC7/Task 3c.
- **Pre-existing test-infra gap found while wiring the modal, fixed only where it blocked this story:** `CircleSelector` fetches `/api/circles` on mount, and jsdom's test environment has no global `fetch`. `__tests__/components/CreateEventModal.test.tsx` predates this and was already badly broken (19/32 failing before this story — its `createEvent` mock doesn't match the component, which calls `fetch` directly, an unrelated pre-existing bug left alone). Adding `CircleSelector` without a fetch stub crashed all 32 tests. Added a minimal `global.fetch` mock scoped by URL to stop the new crash; this restores the file to its exact pre-existing baseline (13/32 passing) rather than fixing the unrelated `createEvent`-mock mismatch, which is out of scope here. Real coverage for the new wiring (circle selection, exclusion, submission body, toast summary) lives in the new `__tests__/components/CreateEventModalCircleInvite.test.tsx`, which mocks `fetch` correctly end-to-end.

### Completion Notes

- All 4 tasks/subtasks complete; all 9 ACs implemented, with AC5 resolved as "add to group membership" per the user decision above rather than new event-scoped guest access.
- New tests: `__tests__/circles/bulkInviteEvent.test.ts` (9 cases covering SMS+membership counts, exclusion, circle-not-mutated, immediate reuse for a second event, partial-failure resilience, rate limiting, auth), `__tests__/components/CreateEventModalCircleInvite.test.tsx` (4 cases covering selector rendering, submission body with circleId/excludedContactIds, omission when no circle selected, toast summary).
- Regression check: ran every test suite that imports a file this story touched or that exercises the same event/group/circle code paths (services, circles, groups/events API routes, CreateGroupForm, CreateEventModal, CircleSelector — 33 suites, 624 tests). 9 suites were already failing before this story (verified via `git stash` on just this story's source changes: identical 8-suite/89-test failure count with the changes removed, plus the already-known `CreateEventModal.test.tsx` baseline) — none of the failures trace to this story's files. `tsc --noEmit` is clean on every file this story touched. `eslint` on touched files shows only the same `no-explicit-any`/`react-hooks/set-state-in-effect` patterns already present throughout the untouched codebase (e.g. `eventService.ts` alone has 44 pre-existing `no-explicit-any` errors) — nothing new introduced.
- The wider repo-wide `npx jest` run shows a large pre-existing baseline of failing suites/tests unrelated to this story (same class of issue as Story 10.4 noted: stale mocks, missing jsdom `fetch`, etc.); not attempted here as it's out of this story's scope.

### File List

**Files Created:**
- `lib/services/circleInviteService.ts`
- `__tests__/circles/bulkInviteEvent.test.ts`
- `__tests__/components/CreateEventModalCircleInvite.test.tsx`

**Files Modified:**
- `lib/services/groupServerService.ts` (`bulkInviteCircleToGroup` refactored to a thin wrapper over the new shared service)
- `lib/validation/eventSchema.ts` (`circleId`/`excludedContactIds`)
- `app/api/groups/[groupId]/events/route.ts` (calls `bulkInviteCircleToEvent` after event creation, returns invite counts)
- `components/groups/CreateEventModal.tsx` (`CircleSelector` integration, invite summary toast) — actual location of the Story 4.1 component; story's File List named `components/events/CreateEventModal.tsx`, which doesn't exist
- `__tests__/components/CreateEventModal.test.tsx` (added a `global.fetch` stub so the new `CircleSelector` mount doesn't crash the pre-existing suite; no assertions changed)

---

## Change Log

- 2026-09-03: Implemented Story 10.5. Extracted Story 10.4's bulk-invite logic into a shared `circleInviteService.ts` used by both the group and event flows. Resolved AC5's "event-level access" ambiguity with the user by reusing Story 10.4's group-membership approach (matching existing precedent in `magicLinkService.addUserToTarget`) rather than building new event-scoped guest access. Wired `CircleSelector` into `CreateEventModal.tsx` (not `components/events/CreateEventModal.tsx` as Dev Notes suggested — see Dev Agent Record).

---

## Status

**Current Status:** review
**Last Updated:** 2026-09-03
