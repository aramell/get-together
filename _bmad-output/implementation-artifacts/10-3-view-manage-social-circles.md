---
story_key: "10-3-view-manage-social-circles"
epic: "10"
story: "3"
title: "View & Manage Social Circles"
status: "review"
created_date: "2026-06-30"
---

# Story 10.3: View & Manage Social Circles

**Epic:** 10 - Social Circles
**Story Key:** 10-3-view-manage-social-circles
**Created:** 2026-06-30
**Status:** review

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

- [x] **Task 1:** Extend `lib/services/circleService.ts`
  - [x] 1a: `getUserCirclesService(userId)` — list with real contact counts (was hardcoded to 0 pending this story, per Story 10.1's note)
  - [x] 1b: `getCircleDetailService(circleId, userId)` — with contacts, ownership check
  - [x] 1c: `updateCircleNameService(circleId, userId, data)` — with auth check (named/ordered to match this codebase's existing `xService(id, userId, ...)` convention from Story 10.2, not the Dev Notes' `(circleId, name, userId)`)
  - [x] 1d: `deleteCircleService(circleId, userId)` — with auth check, cascade via FK
- [x] **Task 2:** API endpoints
  - [x] 2a: `app/api/circles/route.ts` (GET already existed from Story 10.1; contact counts now real via 1a, no route change needed)
  - [x] 2b: `app/api/circles/[circleId]/route.ts` (GET, PATCH, DELETE)
- [x] **Task 3:** Build CircleList component (`components/circles/CircleList.tsx`)
  - [x] 3a: Circle cards with name, contact count, date
  - [x] 3b: Empty state
  - [x] 3c: Create Circle button
- [x] **Task 4:** Build CircleDetail component (`components/circles/CircleDetail.tsx`)
  - [x] 4a: Circle name heading with inline edit
  - [x] 4b: Contact list (reuse ContactList from Story 10.2)
  - [x] 4c: Delete circle with confirmation dialog
- [x] **Task 5:** Add Social Circles section to profile page (`app/profile/page.tsx`) — already wired in Story 10.1; no page change needed, updated `SocialCirclesSection.tsx` instead (see File List)
- [x] **Task 6:** Write tests (list, detail, edit name, delete)

---

## File List

**Files Created:**
- `app/api/circles/[circleId]/route.ts`
- `components/circles/CircleList.tsx`
- `components/circles/CircleDetail.tsx`
- `__tests__/api/circleDetail.test.ts`
- `__tests__/components/CircleList.test.tsx`
- `__tests__/components/CircleDetail.test.tsx`

**Files Modified:**
- `lib/db/queries/circles.ts` (added `getContactsByCircleId`, `updateCircleName`, `deleteCircleById`; `getCirclesByUserId` now returns real `contact_count` via LEFT JOIN)
- `lib/services/circleService.ts` (added `getCircleDetailService`, `updateCircleNameService`, `deleteCircleService`; `getUserCirclesService` now passes through real contact counts)
- `components/circles/SocialCirclesSection.tsx` (delegates card rendering to `CircleList`, adds circle-count badge (AC7), opens `CircleDetail` on card click)
- `__tests__/services/circleService.test.ts` (added coverage for the three new service functions; updated `getUserCirclesService` tests for real contact counts)
- `__tests__/components/SocialCirclesSection.test.tsx` (updated empty-state copy to match AC2 exactly; added count-badge and detail-modal tests)

**Files Not Modified (Dev Notes assumed changes that weren't needed):**
- `app/api/circles/route.ts` — GET already existed from Story 10.1 and needed no changes; contact counts became real automatically via the query-layer change.
- `app/profile/page.tsx` — `SocialCirclesSection` was already wired in from Story 10.1; this story's UI work happened inside that component and its children instead.

---

## Dev Agent Record

### Implementation Notes

- `getCirclesByUserId` now does a `LEFT JOIN` + `COUNT` against `social_circle_contacts` (added in Story 10.2) instead of the hardcoded `contactCount: 0` that Story 10.1 shipped as a placeholder.
- Circle detail is shown as a modal (`CircleDetail.tsx`), not a routed page — Dev Notes' File List/API Routes never specified a `app/circles/[circleId]/page.tsx`, and Story 10.2's Dev Agent Record already anticipated this ("a future story can compose them into an actual page without rework"). A modal satisfies every AC (heading, contacts, edit, delete-and-return-to-list) without adding routing that wasn't asked for. AC6's "direct URL" access is enforced at the API layer (`GET /api/circles/{circleId}` returns 403 for a non-owner), which is what's actually testable/relevant regardless of whether the UI uses a route.
- Reused `ContactList` and `AddContactForm` from Story 10.2 unchanged inside `CircleDetail` — "Add Contact" is a toggle button that reveals `AddContactForm` (matches AC3's literal wording, a button rather than an always-visible form).
- `updateCircleNameService`/`deleteCircleService`/`getCircleDetailService` each re-check circle ownership via `getCircleById` rather than reusing the existing `authorizeCircleOwner` helper from Story 10.2 — that helper doesn't return the circle row, which `getCircleDetailService` needs (name/timestamps). Kept the three checks as straightforward inline duplication rather than reshaping the shared helper's signature for one caller.
- AC6 (403 for non-owner) intentionally returns 403, not 404, when a circle exists but isn't owned by the requester — this reveals the circle's existence to a prober, but it's exactly what the AC specifies, and matches the precedent set by Story 10.2's `addContactByPhone`/`removeContact`.
- Refactored `SocialCirclesSection` to compose `CircleList` (cards/empty-state/create-button) and `CircleDetail` (modal), rather than inlining card markup as it did in Story 10.1. Had to change `CircleList` to accept a `loading` prop and always render (rather than being gated behind the parent's loading branch) — an early version hid the Create Circle button during the initial fetch, which is a regression from Story 10.1's original synchronous-button-visibility behavior; caught by the pre-existing 10.1 test asserting the button is visible before the list loads.
- `AC2`'s empty-state copy ("No circles yet. Create one to bulk-invite your friends.") replaces Story 10.1's placeholder copy ("You don't have any circles yet.") — updated the one 10.1 test that asserted the old string.

### Completion Notes

- All 6 tasks complete. TDD red-green followed throughout: for each new file, tests were written and confirmed failing (missing export/module errors) before implementation, then made to pass.
- 46 new/updated tests added across query, service, API route, and component layers (circleService: 38 total incl. 14 new; circleDetail API: 13 new; CircleList: 7 new; CircleDetail: 8 new; SocialCirclesSection: updated + 2 new). Full circles-feature test surface (120 tests across 11 suites, spanning Stories 10.1-10.3) passes with no regressions.
- Ran `tsc --noEmit`: no errors in any circles-related file.
- Did not re-run the full unrelated repo test suite for this story — Story 10.2's Dev Agent Record already documented and characterized the large pre-existing unrelated failure set (71 suites, e.g. group service, auth, calendar logic untouched by circles work); nothing in this story touches those areas.

---

## Change Log

- 2026-09-02: Implemented Story 10.3 — real contact counts, circle detail/rename/delete service and API layer, CircleList/CircleDetail components (detail shown as a modal rather than a routed page), and count-badge/detail-modal wiring into the existing Social Circles profile section, with full test coverage.

---

## Status

**Current Status:** review
**Last Updated:** 2026-09-02
