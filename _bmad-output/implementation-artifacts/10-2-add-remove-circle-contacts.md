---
story_key: "10-2-add-remove-circle-contacts"
epic: "10"
story: "2"
title: "Add & Remove Contacts from a Social Circle"
status: "ready-for-dev"
created_date: "2026-06-30"
---

# Story 10.2: Add & Remove Contacts from a Social Circle

**Epic:** 10 - Social Circles
**Story Key:** 10-2-add-remove-circle-contacts
**Created:** 2026-06-30
**Status:** ready-for-dev

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

- [ ] **Task 1:** Database migration for `social_circle_contacts` (`migrations/0013_social_circle_contacts.sql`)
- [ ] **Task 2:** Extend `lib/validation/circleSchema.ts` with add-contact schemas
- [ ] **Task 3:** Extend `lib/services/circleService.ts`
  - [ ] 3a: `addContactByPhone(circleId, phoneNumber)` — validate, hash, insert
  - [ ] 3b: `addContactByUsername(circleId, query)` — look up user, insert
  - [ ] 3c: `removeContact(circleId, contactId, requestingUserId)` — auth check, delete
- [ ] **Task 4:** API endpoints
  - [ ] 4a: `app/api/circles/[circleId]/contacts/route.ts` (POST)
  - [ ] 4b: `app/api/circles/[circleId]/contacts/[contactId]/route.ts` (DELETE)
- [ ] **Task 5:** Build AddContactForm component (`components/circles/AddContactForm.tsx`)
  - [ ] 5a: Toggle between "phone" and "username" input modes
  - [ ] 5b: Real-time validation feedback
  - [ ] 5c: Loading and success states
- [ ] **Task 6:** Build ContactList component (`components/circles/ContactList.tsx`)
  - [ ] 6a: Display contacts with type indicator (phone vs. user)
  - [ ] 6b: Remove button with confirmation dialog
- [ ] **Task 7:** Write tests

---

## File List

**Files to Create:**
- `migrations/0013_social_circle_contacts.sql`
- `app/api/circles/[circleId]/contacts/route.ts`
- `app/api/circles/[circleId]/contacts/[contactId]/route.ts`
- `components/circles/AddContactForm.tsx`
- `components/circles/ContactList.tsx`
- `__tests__/circles/circleContacts.test.ts`

**Files Modified:**
- `lib/validation/circleSchema.ts`
- `lib/services/circleService.ts`

---

## Status

**Current Status:** ready-for-dev
**Last Updated:** 2026-06-30
