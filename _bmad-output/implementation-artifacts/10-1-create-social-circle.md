---
story_key: "10-1-create-social-circle"
epic: "10"
story: "1"
title: "Create a Social Circle"
status: "review"
created_date: "2026-06-30"
---

# Story 10.1: Create a Social Circle

**Epic:** 10 - Social Circles
**Story Key:** 10-1-create-social-circle
**Created:** 2026-06-30
**Status:** review

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

- [x] **Task 1:** Database migration (`lib/db/migrations/028_create_social_circles_table.sql` — see Dev Notes on path correction)
- [x] **Task 2:** Create Zod schema (`lib/validation/circleSchema.ts`)
- [x] **Task 3:** Create circle service function (`lib/services/circleService.ts`)
  - [x] 3a: `createCircle(userId, name)`
- [x] **Task 4:** API endpoint (`app/api/circles/route.ts` — POST, plus GET to list circles; see Completion Notes)
- [x] **Task 5:** Build CreateCircleModal component (`components/circles/CreateCircleModal.tsx`)
  - [x] 5a: Name input with validation
  - [x] 5b: Loading and success states
  - [x] 5c: Accessibility
- [x] **Task 6:** Add "Social Circles" section to profile page
- [x] **Task 7:** Write tests (validation, service, API, component)

---

## File List

**Files Created:**
- `lib/db/migrations/028_create_social_circles_table.sql`
- `lib/validation/circleSchema.ts`
- `lib/db/queries/circles.ts`
- `lib/services/circleService.ts`
- `app/api/circles/route.ts`
- `components/circles/CreateCircleModal.tsx`
- `components/circles/SocialCirclesSection.tsx`
- `__tests__/validation/circleSchema.test.ts`
- `__tests__/services/circleService.test.ts`
- `__tests__/api/circles.test.ts`
- `__tests__/components/CreateCircleModal.test.tsx`
- `__tests__/components/SocialCirclesSection.test.tsx`

**Files Modified:**
- `app/profile/page.tsx` — mounts `SocialCirclesSection`

---

## Dev Agent Record

### Implementation Plan

- Followed the existing wishlist feature (`lib/validation/wishlistSchema.ts`, `lib/services/wishlistService.ts`, `app/api/groups/[groupId]/wishlist/route.ts`) as the closest analog for a user/group-owned named entity with Zod validation, a service-layer result shape (`{ success, message, data?, error?, errorCode? }`), and Chakra modal conventions (`components/groups/CreateEventModal.tsx`).
- DB access split into `lib/db/queries/circles.ts` (matching the newer per-feature query file convention used by `smsTokens.ts`/`invitations.ts`) rather than appending to the large `lib/db/queries.ts`.
- `contactCount` is hardcoded to 0 everywhere (no `circle_contacts` table exists yet — that's Story 10.2), so both create and list responses return 0 until that story lands.

### Completion Notes

- **Task 1 path correction:** the story's Dev Notes specified `migrations/0012_social_circles.sql`, but the actual migration runner (`scripts/migrate.js`) reads from `lib/db/migrations/`, which is already at `027_add_phone_hash_to_users.sql`. Created `028_create_social_circles_table.sql` there instead; the root `migrations/` folder is not used by any script.
- `user_id` references `users(id)` (the actual PK column name — the story's Dev Notes reference `users(cognito_sub)`, which doesn't exist; verified against `lib/db/migrations/013_create_users_table.sql`).
- **Added a GET /api/circles endpoint** (not in the original Task/File List) — AC1 requires the "Social Circles" section to show existing circles, and AC3 requires new ones to appear immediately; a list endpoint is necessary for the section to render real data on page load, not just optimistically after creation in the same session. Backed by `getUserCirclesService`.
- **Added `components/circles/SocialCirclesSection.tsx`** (not in the original File List) to hold Task 6's profile-page section: fetches the circle list, renders it, and owns the `CreateCircleModal` open state. Mounted in `app/profile/page.tsx` alongside the existing `CalendarConnectionSetting`.
- AC4's "name longer than 100 characters" is enforced three ways: the Zod schema (server), the modal's client-side validation, and the input's native `maxLength={100}` (which makes it physically impossible to type past 100 chars in the UI — the component test for this covers the truncation behavior at the input level rather than a rejected 101-char submission, since the latter is unreachable through typing).
- All tests pass (29 new tests across 5 suites). Ran the full existing suite before and after (via `git stash`/`git stash pop`) to confirm baseline: 458 pre-existing failing tests / 71 failing suites, unrelated to this story (e.g. `jsdom`'s `Response` has no static `.json()`, breaking `NextResponse.json()` in any API-route test not using the `@jest-environment node` override — same pre-existing issue documented in Story 9.1/9.3's API tests). Failure count is identical before and after this story's changes — no regressions introduced.
- `npm run lint` was already failing with 912 pre-existing problems (mostly `@typescript-eslint/no-explicit-any` on `catch (error: any)` blocks used throughout the existing codebase, e.g. `app/api/groups/[groupId]/wishlist/route.ts`). New files follow the same established `catch (error: any)` pattern for consistency; no new lint rule violations introduced beyond that existing pattern.

---

## Change Log

- 2026-09-02: Implemented Story 10.1 end-to-end (migration, schema, service, API, modal, profile section, tests). Status set to review.

---

## Status

**Current Status:** review
**Last Updated:** 2026-09-02
