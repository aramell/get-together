---
story_key: "9-3-expired-used-link-rerequest"
epic: "9"
story: "3"
title: "Expired / Used Link Re-Request"
status: "ready-for-dev"
created_date: "2026-06-30"
---

# Story 9.3: Expired / Used Link Re-Request

**Epic:** 9 - SMS Magic Link Authentication
**Story Key:** 9-3-expired-used-link-rerequest
**Created:** 2026-06-30
**Status:** ready-for-dev

---

## Story

As a user whose magic link has expired or already been used,
I want to see a clear message and request a new link in one tap,
So that I can still get access without confusion or dead ends.

---

## Acceptance Criteria

### AC1: Expired Link Detection and Message
**Given** a user clicks a magic link where `expires_at < NOW()`
**When** the magic link page loads and calls the API
**Then** the API returns a 410 Gone response
**And** the page shows: "This link has expired. Links are valid for 15 minutes."
**And** a "Send me a new link" button is displayed below the message
**And** the user's phone number is NOT required again (pre-filled from URL context if available, or prompted)

### AC2: Already-Used Link Detection and Message
**Given** a user clicks a magic link where `used_at IS NOT NULL`
**When** the magic link page loads and calls the API
**Then** the API returns a 410 Gone response with reason `already_used`
**And** the page shows: "This link has already been used. Request a new one below."
**And** a "Send me a new link" button is displayed

### AC3: Re-Request Sends a New Link Within 30 Seconds
**Given** a user clicks "Send me a new link" on the expired/used link page
**When** the request is submitted
**Then** a new magic link token is generated and an SMS is dispatched
**And** the new SMS is delivered within 30 seconds (NFR30)
**And** the user sees: "New link sent! Check your texts."
**And** the old token remains invalidated (not reactivated)

### AC4: Re-Request Preserves Original Context
**Given** the expired/used link had a target_type and target_id (group or event invite)
**When** a new link is requested
**Then** the new token carries the same target_type and target_id
**And** clicking the new link still delivers the user to the correct group or event

### AC5: Re-Request Rate Limiting Respected
**Given** a user on the expired/used link page clicks "Send me a new link" repeatedly
**When** they exceed 3 requests in 10 minutes
**Then** they see: "Too many requests. Please wait a few minutes before trying again."
**And** no SMS is sent for rate-limited re-requests

### AC6: Invalid Token (Tampered or Nonexistent)
**Given** a user navigates to a magic link URL with a token that does not exist in the database
**When** the API processes the request
**Then** the page shows: "This link is invalid. Please request a new one."
**And** the "Send me a new link" button is shown
**And** no information is disclosed about whether the token existed

### AC7: Accessibility
**Given** a user lands on the expired/used/invalid link page
**When** they view the page
**Then** the error message is the page's primary heading (h1 level)
**And** the "Send me a new link" button is keyboard accessible and meets 48px touch target
**And** status messages after re-request are announced via `aria-live="polite"`

---

## Requirements Mapped

**Functional Requirements:**
- FR63: Expired or already-used magic links display a re-request prompt; re-request delivers a new link within 30 seconds

**Non-Functional Requirements:**
- NFR30: SMS delivered within 30 seconds (95th percentile)
- NFR31: Original tokens remain single-use; new tokens issued for re-requests

---

## Dev Notes

### API Error Response
```
GET /api/auth/magic?t={token}
  → 410 Gone: { error: 'expired' | 'already_used' | 'invalid', targetType?, targetId? }
```

### Re-Request Endpoint
```
POST /api/auth/sms/rerequest
  Body: { phoneNumber?: string, originalToken?: string, targetType?, targetId? }
  Response: { success: true, message: string }
  Errors: 422 (validation), 429 (rate limit)
```

The re-request flow reuses the same logic as Story 9.1 (`/api/auth/sms/request`). If `originalToken` is provided, the API can look up the target context from the expired token's record rather than requiring the user to re-enter their phone number.

---

## Tasks/Subtasks

- [ ] **Task 1:** Update magic link API route to return structured 410 responses
  - [ ] 1a: Distinguish `expired` vs `already_used` vs `invalid`
  - [ ] 1b: Include `targetType` and `targetId` in 410 response body for re-request context
- [ ] **Task 2:** Build MagicLinkError page (`app/auth/magic/error/page.tsx`)
  - [ ] 2a: Display error message based on reason (expired / used / invalid)
  - [ ] 2b: "Send me a new link" button
  - [ ] 2c: Accessible headings and aria-live for status updates
- [ ] **Task 3:** Implement re-request endpoint (`app/api/auth/sms/rerequest/route.ts`)
  - [ ] 3a: Accept originalToken to recover context
  - [ ] 3b: Reuse smsService.sendMagicLinkSms() from Story 9.1
  - [ ] 3c: Apply same rate limiting as Story 9.1
- [ ] **Task 4:** Write tests
  - [ ] 4a: Expired token returns 410 with reason
  - [ ] 4b: Used token returns 410 with reason
  - [ ] 4c: Re-request generates new token and sends SMS
  - [ ] 4d: Re-request preserves target context
  - [ ] 4e: Re-request rate limiting

---

## File List

**Files to Create:**
- `app/auth/magic/error/page.tsx`
- `app/api/auth/sms/rerequest/route.ts`
- `__tests__/auth/magicLinkError.test.ts`
- `__tests__/api/smsRerequest.test.ts`

**Files Modified:**
- `app/api/auth/magic/route.ts` — add structured 410 error responses

---

## Status

**Current Status:** ready-for-dev
**Last Updated:** 2026-06-30
