---
story_key: "9-3-expired-used-link-rerequest"
epic: "9"
story: "3"
title: "Expired / Used Link Re-Request"
status: "done"
created_date: "2026-06-30"
---

# Story 9.3: Expired / Used Link Re-Request

**Epic:** 9 - SMS Magic Link Authentication
**Story Key:** 9-3-expired-used-link-rerequest
**Created:** 2026-06-30
**Status:** done

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

- [x] **Task 1:** Update magic link API route to return structured 410 responses
  - [x] 1a: Distinguish `expired` vs `already_used` vs `invalid`
  - [x] 1b: Include `targetType` and `targetId` in 410 response body for re-request context
- [x] **Task 2:** Build MagicLinkError page (`app/auth/magic/error/page.tsx`)
  - [x] 2a: Display error message based on reason (expired / used / invalid)
  - [x] 2b: "Send me a new link" button
  - [x] 2c: Accessible headings and aria-live for status updates
- [x] **Task 3:** Implement re-request endpoint (`app/api/auth/sms/rerequest/route.ts`)
  - [x] 3a: Accept originalToken to recover context
  - [x] 3b: Reuse smsService.sendMagicLinkSms() from Story 9.1
  - [x] 3c: Apply same rate limiting as Story 9.1
- [x] **Task 4:** Write tests
  - [x] 4a: Expired token returns 410 with reason
  - [x] 4b: Used token returns 410 with reason
  - [x] 4c: Re-request generates new token and sends SMS
  - [x] 4d: Re-request preserves target context
  - [x] 4e: Re-request rate limiting

---

## Dev Agent Record

### Implementation Plan

The Dev Notes sketched a `GET /api/auth/magic?t={token}` route, but Story 9.1/9.2 had already shipped this as `POST /api/auth/magic` with a JSON `{ token }` body (`app/api/auth/magic/route.ts`) and a client-side landing page that posts to it (`MagicLinkLandingContent.tsx`). Kept that existing POST shape rather than introducing a second, redundant GET route, and extended it to return the structured 410 body AC1/AC2/AC6 need.

The existing `consumeToken()` (`lib/services/magicLinkService.ts`) only ever reported one generic "not found" result for expired, used, and nonexistent tokens, so AC1/AC2/AC6's per-reason messaging was impossible without changing it. Restructured it to run a single unconditional `SELECT ... FOR UPDATE` (dropping the old `used_at IS NULL AND expires_at > NOW()` filter from the `WHERE` clause) and classify the row's `used_at`/`expires_at` inside the same row-locked transaction, returning a discriminated `{ status: 'consumed' | 'expired' | 'already_used' | 'invalid', ... }` result instead of `ConsumedToken | null`. This keeps the AC2 double-click protection intact — the row lock still serializes concurrent consumption attempts — and as a side effect makes the loser of a concurrent double-click correctly see `already_used` instead of a generic failure. `signInViaMagicLink()` and its two callers (the magic route, and this file's tests) were updated for the new return shape.

AC1's parenthetical ("phone number NOT required again... pre-filled from URL context if available, or prompted") is unsatisfiable as literally written: Story 9.1 deliberately never persists the raw phone number past the initial SMS send (NFR32), and 9.2 kept that boundary, so there is no server-side value to pre-fill from a token or URL. `MagicLinkErrorContent.tsx` always prompts for the phone number; the original token is still forwarded as `originalToken` so the re-request endpoint can recover the group/event target context (AC4) without the user re-entering anything about the invite itself. Added `getTokenTargetContext()` (`lib/services/magicLinkService.ts`) and `findTokenContextByHash()` (`lib/db/queries/smsTokens.ts`) for that lookup — deliberately unfiltered on `used_at`/`expires_at`, since the whole point is reading context off a token that already failed one of those checks.

`/api/auth/sms/rerequest` reuses `smsService`'s `hashPhoneNumber`/`generateMagicToken`/`checkAndRecordRateLimit`/`sendMagicLinkSms` and `smsTokens.createToken` directly (same pattern as Story 9.1's `/api/auth/sms/request`), rather than adding a new abstraction — it shares 9.1's in-memory rate-limit map by phone hash, so re-requests count against the same 3-per-10-minute budget as the original send (AC5). When `originalToken` resolves to a target, that recovered context wins over any client-supplied `targetType`/`targetId`, since the token record is the source of truth for the original invite.

`MagicLinkLandingContent.tsx`'s 410 handling previously redirected to `/auth/phone?error=expired` with a comment noting this story would replace it — updated it to redirect to `/auth/magic/error` with `reason`, `targetType`/`targetId` (when present), and the original token (`t`) as query params.

### Code Review & Fixes (2026-09-03)

Adversarial code review found one HIGH-severity access-control gap and two lower-severity code-quality issues, all fixed:

- **HIGH (security):** `/api/auth/sms/rerequest` recovered `target_type`/`target_id` from `originalToken` (`getTokenTargetContext`) without checking that the re-requesting phone number matched the token's original `phone_hash`. Anyone holding any stale token — forwarded, intercepted, or their own after later being removed from the group (Story 2.6) — could supply a different phone number and get a fresh, valid magic link into that token's group/event with no current invite. Fixed by having `findTokenContextByHash`/`getTokenTargetContext` also return `phone_hash`, and only trusting the recovered target in the route when it matches `hashPhoneNumber(phoneNumber)` for the request. Added a regression test (`__tests__/api/smsRerequest.test.ts` — "ignores originalToken context when the token belonged to a different phone number").
- **MEDIUM:** `COUNTRY_CODES` was duplicated verbatim in `MagicLinkErrorContent.tsx` and `PhoneMagicLinkForm.tsx`. Extracted to a single shared export in `lib/validation/smsAuthSchema.ts`.
- **LOW:** Removed a redundant `aria-label="Send me a new link"` on the submit button that duplicated its own visible text.

Full touched-file test suite (56 tests across 5 files) passes after the fixes.

### Code Review & Fixes (2026-09-08)

A second adversarial review found one further HIGH-severity access-control gap, fixed:

- **HIGH (security):** The 2026-09-03 fix only closed the *token-recovered* path -- `/api/auth/sms/rerequest` still accepted `targetType`/`targetId` directly in the request body from an unauthenticated client, with zero authorization check (no invite, no membership, no verification the target even involves the caller). Since `group_memberships` has no other guard against `addUserToGroup` and `sms_magic_link_tokens.target_id` has no FK, this let anyone who merely knew or guessed a group's UUID (e.g. visible in any member's `/groups/{id}` URL) self-join it: `POST /api/auth/sms/rerequest` with their own real phone number and `{ targetType: "group", targetId: "<uuid>" }`, click the resulting SMS link, done -- completely bypassing the app's invite-code-based membership system (`joinGroup`, `lib/services/groupService.ts`). Fixed by removing `targetType`/`targetId` from `rerequestSchema` and the route entirely; the only source of target context is now `getTokenTargetContext(originalToken)` gated on the phone-hash match, matching what AC4 actually requires. `MagicLinkErrorContent.tsx` updated to stop reading/forwarding `targetType`/`targetId` from the URL, since the server no longer uses them. Added two regression tests (`__tests__/api/smsRerequest.test.ts` -- "does not fall back to client-supplied targetType/targetId..." and "never trusts a client-supplied targetType/targetId with no originalToken at all...") plus one in `__tests__/auth/magicLinkError.test.tsx` ("never sends URL-supplied targetType/targetId to the rerequest endpoint").

Full touched-file test suite (58 tests across 5 files) passes after this fix.

### Completion Notes

- All 7 ACs implemented and covered by tests; full existing suite re-run to confirm no regressions (71 pre-existing failing suites unrelated to this story, unchanged in count before/after — see `magicLinkService.test.ts`, `smsService.test.ts`, `sms-request.test.ts` etc., all passing).
- `consumeToken()`'s return type changed from `ConsumedToken | null` to a discriminated `TokenConsumptionResult`; `MagicLinkSignInResult.errorCode` changed from `'INVALID_OR_EXPIRED_TOKEN' | 'INTERNAL_SERVER_ERROR'` to `'EXPIRED' | 'ALREADY_USED' | 'INVALID' | 'INTERNAL_SERVER_ERROR'`. Both are internal to this module and its two callers, all updated together.
- Deviated from the File List's `__tests__/auth/magicLinkError.test.ts` filename: used `.test.tsx` instead, since the file renders JSX and TypeScript only allows JSX syntax in `.tsx` files (matches this repo's existing convention — every other component test under `__tests__/components/` and `__tests__/auth/` that renders JSX uses `.tsx`).
- Rate limiting, magic-link TTL, and token hashing all reuse Story 9.1's `smsService` unchanged — no new rate-limit window or token format was introduced.

---

## File List

**Files Created:**
- `app/auth/magic/error/page.tsx`
- `components/auth/MagicLinkErrorContent.tsx`
- `app/api/auth/sms/rerequest/route.ts`
- `__tests__/auth/magicLinkError.test.tsx` (`.tsx`, not `.test.ts` — see Completion Notes)
- `__tests__/api/smsRerequest.test.ts`

**Files Modified:**
- `app/api/auth/magic/route.ts` — structured 410 responses (`reason`, `targetType`, `targetId`) instead of one generic message
- `app/api/auth/sms/rerequest/route.ts` — code review fixes: (2026-09-03) only trust `originalToken`-recovered target context when it belongs to the re-requesting phone number; (2026-09-08) removed client-supplied `targetType`/`targetId` entirely -- target context can now only come from a phone-hash-verified `originalToken`
- `lib/services/magicLinkService.ts` — `consumeToken()` classifies expired/already_used/invalid instead of returning null; `signInViaMagicLink()` reports a specific `errorCode` + target context; added `getTokenTargetContext()` (now also returns `phone_hash` for the ownership check)
- `lib/db/queries/smsTokens.ts` — added `findTokenContextByHash()` (now also returns `phone_hash`)
- `lib/validation/smsAuthSchema.ts` — code review fix: added shared `COUNTRY_CODES` export, deduplicating it out of `MagicLinkErrorContent.tsx`/`PhoneMagicLinkForm.tsx`
- `components/auth/MagicLinkLandingContent.tsx` — redirects to `/auth/magic/error` with reason/target/token params instead of `/auth/phone?error=expired`
- `components/auth/MagicLinkErrorContent.tsx` — code review fixes: uses shared `COUNTRY_CODES`, dropped redundant `aria-label` on submit button; (2026-09-08) no longer reads or forwards `targetType`/`targetId` from the URL, since the server no longer trusts client-supplied target context
- `components/auth/PhoneMagicLinkForm.tsx` — code review fix: uses shared `COUNTRY_CODES` instead of a duplicated local copy
- `__tests__/services/magicLinkService.test.ts` — updated for the new `consumeToken`/`signInViaMagicLink` contract; added `getTokenTargetContext` coverage (incl. `phone_hash`)
- `__tests__/api/magic-link-route.test.ts` — updated for the structured 410 response shape
- `__tests__/components/MagicLinkLandingContent.test.tsx` — updated for the new redirect target
- `__tests__/api/smsRerequest.test.ts` — code review fixes: (2026-09-03) updated mocks for `phone_hash`, added ownership-check regression test; (2026-09-08) replaced the client-supplied-target-fallback test with two regression tests proving that path is now ignored
- `__tests__/auth/magicLinkError.test.tsx` — code review fix (2026-09-08): updated the submit test to no longer expect `targetType`/`targetId` in the request body; added a regression test confirming they're never sent

---

## Change Log

- 2026-09-02: Implemented Story 9.3 (Tasks 1-4). Structured 410 responses distinguishing expired/already_used/invalid, MagicLinkError page with re-request form, `/api/auth/sms/rerequest` endpoint preserving original invite context, full test coverage for AC1-AC7.
- 2026-09-03: Code review found and fixed a HIGH-severity access-control gap in the re-request endpoint (target context recovered from a stale token was trusted without verifying it belonged to the re-requesting phone number), plus deduplicated `COUNTRY_CODES` and removed a redundant `aria-label`. See Dev Agent Record → Code Review & Fixes.
- 2026-09-08: Second code review found and fixed a further HIGH-severity access-control gap: the re-request endpoint still accepted `targetType`/`targetId` directly from the client with no authorization check, letting anyone self-join any group/event by UUID with no invite and no token. Removed that fallback entirely; target context can now only come from a phone-hash-verified `originalToken`. See Dev Agent Record → Code Review & Fixes (2026-09-08).

---

## Status

**Current Status:** done
**Last Updated:** 2026-09-08
