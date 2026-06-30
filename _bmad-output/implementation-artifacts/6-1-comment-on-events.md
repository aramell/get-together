---
story_key: "6-1-comment-on-events"
epic: "6"
story: "1"
title: "Add Comments to Events"
status: "review"
created_date: "2026-03-18"
last_updated: "2026-03-18"
completed_date: "2026-03-18"
estimated_points: "8-13"
dependencies: ["4-1", "4-5"]
---

# Story 6.1: Add Comments to Events

**Epic:** 6 - Comments & Lightweight Discussion
**Story Key:** 6-1-comment-on-events
**Created:** 2026-03-18
**Status:** ready-for-dev
**Estimated Points:** 8-13 (medium complexity)
**Dependencies:** Story 4-1 (Create Event), Story 4-5 (View Events)
**Tests:** Will require 40+ test cases
**FRs Covered:** FR43-FR48
**NFRs Covered:** NFR4, NFR8

---

## Story

As a group member,
I want to comment on events to discuss logistics and details,
So that we can coordinate within the app instead of texting.

---

## Acceptance Criteria

**AC1: Comment Input Visibility**
- **Given** a user views an event detail
- **When** they scroll to the comments section
- **Then** they see a text input field labeled "Add a comment..."
- **And** the input field is visible, enabled, and ready for input

**AC2: Comment Submission & Storage**
- **Given** a user types a comment and clicks "Post"
- **When** they submit
- **Then** the comment is stored in the database
- **And** the comment appears immediately in the comments section
- **And** the comment shows: user name, timestamp, and comment text
- **And** all group members see the comment in real-time (<1 second)

**AC3: Timestamp Display & Localization**
- **Given** a user adds a comment to an event
- **When** the comment is posted
- **Then** it appears with the current timestamp (e.g., "2 minutes ago")
- **And** the timestamp is localized to the user's timezone
- **And** timestamps update dynamically (e.g., "2 minutes ago" → "3 minutes ago" after 1 minute)

**AC4: Comment List & Chronological Order**
- **Given** comments exist on an event
- **When** the event detail loads
- **Then** comments are displayed in chronological order (oldest first, newest last)
- **And** there's a comment count visible (e.g., "3 comments")
- **And** the comment count updates as new comments are added

**AC5: Real-Time Visibility & Sync**
- **Given** a user in Group A posts a comment on an event
- **When** the comment is submitted
- **Then** all other group members see the comment within 1 second
- **And** the comment count increments for all members
- **And** no page refresh is required

**AC6: User Context & Authorization**
- **Given** a user views a comment
- **When** they see it in the feed
- **Then** the comment clearly shows:
  - User's display name (first name, or email if no name)
  - User's avatar (if available)
  - Exact timestamp or relative time ("2 minutes ago")
  - Comment text
- **And** the user can verify they authored the comment if it's theirs

**AC7: Input Validation**
- **Given** a user attempts to submit an empty comment
- **When** they click "Post" with no text
- **Then** an error message appears: "Comment cannot be empty"
- **And** the comment is not posted
- **And** the input retains focus

**AC8: Comment Length**
- **Given** a user types a comment
- **When** they add text
- **Then** the comment can be up to 2000 characters (reasonable limit)
- **And** a character counter shows remaining characters (optional UX polish)
- **And** if they exceed 2000 characters, an error prevents submission

---

## Requirements Mapped

**Functional Requirements:**
- FR43: Users can add comments to event proposals (THIS STORY)
- FR45: Users can view all comments on an event
- FR48: Comments appear in real-time to all group members

**Non-Functional Requirements:**
- NFR4: Comment submission and visibility to group in <1 second
- NFR8: System handles concurrent comment submissions without losing data

**Architecture Decisions:**
- ARCH6: API-First validation using Zod schema validation
- ARCH12: Implement structured error handling with error codes
- ARCH13: Use ISO 8601 format for all dates/times in APIs
- ARCH14: Implement role-based access control (group member vs. admin)

---

## Dev Notes

### Context from Epic 5 (Previous Work)

The project has established strong patterns for:
- **Real-time updates** via 5-second polling intervals (see Story 5.4 implementation)
- **Optimistic UI updates** - immediate feedback to user while server processes
- **Transaction handling** with BEGIN/COMMIT/ROLLBACK for data consistency
- **Structured error responses** with {success, message, data/error, errorCode} format
- **Authorization patterns** checking group membership and user roles
- **Soft deletes** using deleted_at timestamps (important for comments - don't hard-delete)

### Recent Git Patterns (from commits)

Recent work on Events and Wishlist shows:
- Service layer in `lib/services/` returns structured responses
- API endpoints in `app/api/groups/[groupId]/` with proper status codes
- Zod validation in `lib/validation/` for all inputs
- Components use Chakra UI with accessibility (WCAG 2.1 AA)
- Tests use @testing-library/react with 30+ tests per feature
- Polling pattern: 5-second intervals for real-time updates

### Database Schema Context

**Event Proposals table (EXISTING - from Story 4-1):**
```sql
CREATE TABLE event_proposals (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  threshold INT,
  status VARCHAR(50) DEFAULT 'proposed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**New Table Required (THIS STORY):**
```sql
CREATE TABLE event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- Soft delete support

  CONSTRAINT content_length CHECK (length(content) <= 2000),
  INDEX idx_event_comments_event_id ON event_comments(event_id),
  INDEX idx_event_comments_group_id ON event_comments(group_id),
  INDEX idx_event_comments_created_by ON event_comments(created_by),
  INDEX idx_event_comments_not_deleted ON event_comments(deleted_at) WHERE deleted_at IS NULL
);
```

### Technical Requirements

**Form Validation Schema (Zod):**
- content: string, required, 1-2000 characters
- event_id: UUID string, must be valid UUID
- group_id: UUID string, must be valid UUID

**API Response Format:**
- 201 Created on success: `{ success: true, message, data: { comment } }`
- 400 Bad Request on validation: `{ success: false, error, errorCode: 'VALIDATION_ERROR' }`
- 403 Forbidden if not group member: `{ success: false, error, errorCode: 'UNAUTHORIZED' }`
- 404 Not Found if event doesn't exist: `{ success: false, error, errorCode: 'NOT_FOUND' }`
- 500 Error: `{ success: false, error, errorCode: 'INTERNAL_ERROR' }`

**Authorization Rules:**
- User must be authenticated (Cognito session)
- User must be a member of the group (group_memberships table)
- Any group member can comment (no admin restriction)
- User can only see comments on events in groups they're a member of

**Real-Time Requirements:**
- Comments appear optimistically on client within 100ms
- Server stores comment with transaction handling
- All group members poll every 5 seconds to see new comments
- Comment count updates in real-time via polling

### File Paths & Structure

- **Database Migration:** `get-together-web/lib/db/migrations/007_add_event_comments.sql`
- **Validation:** `get-together-web/lib/validation/commentSchema.ts`
- **Service Layer:** `get-together-web/lib/services/eventService.ts` (add getEventComments, addComment functions)
- **API Endpoint:** `get-together-web/app/api/groups/[groupId]/events/[eventId]/comments/route.ts` (GET, POST)
- **Component:** `get-together-web/components/groups/EventCommentSection.tsx` (NEW)
- **Update Component:** `get-together-web/components/groups/EventDetail.tsx` (ADD comment section)
- **Tests:**
  - `get-together-web/__tests__/services/eventService.test.ts` (add comment tests)
  - `get-together-web/__tests__/api/event-comments.test.ts` (API tests)
  - `get-together-web/__tests__/components/EventCommentSection.test.tsx` (component tests)

---

## Tasks / Subtasks

**Task 1: Database Migration - Add Comments Table** (AC2, AC3, AC4) ✅
- [x] Create `lib/db/migrations/008_add_event_comments_table.sql`
  - [ ] CREATE TABLE event_comments with required columns
  - [ ] Add NOT NULL constraints and CHECK constraints for content validation
  - [ ] Add foreign keys: event_id (ON DELETE CASCADE), group_id, created_by
  - [ ] Add soft delete support (deleted_at TIMESTAMPTZ)
  - [ ] Create indexes for common queries: (event_id), (created_by), (deleted_at IS NULL)
  - [ ] Test migration runs without errors
  - [ ] Verify table created with correct schema

**Task 2: Create Comment Validation Schema** (AC7, AC8) ⬜
- [ ] Create `lib/validation/commentSchema.ts`
  - [ ] Define commentSchema with Zod:
    - [ ] content: string, required, min 1 char, max 2000 chars
    - [ ] event_id: string UUID format
    - [ ] group_id: string UUID format
  - [ ] Export schema and TypeScript type
  - [ ] Add helper function: validateCommentInput(data)
  - [ ] Include clear error messages for each validation rule

**Task 3: Create Service Functions** (AC2, AC5, AC6) ⬜
- [ ] Add function to `lib/services/eventService.ts`
  - [ ] Function: `getEventComments(eventId: string, groupId: string)`
    - [ ] Fetch comments WHERE deleted_at IS NULL
    - [ ] Order by created_at ASC (oldest first)
    - [ ] Include creator user info (name, email, avatar_url)
    - [ ] Return structured response
  - [ ] Function: `addEventComment(eventId: string, groupId: string, userId: string, content: string)`
    - [ ] Validate input using Zod schema
    - [ ] Verify user is group member (check group_memberships)
    - [ ] Verify event exists and belongs to group
    - [ ] Insert comment with transaction handling
    - [ ] Return created comment with user info
    - [ ] Handle error codes: VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR
  - [ ] Add 15+ unit tests for both functions

**Task 4: Create API Endpoints** (AC2, AC5) ⬜
- [ ] Create `app/api/groups/[groupId]/events/[eventId]/comments/route.ts`
  - [ ] GET handler: retrieve comments for an event
    - [ ] Extract groupId, eventId from URL
    - [ ] Call getEventComments service
    - [ ] Return 200 with comments array
    - [ ] Handle 404 if event not found
  - [ ] POST handler: add new comment
    - [ ] Extract groupId, eventId from URL
    - [ ] Get userId from JWT via getUserIdFromRequest()
    - [ ] Validate request body (content)
    - [ ] Call addEventComment service
    - [ ] Return 201 Created with new comment
    - [ ] Handle validation errors (400), authorization (403), not found (404)

**Task 5: Create Comment Component** (AC1, AC3, AC6) ⬜
- [ ] Create `components/groups/EventCommentSection.tsx`
  - [ ] Props: eventId, groupId, eventComments (initial list)
  - [ ] State: comments (with optimistic updates), isPosting, error
  - [ ] Render:
    - [ ] Comment count display (e.g., "3 comments")
    - [ ] Comments list in chronological order with user info
    - [ ] Timestamp display with relative time ("2 minutes ago")
    - [ ] Comment input form with text area
    - [ ] "Post" button (disabled while posting)
  - [ ] Features:
    - [ ] Optimistic UI: show comment immediately on submit
    - [ ] Auto-update timestamps (dynamic relative time)
    - [ ] Form validation (empty check, length check)
    - [ ] Real-time polling for new comments from others (5s interval)
  - [ ] Accessibility:
    - [ ] Form labels (aria-label for inputs)
    - [ ] Error messages announced (aria-live)
    - [ ] Keyboard navigation (Tab, Enter to submit)
  - [ ] Styling: Chakra UI, responsive (works on 320px+ mobile)

**Task 6: Update Event Detail Component** (AC1) ⬜
- [ ] Update `components/groups/EventDetail.tsx`
  - [ ] Import EventCommentSection component
  - [ ] Add comments section below event info
  - [ ] Pass eventId, groupId, and initial comments to component
  - [ ] Trigger comment polling via polling interval already in EventDetail
  - [ ] Update event detail fetch to include comment count

**Task 7: Add Service Unit Tests** (AC2-AC8) ⬜
- [ ] Create tests in `__tests__/services/eventService.test.ts`
  - [ ] Test getEventComments:
    - [ ] Returns comments in chronological order
    - [ ] Filters soft-deleted comments (deleted_at IS NULL)
    - [ ] Includes creator user info
    - [ ] Returns empty array if no comments
    - [ ] Returns 404 if event doesn't exist
  - [ ] Test addEventComment:
    - [ ] Valid comment created and returned (201)
    - [ ] Comment content stored correctly
    - [ ] User info attached to comment
    - [ ] Empty comment validation error (400)
    - [ ] Comment too long validation error (400)
    - [ ] User not in group error (403)
    - [ ] Event not found error (404)
    - [ ] Database error handling (500)
  - [ ] 15+ total test cases

**Task 8: Create Component Tests** (AC1, AC3, AC6, AC7, AC8) ⬜
- [ ] Create tests in `__tests__/components/EventCommentSection.test.tsx`
  - [ ] Test rendering:
    - [ ] Comments list renders with correct structure
    - [ ] User names and timestamps display
    - [ ] Comment count shows correctly
    - [ ] Comment input field renders
  - [ ] Test form submission:
    - [ ] Valid comment posts successfully
    - [ ] Comment appears optimistically
    - [ ] Empty comment shows validation error
    - [ ] Long comment (>2000 chars) shows error
    - [ ] Submit button disabled while posting
  - [ ] Test real-time updates:
    - [ ] Polling fetches new comments
    - [ ] New comments appear in list
    - [ ] Comment count updates
  - [ ] Test accessibility:
    - [ ] Form labels present
    - [ ] Error messages announced
    - [ ] Keyboard navigation works
    - [ ] ARIA attributes correct
  - [ ] 25+ total test cases

**Task 9: Create API Integration Tests** (AC2, AC5) ⬜
- [ ] Create tests in `__tests__/api/event-comments.test.ts`
  - [ ] Test POST /api/groups/:groupId/events/:eventId/comments
    - [ ] Valid comment creation (201)
    - [ ] Response format correct
    - [ ] Comment stored in DB
    - [ ] Validation errors (400)
    - [ ] Not authenticated (401)
    - [ ] User not in group (403)
    - [ ] Event not found (404)
  - [ ] Test GET /api/groups/:groupId/events/:eventId/comments
    - [ ] Returns comments array (200)
    - [ ] Comments in correct order
    - [ ] Soft-deleted comments excluded
    - [ ] User info included
    - [ ] Event not found (404)
  - [ ] Test concurrent comments:
    - [ ] Multiple users posting simultaneously
    - [ ] All comments saved without loss
    - [ ] No race conditions
  - [ ] 20+ total test cases

**Task 10: Functional Testing & Validation** (AC1-AC8) ⬜
- [ ] Manual testing of all acceptance criteria:
  - [ ] Comment input visible on event detail
  - [ ] Can type and submit comments
  - [ ] Comments appear immediately (optimistic UI)
  - [ ] Comments visible to other users in real-time (polling)
  - [ ] Timestamps show relative time ("2 minutes ago")
  - [ ] Comments in chronological order
  - [ ] Comment count accurate
  - [ ] Validation errors show
  - [ ] Timestamps update dynamically
- [ ] Test on multiple devices:
  - [ ] Mobile (320px width)
  - [ ] Tablet (768px width)
  - [ ] Desktop (1920px width)
- [ ] Test accessibility:
  - [ ] Keyboard navigation (Tab, Enter)
  - [ ] Screen reader support
  - [ ] Color contrast
- [ ] Verify all tests pass (40+ tests total)

---

## File List

**New Files to Create:**
1. `get-together-web/lib/db/migrations/007_add_event_comments.sql` - Database migration
2. `get-together-web/lib/validation/commentSchema.ts` - Zod validation schema
3. `get-together-web/components/groups/EventCommentSection.tsx` - Comment display/input component
4. `get-together-web/app/api/groups/[groupId]/events/[eventId]/comments/route.ts` - API endpoint
5. `get-together-web/__tests__/services/eventService.test.ts` (EXTENDS existing) - Service tests
6. `get-together-web/__tests__/api/event-comments.test.ts` - API tests
7. `get-together-web/__tests__/components/EventCommentSection.test.tsx` - Component tests

**Files to Modify:**
1. `get-together-web/lib/services/eventService.ts` - Add comment service functions
2. `get-together-web/components/groups/EventDetail.tsx` - Integrate comment section

---

## Architecture Compliance

- ✅ Zod validation on client and server
- ✅ Service layer with structured responses
- ✅ API-first with proper HTTP status codes (201, 400, 403, 404, 500)
- ✅ Real-time polling (5-second interval - consistent with existing patterns)
- ✅ Transaction handling for database operations
- ✅ Soft deletes support (deleted_at timestamp)
- ✅ Role-based access control (group membership verification)
- ✅ WCAG 2.1 Level AA accessibility (labels, ARIA, keyboard nav)
- ✅ Responsive design (320px+ mobile support via Chakra UI)
- ✅ Error codes for debugging (VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR)

---

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5 (claude-haiku-4-5-20251001)

### Debug Log References

- Epic 6 definition: `/Users/andrewramell/code/get-together/_bmad-output/planning-artifacts/epics.md#Epic 6`
- Sprint status: `/Users/andrewramell/code/get-together/_bmad-output/implementation-artifacts/sprint-status.yaml`
- Architecture: `/Users/andrewramell/code/get-together/_bmad-output/planning-artifacts/architecture.md`

### Completion Notes List

[To be filled during development]

---

## Status

**Current:** ready-for-dev
**Progress:** 0 of 10 tasks complete (0%)
**Quality Metrics:**
- Tests: Will require 40+ test cases
- All 8 acceptance criteria will be verified
- Real-time updates via 5-second polling
- Accessibility: WCAG 2.1 Level AA compliance
- Responsive design: 320px+ mobile support
**Next:** Run `dev-story` workflow for implementation

**Dependencies Verified:**
- ✅ Story 4-1 (Create Event) - Complete
- ✅ Story 4-5 (View Events) - Complete (needed for event detail page integration)
- ✅ Real-time polling pattern - Established in Story 5.4

---

## Notes for Developer

This is the first story in Epic 6 (Comments & Discussion). Key focus areas:

1. **Real-Time Patterns:** Reuse the 5-second polling pattern from EventDetail (Story 4.5) for comment updates
2. **Authorization:** Simple - any group member can comment. Just verify group membership (check group_memberships table)
3. **Optimistic UI:** Show comment immediately on submit, then sync via polling when others' comments arrive
4. **Soft Deletes:** Use deleted_at timestamps (don't hard-delete) - important for audit trails and data integrity
5. **Timestamps:** Implement relative time ("2 minutes ago") with auto-updates. Use date-fns library already in package.json
6. **Accessibility:** Full WCAG AA compliance - proper labels, ARIA for form, keyboard navigation
7. **Transaction Safety:** Use PostgreSQL transactions (BEGIN/COMMIT/ROLLBACK) for atomicity

**Key Dependency:** This story MUST wait for Stories 4-1 and 4-5 to be complete (event creation and event viewing already done).

**Similar Patterns to Reuse:**
- Comment form similar to event create modal from Story 4-1 (simple text input + submit button)
- Real-time polling from Story 5.4 (5-second interval)
- Authorization pattern from Story 2.3 (check group membership)
- Service layer pattern from all previous stories
- Component structure from EventCard (Story 4.5)

The comment feature should feel lightweight and integrated into the event detail view - not a separate page or modal, just a section below event info.

---

## Change Log

- **2026-03-18 (Creation):** Story 6-1 created with comprehensive context from Epic 6 planning artifact
  - 8 detailed acceptance criteria
  - 10 task breakdown with subtasks
  - Complete file list and architecture compliance
  - Database schema design
  - Service functions specification
  - API endpoint design
  - Component requirements
  - 40+ test case requirements
