---
story_key: "10-2-add-remove-circle-contacts"
epic: "10"
story: "2"
title: "Add & Remove Contacts from a Social Circle"
status: "review"
created_date: "2026-06-30"
---

# Story 10.2: Add & Remove Contacts from a Social Circle

**Epic:** 10 - Social Circles
**Story Key:** 10-2-add-remove-circle-contacts
**Created:** 2026-06-30
**Status:** review

---

## Story

As a user,
I want to add and remove contacts in my social circles,
So that my circles stay accurate and reflect who I actually want to invite together.

---

## Acceptance Criteria

### AC1: Add Contact by Phone Number
**Given** a user is viewing a social circle's detail page
**When** they click "Add Contact" and enter a phone number
**Then** the phone number is validated to E.164 format
**And** if valid, a new `social_circle_contacts` record is created
**And** the contact appears in the circle's contact list with a "phone" indicator
**And** they see "Contact added"

### AC2: Add Contact by App Username
**Given** a user is viewing a social circle's detail page
**When** they click "Add Contact" and enter an app username (display name or email)
**Then** the app looks up the user by display name or email
**And** if found, the contact is added by user ID reference
**And** the contact appears with their profile name and avatar
**And** they see "Contact added"

### AC3: Add Contact — Phone Number Validation
**Given** a user enters a phone number in the Add Contact form
**When** the phone number is not valid E.164 format
**Then** they see: "Please enter a valid phone number including country code (e.g., +1 555 000 1234)"
**And** the contact is not added

### AC4: Add Contact — App Username Not Found
**Given** a user enters a name or email that doesn't match any app user
**When** they submit
**Then** they see: "No user found with that name or email. You can still add them by phone number."
**And** the contact is not added as a username reference

### AC5: Duplicate Contact Prevention
**Given** a phone number or user is already in the circle
**When** the user tries to add the same contact again
**Then** they see: "This contact is already in this circle"
**And** no duplicate record is created

### AC6: Remove Contact
**Given** a user is viewing a social circle's contact list
**When** they click the "Remove" icon next to a contact
**Then** they see a confirmation: "Remove [name/number] from this circle?"
**And** on confirm, the `social_circle_contacts` record is deleted
**And** the contact disappears from the list immediately
**And** they see "Contact removed"

### AC7: Contact Changes Do Not Affect Past Invites
**Given** a user removes a contact from a circle
**When** that circle was previously used to invite members to a group or event
**Then** those past group/event memberships are not affected
**And** removing a contact only affects future invitations using the circle

### AC8: Accessibility
**Given** a user is adding or removing contacts
**When** they interact with the forms and buttons
**Then** all inputs have associated labels
**And** remove buttons have aria-labels: "Remove [contact name] from circle"
**And** success/error messages are announced via `aria-live="polite"`
**And** all interactive elements meet 48px touch target

---

## Requirements Mapped

**Functional Requirements:**
- FR65: Users can add contacts to a social circle by phone number or app username
- FR66: Users can remove contacts from a social circle

---

## Dev Notes

### Database Schema
```sql
CREATE TABLE social_circle_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES social_circles(id) ON DELETE CASCADE,
  contact_type VARCHAR(10) NOT NULL CHECK (contact_type IN ('phone', 'user')),
  phone_hash VARCHAR(255),           -- hashed E.164 phone (if contact_type = 'phone')
  phone_display VARCHAR(20),         -- masked display: "+1 555 ***-1234"
  user_id VARCHAR(128),              -- cognito_sub (if contact_type = 'user')
  display_name VARCHAR(255),         -- cached name for display
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(circle_id, phone_hash),
  UNIQUE(circle_id, user_id)
);
```

### API Routes
```
POST /api/circles/{circleId}/contacts
  Body: { type: 'phone' | 'user', value: string }
  Response: 201 { id, type, displayName }
  Errors: 422 (validation/duplicate), 404 (circle not found), 401

DELETE /api/circles/{circleId}/contacts/{contactId}
  Response: 200 { success: true }
  Errors: 404, 401, 403
```

### Phone Number Privacy
- Store hashed phone (SHA-256) for deduplication
- Store masked display string for UI (e.g., "+1 555 ***-1234")
- Never store or log raw phone number after hashing

---

## Tasks/Subtasks

- [x] **Task 1:** Database migration for `social_circle_contacts` (`lib/db/migrations/029_create_social_circle_contacts_table.sql` — repo's actual migration directory/numbering, not the stale `migrations/0013_...` path in Dev Notes; next number after 028_create_social_circles_table.sql from Story 10.1)
- [x] **Task 2:** Extend `lib/validation/circleSchema.ts` with add-contact schemas
- [x] **Task 3:** Extend `lib/services/circleService.ts`
  - [x] 3a: `addContactByPhone(circleId, requestingUserId, phoneNumber)` — validate, hash, insert (added `requestingUserId` beyond the Dev Notes signature to close an IDOR gap: without an ownership check, any authenticated user could add contacts to any circle by guessing its id)
  - [x] 3b: `addContactByUsername(circleId, requestingUserId, query)` — look up user, insert (same ownership-check addition as 3a)
  - [x] 3c: `removeContact(circleId, contactId, requestingUserId)` — auth check, delete
- [x] **Task 4:** API endpoints
  - [x] 4a: `app/api/circles/[circleId]/contacts/route.ts` (POST)
  - [x] 4b: `app/api/circles/[circleId]/contacts/[contactId]/route.ts` (DELETE)
- [x] **Task 5:** Build AddContactForm component (`components/circles/AddContactForm.tsx`)
  - [x] 5a: Toggle between "phone" and "username" input modes
  - [x] 5b: Real-time validation feedback
  - [x] 5c: Loading and success states
- [x] **Task 6:** Build ContactList component (`components/circles/ContactList.tsx`)
  - [x] 6a: Display contacts with type indicator (phone vs. user)
  - [x] 6b: Remove button with confirmation dialog
- [x] **Task 7:** Write tests

---

## File List

**Files Created:**
- `lib/db/migrations/029_create_social_circle_contacts_table.sql`
- `app/api/circles/[circleId]/contacts/route.ts`
- `app/api/circles/[circleId]/contacts/[contactId]/route.ts`
- `components/circles/AddContactForm.tsx`
- `components/circles/ContactList.tsx`
- `__tests__/api/circleContacts.test.ts`
- `__tests__/components/AddContactForm.test.tsx`
- `__tests__/components/ContactList.test.tsx`

**Files Modified:**
- `lib/validation/circleSchema.ts` (added `addContactSchema`, `contactResponseSchema`)
- `lib/db/queries/circles.ts` (added `getCircleById`, `addPhoneContact`, `addUserContact`, `findContactByPhoneHash`, `findContactByUserId`, `getContactById`, `deleteContact`)
- `lib/services/userService.ts` (added `findUserByDisplayNameOrEmail`)
- `lib/services/circleService.ts` (added `addContactByPhone`, `addContactByUsername`, `removeContact`)
- `__tests__/validation/circleSchema.test.ts` (added `addContactSchema` coverage)
- `__tests__/services/circleService.test.ts` (added coverage for the three new service functions)

---

## Dev Agent Record

### Implementation Notes

- Reused existing utilities rather than duplicating them: `hashPhoneNumber` (HMAC-SHA256) from `lib/services/smsService.ts` for phone dedup, and `phoneNumberSchema` (E.164 regex, same error copy as AC3) from `lib/validation/smsAuthSchema.ts`.
- `findUserByDisplayNameOrEmail` does an exact, case-insensitive match against `users.email`/`users.display_name` (no fuzzy/partial matching) — the story doesn't specify ambiguous-match handling, and an exact match avoids silently attaching the wrong person to a circle.
- Phone masking (`maskPhoneNumber` in `circleService.ts`) assumes a 10-digit national number (NANP), matching the Dev Notes example (`+15550001234` → `+1 555 ***-1234`); the codebase has no phone-parsing library, so this is a heuristic rather than a general E.164 formatter.
- Added a `requestingUserId` parameter to `addContactByPhone`/`addContactByUsername` beyond what Dev Notes' signatures specified, and a shared `authorizeCircleOwner` check used by all three service functions — the Dev Notes signatures for add would otherwise let any authenticated user add contacts to someone else's circle by guessing its UUID.
- Added a DB-level `CHECK` constraint on `social_circle_contacts` enforcing that phone-type rows carry `phone_hash`/`phone_display` and no `user_id`, and user-type rows carry `user_id` and no `phone_hash` — not in the Dev Notes SQL, but prevents inconsistent rows if application code ever has a bug.
- No GET endpoint or circle-detail page was built in this story — Dev Notes' API Routes section and the File List only specify POST/DELETE, and there's no existing circle-detail page from Story 10.1 to wire into. `AddContactForm` and `ContactList` are self-contained, prop-driven components (contact data in, callback out) so a future story (10.3, "View & Manage Social Circles") can compose them into an actual page without rework.
- Migration is `lib/db/migrations/029_create_social_circle_contacts_table.sql`, not the `migrations/0013_...` path in Dev Notes — that path doesn't match this repo's actual migration directory (`lib/db/migrations/`) or its sequential numbering (next after `028_create_social_circles_table.sql` from Story 10.1).

### Completion Notes

- All 7 tasks complete. Full red-green cycle followed per task: tests written and confirmed failing before implementation, then implementation added until green.
- 30 new tests added across schema, service, API route, and component layers; all pass. Full existing circles-feature test surface (76 tests across 8 suites, including Story 10.1's) re-run and passes with no regressions.
- Ran the full repo test suite and `tsc --noEmit`: found a large pre-existing set of unrelated failures (71 suites / 458 tests, e.g. `__tests__/encryption/hash.test.ts`, `__tests__/services/groupService.test.ts`) and pre-existing type errors (e.g. `lib/services/__tests__/deleteComment.test.ts`) with no connection to circles/contacts code. Confirmed unrelated by inspecting failure content (bcrypt/group-service logic, not touched by this story) rather than by diffing against main. Left as-is — out of scope for this story.

---

## Change Log

- 2026-09-02: Implemented Story 10.2 — migration, validation schema, query layer, service layer (with an added ownership-check parameter for security), API routes, and UI components, with full test coverage.

---

## Status

**Current Status:** review
**Last Updated:** 2026-09-02
