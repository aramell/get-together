---
story_key: "10-3-view-manage-social-circles"
epic: "10"
story: "3"
title: "View & Manage Social Circles"
status: "ready-for-dev"
created_date: "2026-06-30"
---

# Story 10.3: View & Manage Social Circles

**Epic:** 10 - Social Circles
**Story Key:** 10-3-view-manage-social-circles
**Created:** 2026-06-30
**Status:** ready-for-dev

---

## Story

As a user,
I want to view all my social circles and manage them from my profile,
So that I can keep my contact lists organized and ready to use.

---

## Acceptance Criteria

### AC1: Social Circles Listed on Profile
**Given** a logged-in user navigates to their profile page
**When** they view the "Social Circles" section
**Then** they see a list of all circles they own
**And** each circle shows: name, contact count (e.g., "5 contacts"), and date created
**And** they see a "Create Circle" button at the top

### AC2: Empty State
**Given** a user has no social circles yet
**When** they view the Social Circles section
**Then** they see: "No circles yet. Create one to bulk-invite your friends."
**And** a "Create Circle" button is prominently displayed

### AC3: Open Circle Detail
**Given** a user clicks on a circle in their list
**When** the circle detail view loads
**Then** they see the circle name as the heading
**And** they see all contacts in the circle (name/number, contact type)
**And** they see "Add Contact" and "Edit Circle Name" buttons

### AC4: Edit Circle Name
**Given** a user is on the circle detail page
**When** they click "Edit Circle Name"
**Then** an inline edit field appears pre-filled with the current name
**And** they can change the name and click "Save"
**And** the updated name appears immediately
**And** they see "Circle name updated"
**And** the same validation rules apply (required, max 100 chars)

### AC5: Delete Circle
**Given** a user is on the circle detail page
**When** they click "Delete Circle"
**Then** they see a confirmation: "Delete [Circle Name]? This will not affect any existing group or event memberships."
**And** on confirm, the circle and all its contacts are deleted (cascade)
**And** they are redirected back to the Social Circles list
**And** they see "Circle deleted"
**And** past invitations sent using this circle are NOT undone

### AC6: Circle Ownership — Cannot View Others' Circles
**Given** a user attempts to access another user's circle via direct URL
**When** the API processes the request
**Then** they receive a 403 Forbidden response
**And** no circle data is returned

### AC7: Circle Count Badge in Profile Nav
**Given** a user has social circles
**When** they view their profile nav or settings
**Then** the "Social Circles" section shows a count badge (e.g., "3 circles")
**And** the badge updates immediately when a circle is created or deleted

### AC8: Accessibility
**Given** a user views the Social Circles list and detail
**When** they navigate with keyboard or screen reader
**Then** circle cards are navigable by Tab
**And** each circle card announces: "[Circle Name], [N] contacts"
**And** the Delete button has aria-label: "Delete circle [Circle Name]"
**And** success/error messages use `aria-live="polite"`

---

## Requirements Mapped

**Functional Requirements:**
- FR67: Users can view and manage all their social circles from their profile
- FR70: Social circles persist independently of any group or event and are reusable across multiple planning contexts

---

## Dev Notes

### API Routes
```
GET /api/circles
  Response: 200 [{ id, name, contactCount, createdAt }]
  Auth: required (returns only circles owned by current user)

GET /api/circles/{circleId}
  Response: 200 { id, name, contacts: [...], createdAt, updatedAt }
  Errors: 403 (not owner), 404

PATCH /api/circles/{circleId}
  Body: { name: string }
  Response: 200 { id, name, updatedAt }
  Errors: 422, 403, 404

DELETE /api/circles/{circleId}
  Response: 200 { success: true }
  Errors: 403, 404
```

---

## Tasks/Subtasks

- [ ] **Task 1:** Extend `lib/services/circleService.ts`
  - [ ] 1a: `getUserCircles(userId)` — list with contact counts
  - [ ] 1b: `getCircleDetail(circleId, userId)` — with contacts, ownership check
  - [ ] 1c: `updateCircleName(circleId, name, userId)` — with auth check
  - [ ] 1d: `deleteCircle(circleId, userId)` — with auth check, cascade via FK
- [ ] **Task 2:** API endpoints
  - [ ] 2a: `app/api/circles/route.ts` (GET — list)
  - [ ] 2b: `app/api/circles/[circleId]/route.ts` (GET, PATCH, DELETE)
- [ ] **Task 3:** Build CircleList component (`components/circles/CircleList.tsx`)
  - [ ] 3a: Circle cards with name, contact count, date
  - [ ] 3b: Empty state
  - [ ] 3c: Create Circle button
- [ ] **Task 4:** Build CircleDetail component (`components/circles/CircleDetail.tsx`)
  - [ ] 4a: Circle name heading with inline edit
  - [ ] 4b: Contact list (reuse ContactList from Story 10.2)
  - [ ] 4c: Delete circle with confirmation dialog
- [ ] **Task 5:** Add Social Circles section to profile page (`app/profile/page.tsx`)
- [ ] **Task 6:** Write tests (list, detail, edit name, delete)

---

## File List

**Files to Create:**
- `app/api/circles/[circleId]/route.ts`
- `components/circles/CircleList.tsx`
- `components/circles/CircleDetail.tsx`
- `__tests__/circles/viewManageCircles.test.ts`

**Files Modified:**
- `app/api/circles/route.ts` (add GET)
- `lib/services/circleService.ts`
- `app/profile/page.tsx`

---

## Status

**Current Status:** ready-for-dev
**Last Updated:** 2026-06-30
