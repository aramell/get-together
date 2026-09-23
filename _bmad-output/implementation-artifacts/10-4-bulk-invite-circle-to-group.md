---
story_key: "10-4-bulk-invite-circle-to-group"
epic: "10"
story: "4"
title: "Bulk-Invite a Social Circle When Creating a Group"
status: "review"
created_date: "2026-06-30"
---

# Story 10.4: Bulk-Invite a Social Circle When Creating a Group

**Epic:** 10 - Social Circles
**Story Key:** 10-4-bulk-invite-circle-to-group
**Created:** 2026-06-30
**Status:** review

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

- [x] **Task 1:** Extend group creation service (`lib/services/groupServerService.ts` — see Dev Agent Record note on file location)
  - [x] 1a: `bulkInviteCircleToGroup(groupId, circleId, requestingUserId, excludedContactIds)`
  - [x] 1b: Fan out SMS invites for phone contacts
  - [x] 1c: Fan out direct membership for user contacts
  - [x] 1d: Return sent/failed counts
- [x] **Task 2:** Extend POST /api/groups to accept `circleId` and `excludedContactIds`
- [x] **Task 3:** Extend CreateGroupForm component
  - [x] 3a: Add CircleSelector sub-component (`components/circles/CircleSelector.tsx`)
  - [x] 3b: Contact preview list with individual deselect
  - [x] 3c: Show invite summary after group creation
- [x] **Task 4:** Write tests
  - [x] 4a: Group created with circle invite sends correct SMS count
  - [x] 4b: Excluded contacts not invited
  - [x] 4c: Circle unchanged after invite
  - [x] 4d: Partial failure does not block group creation

---

## Dev Agent Record

### Implementation Plan

- **Schema gap found during Dev Notes review, resolved before coding:** `social_circle_contacts` (Story 10.2) intentionally never stores a phone contact's raw number — only a one-way HMAC hash (`phone_hash`, for dedup) and a masked display string (`phone_display`). AC4 requires sending a real SMS, which needs the real number back. Flagged to the user; agreed approach was to add reversible AES-256-GCM encrypted storage (`phone_encrypted`), reusing the existing `lib/encryption/crypto.ts` pattern already used for Google Calendar OAuth refresh tokens (Story 3.5). Migration `030_add_phone_encrypted_to_circle_contacts.sql` adds the column; `circleService.addContactByPhone` now encrypts the number at add-time in addition to the existing hash/mask.
- **Dev Notes pointed at the wrong file for the server function:** the story's Dev Notes say to extend `lib/services/groupService.ts`, but that file is the client-side fetch-wrapper for groups (`'use client'`-style, no `'use server'` directive) — it has no direct DB access. The codebase already has a dedicated server-side counterpart, `lib/services/groupServerService.ts` (`'use server'`, used by API routes for DB reads), matching the naming convention used elsewhere for circle/user services. `bulkInviteCircleToGroup` was added there instead, and `POST /api/groups` calls it after `createGroupWithMembership` commits.
- `bulkInviteCircleToGroup` authorizes the requester as the circle owner, reads (never mutates) the circle's contacts, and reuses Story 9.1's magic-link flow per contact: `generateMagicToken` + `smsTokens.createToken(..., 'group', groupId)` + `sendMagicLinkSms`, gated by the same `checkAndRecordRateLimit` used by the SMS request endpoint. App-user contacts are added directly via the existing `addUserToGroup` (already idempotent via `ON CONFLICT`). Every contact is handled in a try/catch that increments `invitesFailed` instead of throwing, so one bad SMS send never blocks group creation or the rest of the batch (AC7) — the group is already committed by the time this runs (fire-and-forget, per the story's Dev Notes on the race condition).
- `CircleSelector.tsx` fetches `GET /api/circles` for the dropdown and `GET /api/circles/:id` for the contact preview on selection; deselecting a contact reports its id up via `excludedContactIds`. Used plain `<input type="checkbox">` instead of Chakra's `Checkbox` for the per-contact deselect controls — Chakra's `Checkbox` triggers a `@zag-js/focus-visible` effect that crashes under this repo's jsdom test setup (`Cannot set property focus of #<HTMLElement> which has only a getter`); no other component in the codebase exercises a real Chakra `Checkbox` in tests, so this wasn't a pre-existing solved problem. The native checkbox is fully keyboard-accessible and satisfies AC9's aria-label requirement.

### Completion Notes

- All 4 tasks/subtasks complete; all 9 ACs implemented, including the schema change needed for AC4 (see Implementation Plan).
- New/updated tests: `__tests__/migrations/030_add_phone_encrypted_to_circle_contacts.test.ts`, `__tests__/circles/bulkInviteGroup.test.ts` (8 cases covering send counts, exclusion, circle-not-mutated, partial-failure resilience, rate limiting, auth), `__tests__/components/CircleSelector.test.tsx` (4 cases covering empty state, listing, preview, deselect), `__tests__/validation/group.test.ts` (added circleId/excludedContactIds cases), `__tests__/services/circleService.test.ts` (updated `addPhoneContact` call-signature expectations for the new encrypted-phone argument).
- Full regression check: ran every test suite that imports a file this story touched (10 suites, 167 tests) — all pass except one pre-existing failure (`should reject group name with only whitespace` in `group.test.ts`) that was verified via `git stash` to already fail on `main` before this story's changes; it's a zod chaining-order bug (`.min()` runs before `.trim()`) unrelated to this story's scope and was left alone. `tsc --noEmit` and `eslint` are both clean on every file this story created or modified.
- The wider repo-wide `npx jest` run shows a large pre-existing baseline of failing suites (71 suites / 458 tests failing on `main` before this story, vs 71 suites / 448 tests on this branch with ~154 more tests total) — none of the delta traces to this story's files; see the targeted regression check above for the files that matter here.

### File List

**Files Created:**
- `lib/db/migrations/030_add_phone_encrypted_to_circle_contacts.sql`
- `components/circles/CircleSelector.tsx`
- `__tests__/circles/bulkInviteGroup.test.ts`
- `__tests__/components/CircleSelector.test.tsx`
- `__tests__/migrations/030_add_phone_encrypted_to_circle_contacts.test.ts`

**Files Modified:**
- `lib/db/queries/circles.ts` (`phone_encrypted` column plumbing)
- `lib/services/circleService.ts` (encrypt phone on add)
- `lib/services/groupServerService.ts` (`bulkInviteCircleToGroup`)
- `lib/validation/groupSchema.ts` (`circleId`/`excludedContactIds`, `invitesSent`/`invitesFailed`)
- `app/api/groups/route.ts` (calls `bulkInviteCircleToGroup` after group creation)
- `lib/services/groupService.ts` (client wrapper passes/returns the new fields)
- `components/groups/CreateGroupForm.tsx` (`CircleSelector` integration, invite summary)
- `__tests__/services/circleService.test.ts` (updated for new `addPhoneContact` signature)
- `__tests__/validation/group.test.ts` (new schema field cases)

---

## Change Log

- 2026-09-03: Implemented Story 10.4. Added reversible phone-number encryption to `social_circle_contacts` (schema gap discovered against Story 10.2's design, resolved with user sign-off) so bulk-invited phone contacts can receive a real SMS. Added `bulkInviteCircleToGroup` to `groupServerService.ts` (not `groupService.ts` as Dev Notes suggested — see Dev Agent Record). Built `CircleSelector` and wired it into `CreateGroupForm`.

---

## Status

**Current Status:** review
**Last Updated:** 2026-09-03
