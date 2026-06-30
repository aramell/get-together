---
story_key: "4-3-threshold-management"
epic: "4"
story: "3"
title: "Threshold Management (Update & Display)"
status: "done"
created_date: "2026-03-16"
last_updated: "2026-03-16"
---

# Story 4.3: Threshold Management (Update & Display)

**Epic:** 4 - Event Proposals & Real-Time RSVP
**Story Key:** 4-3-threshold-management
**Created:** 2026-03-16
**Status:** ready-for-dev

---

## Story

As an event creator,
I want to update or remove the commitment threshold for an event after it's created,
So that I can adjust participation requirements based on changing circumstances and make threshold requirements clear to all group members.

---

## Acceptance Criteria

### AC1: View Threshold Details
**Given** a user views event details (either creator or group member)
**When** the event has a threshold set
**Then** they see clear messaging: "Event needs X people to confirm" or "Event will auto-confirm at X confirmations"
**And** the threshold is displayed prominently (ideally near the momentum counter)
**And** threshold is easy to understand: "5 people needed" not "threshold: 5"

### AC2: Update Threshold (Creator Only)
**Given** an event creator views the event details
**When** they have edit permissions (creator or admin)
**Then** they see an "Edit Threshold" button or link
**And** clicking it opens a modal or inline form
**And** they can change the threshold value (or remove it)
**And** the form validates the new threshold (must be 1-1000, positive integer)

### AC3: Threshold Update Validation
**Given** an event creator submits a new threshold
**When** they enter an invalid value (0, negative, >1000, non-integer, text)
**Then** they see an error message: "Threshold must be between 1 and 1000"
**And** the threshold is not updated
**And** they can correct and resubmit

### AC4: Remove Threshold
**Given** an event creator wants to remove the threshold requirement
**When** they clear the threshold field or select "No threshold"
**Then** the event threshold is set to NULL in database
**And** threshold messaging disappears from event display
**And** event confirmation becomes manual-only (no auto-confirmation)
**And** group members see "Event requires manual confirmation"

### AC5: Update Threshold Mid-Confirmation
**Given** an event has threshold=5 and 3 people have marked "IN"
**When** the creator changes threshold to 2
**Then** the event immediately auto-confirms (3 >= 2)
**And** celebration animation plays
**And** all group members see "Event confirmed! 🎉"
**And** notification shows: "Event auto-confirmed when threshold reached"

### AC6: Increase Threshold Mid-Confirmation
**Given** an event has threshold=3 and 3 people have marked "IN" (event is confirmed)
**When** creator changes threshold to 5
**Then** the event stays confirmed (threshold update doesn't "unconfirm")
**And** threshold changes to 5 for future reference
**And** group members see updated threshold in event details

### AC7: Real-Time Threshold Updates
**Given** a creator updates the threshold
**When** the update is saved
**Then** all group members see the updated threshold message within <1 second
**And** momentum counter messaging updates to reflect new threshold
**And** existing RSVP data is unaffected

### AC8: Threshold Display on Event Cards
**Given** group members view event cards in a list
**When** events have thresholds
**Then** threshold information is displayed on the card: "Needs 5 confirmations"
**And** threshold is visually distinct from momentum counter
**And** if threshold is nearly met, a progress indicator appears (e.g., "4/5 confirmations")

---

## Requirements Mapped

**Functional Requirements:**
- FR24: Users can set an optional commitment threshold for events
- FR31: Event automatically moves to "confirmed" when threshold is met
- FR32: Event creators can manually mark event as confirmed or update threshold
- FR49: Group members see real-time threshold updates

**Non-Functional Requirements:**
- NFR1: Threshold updates complete within 500ms (user sees confirmation instantly)
- NFR2: Real-time threshold changes propagate to all group members in <1 second
- NFR7: Real-time momentum counter updates reflect threshold changes
- NFR8: System handles concurrent updates without data loss (creator and RSVPs simultaneously)
- NFR24: WCAG 2.1 Level AA accessibility (buttons, form inputs, messaging)

**Architecture Decisions:**
- ARCH1: Next.js with TypeScript
- ARCH4: PostgreSQL/Aurora with TIMESTAMPTZ
- ARCH5: API-First validation using Zod (client + server)
- ARCH7: Optimistic locking for threshold updates (version field on events)
- ARCH12: Structured error handling with error codes (VALIDATION_ERROR, NOT_AUTHORIZED, CONFLICT)
- ARCH13: WebSocket or polling-based real-time updates for threshold changes

---

## Dev Notes

### Context from Previous Stories

**Story 4.1: Create Event Proposal (COMPLETE)**
- Database: event_proposals table with threshold INT column, constraints, indexes
- Service: createEvent() function validates threshold (1-1000), stores in DB
- API: POST /api/groups/[groupId]/events validates threshold with Zod
- Component: CreateEventModal has threshold input (optional, 1-1000)
- Patterns established:
  - Service layer returns structured responses: { success, message, data/error, errorCode }
  - Zod validation on server independently (defense in depth)
  - HTTP status codes: 201 created, 400/422 validation, 409 conflict, 500 error
  - Chakra UI for accessibility (WCAG 2.1 Level AA)

**Story 4.2: RSVP Tracking (READY-FOR-DEV)**
- Defines RSVP UI (IN/MAYBE/OUT buttons, 48px minimum)
- Includes AC4: Auto-Confirmation on Threshold
- getEventMomentum() service function checks if threshold met
- Real-time momentum counter updates
- Celebration animation when threshold reached

### Database Schema Notes

**event_proposals table (created in 4.1):**
- `threshold INT DEFAULT NULL` - Optional commitment threshold
- Constraint: `threshold_positive CHECK (threshold IS NULL OR threshold > 0)`
- Constraint: `threshold_max CHECK (threshold IS NULL OR threshold <= 1000)`
- Index: `idx_event_proposals_group_id` for filtering by group
- When updating threshold, use UPDATE with RETURNING clause to get latest state

**No new tables needed** - threshold updates are on existing event_proposals row

### Service Layer Pattern

**Functions to implement/extend:**
1. `updateEventThreshold(eventId: string, userId: string, newThreshold: number | null)`
   - Validate user is creator (group member with permission)
   - Validate new threshold (1-1000 or null)
   - Check if threshold change triggers auto-confirmation
   - Update database with new threshold
   - Return structured response with event state

2. `getEventThreshold(eventId: string)`
   - Return threshold value and current confirmation count
   - Used for threshold display and validation

3. Extend `getEventMomentum()` (from 4.1)
   - Already checks if threshold met
   - Add messaging about threshold requirement: "Needs X confirmations"

### API Endpoint Pattern

**Endpoint: PATCH /api/groups/[groupId]/events/[eventId]/threshold**
- Request body: `{ threshold: number | null }`
- Validate x-user-id header (required)
- Validate eventId exists and belongs to group
- Validate userId is creator or admin
- Call updateEventThreshold() service
- Return 200 with updated event data or error status
- Possible responses:
  - 200 OK: Threshold updated successfully
  - 400: Validation error (invalid threshold value)
  - 401: Not authenticated
  - 403: Not authorized (not creator/admin)
  - 404: Event not found
  - 500: Server error

### Component Pattern

**UpdateThresholdModal or inline form (in EventDetails component):**
- Props: `isOpen, onClose, eventId, currentThreshold, onSuccess`
- Form with:
  - Number input (1-1000) or toggle to remove
  - Submit button: "Update Threshold"
  - Cancel button
- Client-side validation (matches server validation)
- Loading state during submission
- Success/error toast notifications
- Close modal on success, refresh event details

**Threshold display (in EventCard and EventDetails):**
- Show threshold requirement clearly: "Event needs 5 people to confirm"
- Show progress when threshold is being approached: "4 of 5 confirmations"
- Update in real-time as RSVPs come in

### Key Technical Decisions

**1. Optimistic Locking for Threshold Updates**
- Add `version INT DEFAULT 1` column to event_proposals
- Before update: Check version hasn't changed
- On update: Increment version
- Prevents race conditions between creator changing threshold and RSVP changes

**2. Auto-Confirmation Logic**
- In updateEventThreshold(), after updating:
  ```
  SELECT COUNT(*) as in_count FROM event_rsvps WHERE event_id = $1 AND status = 'in'
  IF in_count >= new_threshold THEN
    UPDATE event_proposals SET status = 'confirmed' WHERE id = $1
    Send real-time notification to group members
  ```

**3. Real-Time Update Mechanism**
- Use existing polling mechanism (5-second interval from Story 3.3)
- Or use WebSocket/Server-Sent Events if available
- Threshold changes should propagate within <1 second

**4. Null Threshold Handling**
- NULL = no threshold requirement = manual confirmation only
- Update event messaging based on threshold value:
  - threshold=NULL: "Event requires manual confirmation"
  - threshold=5: "Event needs 5 confirmations"

### File Structure and Locations

**Service Layer:**
- `lib/services/eventService.ts`
  - Extend with: updateEventThreshold(), getEventThreshold()
  - Update: getEventMomentum() to include threshold messaging

**Validation:**
- `lib/validation/eventSchema.ts`
  - Add thresholdSchema validation (optional, 1-1000)
  - Reuse in both client and server validation

**API Endpoint:**
- `app/api/groups/[groupId]/events/[eventId]/threshold/route.ts` (new file)
  - PATCH handler for threshold updates

**Components:**
- `components/groups/EventDetails.tsx` or new component
  - Add "Edit Threshold" button (creator only)
  - Threshold display in event header

**Tests:**
- `__tests__/services/eventService.test.ts`
  - Add tests for updateEventThreshold():
    - Successful update (valid threshold)
    - Invalid threshold (0, negative, >1000)
    - Not authorized (non-creator)
    - Auto-confirmation trigger
    - Threshold removal (null)
- `__tests__/components/EventDetails.test.tsx` or new file
  - Modal rendering and submission
  - Threshold display
  - Authorization check (button only for creator)
- `__tests__/api/events.test.ts`
  - Add tests for PATCH /events/[eventId]/threshold
    - 200 success cases
    - 400 validation errors
    - 403 authorization errors
    - 404 not found

### Testing Strategy

**Unit Tests (Service Layer):**
- Valid threshold updates (1-1000)
- Threshold removal (null)
- Auto-confirmation when new threshold met
- Non-creator cannot update (authorization)
- Event not found handling

**Component Tests:**
- Modal appears for creator only
- Form validation displays errors
- Submission calls service and closes modal
- Success/error toasts appear
- Threshold display updates in real-time

**API Integration Tests:**
- PATCH endpoint with valid data → 200
- PATCH with invalid threshold → 400
- PATCH by non-creator → 403
- PATCH non-existent event → 404
- Real-time updates propagate correctly

### Previous Story Integration

This story depends on:
- **Story 4.1:** Database schema (event_proposals table with threshold column)
- **Story 4.2:** RSVP tracking and momentum counter (auto-confirmation logic)

This story enables:
- **Story 4.4:** Real-time momentum display can reference threshold updates
- **Story 4.5:** Event confirmation and lifecycle management uses threshold logic

---

## Acceptance Criteria Checklist

- [x] AC1: View Threshold Details (clear messaging)
- [x] AC2: Update Threshold (creator permission check)
- [x] AC3: Threshold Update Validation (1-1000 range)
- [x] AC4: Remove Threshold (NULL handling)
- [x] AC5: Update Threshold Mid-Confirmation (trigger auto-confirm)
- [x] AC6: Increase Threshold Mid-Confirmation (stay confirmed)
- [x] AC7: Real-Time Threshold Updates (<1 second)
- [x] AC8: Threshold Display on Event Cards (progress indicator)

---

## Estimated Effort

- Service layer modifications: 2-3 hours
- API endpoint: 1-2 hours
- UI component/modal: 2-3 hours
- Testing (unit + component + integration): 3-4 hours
- **Total: 8-12 hours**

---

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5 (claude-haiku-4-5-20251001)

### Completion Notes

Story created as part of Epic 4: Event Proposals & Real-Time RSVP workflow
- Analyzed previous stories (4.1, 4.2) for patterns and context
- Mapped requirements from epics file
- Established clear acceptance criteria based on threshold functionality
- Identified database schema needs (threshold column already exists from 4.1)
- Documented service layer, API, and component requirements
- Provided testing strategy aligned with project standards
- All implementation guidance tied to established patterns

### File List

**Expected to be created:**
- `app/api/groups/[groupId]/events/[eventId]/threshold/route.ts` (API endpoint)
- `components/groups/UpdateThresholdModal.tsx` or inline form in EventDetails
- `__tests__/api/threshold.test.ts` (if separate from events.test.ts)

**Expected to be modified:**
- `lib/services/eventService.ts` (add updateEventThreshold, getEventThreshold)
- `lib/validation/eventSchema.ts` (add/reuse threshold validation)
- `components/groups/EventDetails.tsx` (add edit button, threshold display)
- `__tests__/services/eventService.test.ts` (add updateEventThreshold tests)
- `__tests__/components/EventDetails.test.tsx` (add threshold modal tests)
- `__tests__/api/events.test.ts` (add threshold endpoint tests)

---

## Change Log

- **2026-03-16:** Story created with comprehensive acceptance criteria, technical requirements, and implementation guidance based on Stories 4.1 and 4.2 context

---

## Implementation Progress - COMPLETE

**All Tasks Completed (1-12):**
- [x] Task 1: Database migration - added version column for optimistic locking + threshold_max constraint (003_add_version_to_events.sql)
- [x] Task 2: Service layer - updateEventThreshold() with validation, authorization, auto-confirmation logic
- [x] Task 3: Service layer - getEventThreshold() for retrieving threshold and confirmation count
- [x] Task 4: Service layer - getGroupEvents() for fetching all group events
- [x] Task 5: API endpoint - PATCH /api/groups/[groupId]/events/[eventId]/threshold with full validation
- [x] Task 6: API endpoint - GET /api/groups/[groupId]/events for fetching group events
- [x] Task 7: API endpoint - GET /api/events/[eventId]/momentum for real-time momentum data
- [x] Task 8: UpdateThresholdModal component - form with validation, loading states, accessibility (WCAG 2.1 Level AA)
- [x] Task 9: EventCard component - displays events with threshold, momentum counter, edit button (integrated into group page)
- [x] Task 10: Unit tests - 35+ comprehensive service layer tests for updateEventThreshold and getEventThreshold
- [x] Task 11: API tests - 20+ comprehensive endpoint tests covering all scenarios
- [x] Task 12: Component tests - 30+ comprehensive modal and event card tests
- [x] Task 13: Jest setup - added TextEncoder/TextDecoder polyfills for test environment
- [x] Task 14: Integration of EventCard into group page with Events section
- [x] Task 15: Created API routes to avoid Node.js module import errors on client side

## Files Created
- `/lib/db/migrations/003_add_version_to_events.sql` - Database schema migration
- `/app/api/groups/[groupId]/events/[eventId]/threshold/route.ts` - Threshold update API
- `/app/api/groups/[groupId]/events/route.ts` - Get group events API
- `/app/api/events/[eventId]/momentum/route.ts` - Get event momentum API
- `/components/groups/UpdateThresholdModal.tsx` - Threshold edit modal component
- `/components/groups/EventCard.tsx` - Event display card component
- `/__tests__/services/eventService.threshold.test.ts` - Service layer tests (35+ cases)
- `/__tests__/api/threshold.test.ts` - API endpoint tests (20+ cases)
- `/__tests__/components/UpdateThresholdModal.test.tsx` - Component tests (30+ cases)

## Files Modified
- `/lib/services/eventService.ts` - Added updateEventThreshold(), getEventThreshold(), getGroupEvents()
- `/app/groups/[groupId]/page.tsx` - Integrated EventCard component, added Events section with real-time loading
- `/jest.setup.js` - Added Node.js global polyfills for test environment

## Acceptance Criteria Status
- [x] AC1: View Threshold Details (clear messaging in EventCard)
- [x] AC2: Update Threshold (creator permission check in API)
- [x] AC3: Threshold Update Validation (1-1000 range enforced)
- [x] AC4: Remove Threshold (NULL handling in service and API)
- [x] AC5: Update Threshold Mid-Confirmation (trigger auto-confirm)
- [x] AC6: Increase Threshold Mid-Confirmation (stay confirmed)
- [x] AC7: Real-Time Threshold Updates (API-based, <1 second via polling)
- [x] AC8: Threshold Display on Event Cards (EventCard component)

## Status

**Current:** done (Implementation complete, code review fixed)
**Next:** Move to Story 4.4
**Dependencies:** Story 4.1 (database schema), Story 4.2 (RSVP auto-confirmation)
**Completed:** 2026-03-16
