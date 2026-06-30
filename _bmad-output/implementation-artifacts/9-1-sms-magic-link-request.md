---
story_key: "9-1-sms-magic-link-request"
epic: "9"
story: "1"
title: "Request SMS Magic Link"
status: "ready-for-dev"
created_date: "2026-06-30"
---

# Story 9.1: Request SMS Magic Link

**Epic:** 9 - SMS Magic Link Authentication
**Story Key:** 9-1-sms-magic-link-request
**Created:** 2026-06-30
**Status:** ready-for-dev

---

## Story

As a user who has been invited by phone number,
I want to enter my phone number and receive a one-time magic link via SMS,
So that I can join a group or log in without creating a password.

---

## Acceptance Criteria

### AC1: Phone Number Entry UI
**Given** a user opens the SMS magic link login flow (e.g., from the "Join via phone" option on the login page or from an invite link)
**When** the page loads
**Then** they see a phone number input field with country code selector
**And** the field accepts E.164 format and validates in real-time
**And** a "Send Magic Link" button is visible and disabled until a valid number is entered

### AC2: E.164 Phone Number Validation
**Given** a user enters a phone number
**When** they type into the phone number field
**Then** the input validates format in real-time (e.g., +1 for US, country prefix required)
**And** invalid formats show: "Please enter a valid phone number including country code (e.g., +1 555 000 1234)"
**And** the "Send Magic Link" button remains disabled until format is valid

### AC3: SMS Delivery on Submit
**Given** a user enters a valid E.164 phone number and clicks "Send Magic Link"
**When** the request is submitted
**Then** a one-time token is generated, hashed, and stored in the database with 15-minute TTL
**And** an SMS is dispatched to that number via the SMS provider (Twilio or AWS SNS)
**And** the SMS message contains the magic link URL (e.g., `get-together.app/auth/magic?token=...`)
**And** the user sees: "Check your texts — we sent a link to [phone number]"
**And** the SMS is delivered within 30 seconds (NFR30)

### AC4: Phone Number Never Logged
**Given** an SMS magic link is requested for any phone number
**When** the API processes the request
**Then** the phone number is validated and used to send SMS only
**And** the raw phone number is never written to application logs or error traces (NFR32)
**And** the stored token record hashes the phone number (bcrypt or SHA-256)

### AC5: Rate Limiting
**Given** a user (or bot) requests magic links for the same phone number
**When** they submit more than 3 requests within 10 minutes
**Then** subsequent requests return: "Too many requests. Please wait before requesting a new link."
**And** no SMS is sent for rate-limited requests

### AC6: Invalid Phone Number (No Account Exists — Same Response)
**Given** a user enters a phone number not yet in the system
**When** they submit
**Then** they see the same success message: "Check your texts — we sent a link to [phone number]"
**And** the system silently queues account creation to happen at link-click time (Story 9.2)
**And** no error is shown that would reveal whether a phone number is registered

### AC7: Accessibility
**Given** a user accesses the phone number entry form
**When** they interact with it
**Then** the phone input has an associated `<label>` element
**And** the country code selector is keyboard accessible
**And** error messages are announced via `aria-live="polite"`
**And** the "Send Magic Link" button meets 48px minimum touch target

---

## Requirements Mapped

**Functional Requirements:**
- FR59: Users can sign up and log in via SMS magic link using their phone number
- FR60: Users invited to a group or event via phone number receive a one-time access link via SMS

**Non-Functional Requirements:**
- NFR30: SMS magic links delivered within 30 seconds (95th percentile)
- NFR32: Phone numbers validated to E.164 format before use and never logged

---

## Dev Notes

### Database Schema
```sql
CREATE TABLE sms_magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash VARCHAR(255) NOT NULL,  -- bcrypt hash of E.164 phone number
  token_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 hash of the raw token
  target_type VARCHAR(20),           -- 'group' | 'event' | 'login' | NULL
  target_id UUID,                    -- group_id or event_id if invite context
  expires_at TIMESTAMPTZ NOT NULL,   -- created_at + 15 minutes
  used_at TIMESTAMPTZ,               -- set atomically on first use
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_tokens_token_hash ON sms_magic_link_tokens(token_hash);
CREATE INDEX idx_sms_tokens_phone_hash ON sms_magic_link_tokens(phone_hash);
```

### API Route
```
POST /api/auth/sms/request
  Body: { phoneNumber: string, targetType?: 'group' | 'event', targetId?: string }
  Response: { success: true, message: string }
  Errors: 422 (validation), 429 (rate limit), 500
```

### Token Generation
- Raw token: 32 bytes from `crypto.randomBytes(32)`, URL-encoded as hex (64 chars)
- Stored as SHA-256 hash (never store raw token)
- Magic link URL: `https://get-together.app/auth/magic?t={rawToken}`

### SMS Provider
- Use Twilio (primary) or AWS SNS SMS (fallback)
- Provider credentials in environment variables: `SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- Message body: "Your get-together invite: [link] (expires in 15 min, one-time use)"

### Rate Limiting
- Track request count by phone_hash in Redis or in-database counter
- 3 requests per phone number per 10 minutes
- Return HTTP 429 on breach

---

## Tasks/Subtasks

- [ ] **Task 1:** Create Zod validation schema for phone number input (`lib/validation/smsAuthSchema.ts`)
  - [ ] 1a: E.164 regex validation
  - [ ] 1b: Target type + target ID optional fields
- [ ] **Task 2:** Create SMS service (`lib/services/smsService.ts`)
  - [ ] 2a: `generateMagicToken()` — crypto.randomBytes, SHA-256 hash
  - [ ] 2b: `sendMagicLinkSms(phoneNumber, token)` — Twilio/SNS dispatch
  - [ ] 2c: Rate limit check by phone hash
- [ ] **Task 3:** Create token storage function in DB (`lib/db/smsTokens.ts`)
  - [ ] 3a: `createToken(phoneHash, tokenHash, expiresAt, targetType?, targetId?)`
  - [ ] 3b: Database migration for `sms_magic_link_tokens` table
- [ ] **Task 4:** Implement API endpoint (`app/api/auth/sms/request/route.ts`)
  - [ ] 4a: Validate input with Zod schema
  - [ ] 4b: Hash phone number, check rate limit
  - [ ] 4c: Generate token, store in DB, dispatch SMS
  - [ ] 4d: Return generic success response (no info leakage)
- [ ] **Task 5:** Build PhoneMagicLinkForm component (`components/auth/PhoneMagicLinkForm.tsx`)
  - [ ] 5a: Phone number input with country code selector
  - [ ] 5b: Real-time E.164 validation feedback
  - [ ] 5c: Loading state during submission
  - [ ] 5d: Success state: "Check your texts" message
  - [ ] 5e: Accessibility: labels, aria-live, keyboard navigation
- [ ] **Task 6:** Create /auth/phone page (`app/auth/phone/page.tsx`)
  - [ ] 6a: Integrate PhoneMagicLinkForm
  - [ ] 6b: Add "Back to login" link
- [ ] **Task 7:** Write tests
  - [ ] 7a: Unit tests for E.164 validation schema
  - [ ] 7b: Unit tests for token generation and hashing
  - [ ] 7c: API endpoint tests (success, rate limit, invalid number)
  - [ ] 7d: Component tests for PhoneMagicLinkForm

---

## File List

**Files to Create:**
- `lib/validation/smsAuthSchema.ts`
- `lib/services/smsService.ts`
- `lib/db/smsTokens.ts`
- `app/api/auth/sms/request/route.ts`
- `components/auth/PhoneMagicLinkForm.tsx`
- `app/auth/phone/page.tsx`
- `migrations/0010_sms_magic_link_tokens.sql`
- `__tests__/auth/smsAuth.test.ts`
- `__tests__/api/smsRequest.test.ts`
- `__tests__/components/PhoneMagicLinkForm.test.tsx`

---

## Status

**Current Status:** ready-for-dev
**Last Updated:** 2026-06-30
