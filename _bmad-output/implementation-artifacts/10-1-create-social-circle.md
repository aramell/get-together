---
story_key: "10-1-create-social-circle"
epic: "10"
story: "1"
title: "Create a Social Circle"
status: "ready-for-dev"
created_date: "2026-06-30"
---

# Story 10.1: Create a Social Circle

**Epic:** 10 - Social Circles
**Story Key:** 10-1-create-social-circle
**Created:** 2026-06-30
**Status:** ready-for-dev

---

## Story

As a user,
I want to create a named social circle as a reusable contact list,
So that I can bulk-invite the same group of friends to multiple events and groups without reassembling the list each time.

---

## Acceptance Criteria

### AC1: Create Circle Entry Point
**Given** a logged-in user navigates to their profile
**When** they open the "Social Circles" section
**Then** they see a "Create Circle" button
**And** clicking it opens a "New Circle" form/modal

### AC2: Circle Name Field
**Given** the "New Circle" form is open
**When** the user views the form
**Then** they see a single required "Circle name" text input (max 100 characters)
**And** a "Create" button (disabled until name is non-empty)
**And** a "Cancel" button

### AC3: Successful Circle Creation
**Given** a user enters a circle name and clicks "Create"
**When** the form is submitted
**Then** a new `social_circles` record is created with `user_id = current user` and the provided name
**And** the modal closes
**And** the new circle appears in the user's circles list immediately
**And** the circle starts empty (0 contacts)
**And** they see "Circle created"

### AC4: Circle Name Validation
**Given** a user submits the form with an empty or whitespace-only name
**When** they attempt to create
**Then** they see: "Circle name is required"
**And** the circle is not created

**Given** a user enters a name longer than 100 characters
**When** they attempt to create
**Then** they see: "Circle name must be 100 characters or less"
**And** the circle is not created

### AC5: Duplicate Name Allowed
**Given** a user already has a circle named "Weekend Crew"
**When** they create another circle with the same name
**Then** both circles are created successfully as separate records
**And** no uniqueness error is shown (names are not unique constraints per user)

### AC6: Circle Persists Independently
**Given** a social circle is created
**When** it is used to invite members to a group or event (Stories 10.4, 10.5)
**Then** the circle itself is not modified, locked, or deleted
**And** the circle remains available for future use across any number of groups and events (FR70)
**And** deleting a group or event does NOT delete the circle

### AC7: Accessibility
**Given** the "New Circle" form is open
**When** a user interacts with it
**Then** the name input has an associated `<label>`
**And** error messages are announced via `aria-live="polite"`
**And** the "Create" button meets the 48px minimum touch target

---

## Requirements Mapped

**Functional Requirements:**
- FR64: Users can create a named social circle as a global, reusable contact list independent of any group or event
- FR70: Social circles persist independently of any group or event and are reusable across multiple planning contexts

---

## Dev Notes

### Database Schema
```sql
CREATE TABLE social_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(128) NOT NULL REFERENCES users(cognito_sub),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_social_circles_user_id ON social_circles(user_id);
```

### API Route
```
POST /api/circles
  Body: { name: string }
  Response: 201 { id, name, contactCount: 0, createdAt }
  Errors: 422 (validation), 401 (unauthorized)
```

---

## Tasks/Subtasks

- [ ] **Task 1:** Database migration (`migrations/0012_social_circles.sql`)
- [ ] **Task 2:** Create Zod schema (`lib/validation/circleSchema.ts`)
- [ ] **Task 3:** Create circle service function (`lib/services/circleService.ts`)
  - [ ] 3a: `createCircle(userId, name)`
- [ ] **Task 4:** API endpoint (`app/api/circles/route.ts` — POST)
- [ ] **Task 5:** Build CreateCircleModal component (`components/circles/CreateCircleModal.tsx`)
  - [ ] 5a: Name input with validation
  - [ ] 5b: Loading and success states
  - [ ] 5c: Accessibility
- [ ] **Task 6:** Add "Social Circles" section to profile page
- [ ] **Task 7:** Write tests (validation, service, API, component)

---

## File List

**Files to Create:**
- `migrations/0012_social_circles.sql`
- `lib/validation/circleSchema.ts`
- `lib/services/circleService.ts`
- `app/api/circles/route.ts`
- `components/circles/CreateCircleModal.tsx`
- `__tests__/circles/createCircle.test.ts`

---

## Status

**Current Status:** ready-for-dev
**Last Updated:** 2026-06-30
