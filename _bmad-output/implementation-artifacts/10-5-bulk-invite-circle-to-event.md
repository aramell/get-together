---
story_key: "10-5-bulk-invite-circle-to-event"
epic: "10"
story: "5"
title: "Bulk-Invite a Social Circle When Creating an Event"
status: "ready-for-dev"
created_date: "2026-06-30"
---

# Story 10.5: Bulk-Invite a Social Circle When Creating an Event

**Epic:** 10 - Social Circles
**Story Key:** 10-5-bulk-invite-circle-to-event
**Created:** 2026-06-30
**Status:** ready-for-dev

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

- [ ] **Task 1:** Extract shared invite logic to `lib/services/circleInviteService.ts`
  - [ ] 1a: `bulkInvite(circleId, targetType, targetId, excludedContactIds, userId)`
  - [ ] 1b: SMS dispatch for phone contacts
  - [ ] 1c: In-app notification / membership for user contacts
  - [ ] 1d: Return sent/failed counts
- [ ] **Task 2:** Extend event creation API (`app/api/groups/[groupId]/events/route.ts`)
  - [ ] 2a: Accept `circleId` and `excludedContactIds`
  - [ ] 2b: Call `circleInviteService.bulkInvite()` after event creation
- [ ] **Task 3:** Extend CreateEventModal/Form (Story 4.1 component)
  - [ ] 3a: Add CircleSelector (reuse component from Story 10.4)
  - [ ] 3b: Contact preview with individual deselect
  - [ ] 3c: Show invite summary in success toast
- [ ] **Task 4:** Write tests
  - [ ] 4a: Event created with circle invite sends correct SMS count
  - [ ] 4b: Excluded contacts not invited
  - [ ] 4c: Circle unchanged after invite
  - [ ] 4d: Circle reusable immediately after use for a different event
  - [ ] 4e: Partial failure does not block event creation

---

## File List

**Files to Create:**
- `lib/services/circleInviteService.ts`
- `__tests__/circles/bulkInviteEvent.test.ts`

**Files Modified:**
- `app/api/groups/[groupId]/events/route.ts`
- `components/events/CreateEventModal.tsx` (or equivalent)
- `lib/services/groupService.ts` (refactor to use circleInviteService)

---

## Status

**Current Status:** ready-for-dev
**Last Updated:** 2026-06-30
