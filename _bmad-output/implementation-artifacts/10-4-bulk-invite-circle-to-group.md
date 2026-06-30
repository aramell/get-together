---
story_key: "10-4-bulk-invite-circle-to-group"
epic: "10"
story: "4"
title: "Bulk-Invite a Social Circle When Creating a Group"
status: "ready-for-dev"
created_date: "2026-06-30"
---

# Story 10.4: Bulk-Invite a Social Circle When Creating a Group

**Epic:** 10 - Social Circles
**Story Key:** 10-4-bulk-invite-circle-to-group
**Created:** 2026-06-30
**Status:** ready-for-dev

---

## Story

As a user creating a new group,
I want to select one of my social circles and bulk-add all its contacts as invitees,
So that I don't have to re-enter the same set of friends every time I start a new group.

---

## Acceptance Criteria

### AC1: Circle Selector in Group Creation Flow
**Given** a user is on the Create Group form
**When** they view the form
**Then** they see an optional "Invite a circle" dropdown or section below the group name field
**And** the dropdown lists all their social circles with contact counts (e.g., "Weekend Crew (6 contacts)")
**And** if they have no circles, the section shows: "No circles yet — create one in your profile" (non-blocking)

### AC2: Preview of Contacts Before Submitting
**Given** a user selects a circle from the dropdown
**When** they make the selection
**Then** a preview list expands showing the contacts in that circle (name or masked phone number)
**And** they can optionally deselect individual contacts before submitting
**And** they see the count: "Inviting 6 contacts from Weekend Crew"

### AC3: Group Creation Proceeds Normally
**Given** a user has selected a circle (and optionally deselected some contacts)
**When** they click "Create Group"
**Then** the group is created as normal (Story 2.1 flow)
**And** the selected contacts are queued for invitation immediately after group creation

### AC4: SMS Magic Link Invites Sent to Phone Contacts
**Given** the selected circle contains phone-number contacts
**When** the group is created
**Then** an SMS magic link is sent to each phone contact (reusing Story 9.1 flow)
**And** each SMS link is scoped to the new group (`target_type='group'`, `target_id=newGroupId`)
**And** each phone contact who clicks the link lands in the new group (Story 9.2 flow)
**And** SMS delivery is best-effort with standard 30s SLA (NFR30)

### AC5: In-App Invites Sent to App-User Contacts
**Given** the selected circle contains app-user contacts (added by username)
**When** the group is created
**Then** those users receive an in-app notification or are directly added to the group as members
**And** they appear in the group member list immediately

### AC6: Circle Is NOT Modified by the Invite
**Given** a user selects a circle to bulk-invite
**When** the group is created and invites are sent
**Then** the circle itself is unchanged — same contacts, same name, same data
**And** the circle can be selected for any number of future groups without restriction
**And** using the circle for this group does not lock, archive, or alter the circle in any way (FR70)

### AC7: Partial Failure Handling
**Given** some SMS messages in a bulk invite fail to deliver
**When** the group creation completes
**Then** the group is still created successfully
**And** failed SMS invites are logged (non-blocking to the user)
**And** the creator sees: "Group created. [N] invites sent, [M] failed. You can resend from the group settings."

### AC8: No Circle Selected — Normal Flow
**Given** a user creates a group without selecting a circle
**When** they submit the form
**Then** the group is created with no invites (same as Story 2.1)
**And** the circle selector is purely optional with no required selection

### AC9: Accessibility
**Given** the circle selector is visible in the Create Group form
**When** a user navigates via keyboard
**Then** the dropdown is keyboard accessible (Tab, Enter, arrow keys)
**And** the contact preview list is announced by screen readers
**And** individual deselect checkboxes have aria-labels: "Remove [name] from invite list"

---

## Requirements Mapped

**Functional Requirements:**
- FR68: Users can select a social circle when creating a group, bulk-adding all circle members as invitees in a single action
- FR70: Social circles persist independently; using a circle does not modify it

**Non-Functional Requirements:**
- NFR30: SMS delivery within 30 seconds per invite

---

## Dev Notes

### Group Creation API Extension
```
POST /api/groups
  Body: { name, description?, circleId?, excludedContactIds?: string[] }
  Response: 201 { groupId, invitesSent: N, invitesFailed: M }
```

The existing group creation endpoint (Story 2.1) is extended to accept an optional `circleId`. After creating the group, the API:
1. Fetches contacts from `social_circle_contacts` for the given circle (excluding `excludedContactIds`)
2. For phone contacts: calls `smsService.sendMagicLinkSms()` per contact with `target_type='group'`
3. For user contacts: directly inserts into `group_memberships` with role='member'
4. Returns counts of sent/failed invites

### Race Condition: Group Created Before All Invites
Group creation is committed first. Invite dispatch is fire-and-forget (no rollback if SMS fails). This ensures the group always exists even if some invites fail.

---

## Tasks/Subtasks

- [ ] **Task 1:** Extend group creation service (`lib/services/groupService.ts`)
  - [ ] 1a: `bulkInviteCircleToGroup(groupId, circleId, excludedContactIds, userId)`
  - [ ] 1b: Fan out SMS invites for phone contacts
  - [ ] 1c: Fan out direct membership for user contacts
  - [ ] 1d: Return sent/failed counts
- [ ] **Task 2:** Extend POST /api/groups to accept `circleId` and `excludedContactIds`
- [ ] **Task 3:** Extend CreateGroupForm component
  - [ ] 3a: Add CircleSelector sub-component (`components/circles/CircleSelector.tsx`)
  - [ ] 3b: Contact preview list with individual deselect
  - [ ] 3c: Show invite summary after group creation
- [ ] **Task 4:** Write tests
  - [ ] 4a: Group created with circle invite sends correct SMS count
  - [ ] 4b: Excluded contacts not invited
  - [ ] 4c: Circle unchanged after invite
  - [ ] 4d: Partial failure does not block group creation

---

## File List

**Files to Create:**
- `components/circles/CircleSelector.tsx`
- `__tests__/circles/bulkInviteGroup.test.ts`

**Files Modified:**
- `lib/services/groupService.ts`
- `app/api/groups/route.ts`
- `components/groups/CreateGroupForm.tsx`

---

## Status

**Current Status:** ready-for-dev
**Last Updated:** 2026-06-30
