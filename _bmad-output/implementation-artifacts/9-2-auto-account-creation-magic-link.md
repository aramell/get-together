---
story_key: "9-2-auto-account-creation-magic-link"
epic: "9"
story: "2"
title: "Auto-Account Creation & Immediate Access via Magic Link"
status: "ready-for-dev"
created_date: "2026-06-30"
---

# Story 9.2: Auto-Account Creation & Immediate Access via Magic Link

**Epic:** 9 - SMS Magic Link Authentication
**Story Key:** 9-2-auto-account-creation-magic-link
**Created:** 2026-06-30
**Status:** ready-for-dev

---

## Story

As a first-time user who received an SMS magic link,
I want clicking the link to instantly create my account and take me directly to the group or event,
So that I can start participating without filling out any signup form.

---

## Acceptance Criteria

### AC1: Magic Link Resolves and Validates Token
**Given** a user clicks a magic link (e.g., `get-together.app/auth/magic?t={token}`)
**When** the page loads
**Then** the token is extracted from the URL and sent to the API
**And** the API looks up the token by SHA-256 hash in `sms_magic_link_tokens`
**And** if the token is valid (not used, not expired) the flow proceeds immediately
**And** no login form or confirmation step is shown

### AC2: Auto-Account Creation for New Phone Numbers
**Given** the magic link token resolves to a phone number with no existing account
**When** the API processes the token
**Then** a new user record is created in the `users` table with:
  - `phone_hash` set to the hashed phone number
  - `display_name` defaulting to "New Member" (editable later)
  - `created_at` set to now
  - `status` set to `active`
**And** a Cognito user is created with phone as the identity (or a phone-auth session is issued)
**And** the account is created atomically with token invalidation (single transaction)

### AC3: Existing Account — Silent Sign-In
**Given** the magic link token resolves to a phone number that already has an account
**When** the API processes the token
**Then** the existing user is signed in (JWT issued)
**And** no duplicate account is created
**And** the user is redirected immediately without any login prompt

### AC4: Immediate Access to Target Group or Event
**Given** the magic link had a target_type of 'group' or 'event' and a target_id
**When** the account is created or the user is signed in
**Then** the user is automatically added as a member of the target group (if group invite)
**And** they are redirected to the group detail page or event detail page
**And** they can immediately see and interact with the group/event content
**And** no profile completion step is required before access (NFR62)

### AC5: No Profile Completion Gate
**Given** a new user has been auto-created via magic link
**When** they land on the group or event page
**Then** they can immediately RSVP, view wishlists, and comment
**And** they are NOT prompted to complete their profile before taking actions
**And** a soft banner may suggest "Add your name to help your friends recognize you" (non-blocking)

### AC6: Token Is Invalidated Atomically on First Use
**Given** a magic link token is consumed
**When** the API processes the click
**Then** `used_at` is set on the token record in a single atomic operation
**And** no second request can consume the same token (NFR31)
**And** if two simultaneous requests arrive for the same token, only one succeeds (database constraint)
**And** the second request receives the "link already used" response (handled by Story 9.3)

### AC7: JWT Session Issued After Login
**Given** a user is authenticated via magic link (new or existing)
**When** the flow completes
**Then** a standard JWT access token and refresh token are issued
**And** the tokens are stored in HTTP-only cookies (same as email/password login)
**And** the user session behaves identically to an email/password session going forward

### AC8: Accessibility & Loading State
**Given** a user clicks the magic link
**When** the page loads and the API call is in flight
**Then** a loading indicator is shown: "Signing you in..."
**And** once complete, the redirect happens automatically
**And** the loading page has proper semantic HTML and is readable by screen readers

---

## Requirements Mapped

**Functional Requirements:**
- FR61: First-time users get auto-created account, no registration steps
- FR62: SMS magic link grants immediate access to the specific group or event

**Non-Functional Requirements:**
- NFR31: SMS magic links are single-use and invalidated immediately upon first use

---

## Dev Notes

### API Route
```
GET /api/auth/magic?t={rawToken}
  (or POST /api/auth/magic with body { token })
  Response: redirect to /groups/[id] or /events/[id] with session cookie set
  Errors: 410 (used/expired — handled in Story 9.3), 500
```

### Token Consumption Flow
1. Hash incoming raw token with SHA-256
2. `SELECT ... FROM sms_magic_link_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE`
3. If found: `UPDATE sms_magic_link_tokens SET used_at = NOW() WHERE id = $1`
4. Decode phone_hash → look up or create user
5. Issue JWT → set HTTP-only cookie → redirect

### Auto-Account Creation
- `users` table: add `phone_hash VARCHAR(255) UNIQUE` column
- No Cognito email required for phone-auth users — use Cognito's phone auth or a custom auth challenge
- Default display_name: "New Member" (shown in groups until user updates their profile)

### Concurrent Token Use Protection
- Use `SELECT ... FOR UPDATE` with `used_at IS NULL` check to prevent race conditions
- If the SELECT returns no row (token already used), fall through to Story 9.3 error handling

---

## Tasks/Subtasks

- [ ] **Task 1:** Add `phone_hash` column to users table (`migrations/0011_users_phone_hash.sql`)
- [ ] **Task 2:** Implement token consumption service (`lib/services/magicLinkService.ts`)
  - [ ] 2a: `consumeToken(rawToken)` — hash, query with FOR UPDATE, set used_at
  - [ ] 2b: `findOrCreateUserByPhoneHash(phoneHash)` — upsert user
  - [ ] 2c: `addUserToGroupOrEvent(userId, targetType, targetId)` — membership creation
- [ ] **Task 3:** Implement magic link API route (`app/api/auth/magic/route.ts`)
  - [ ] 3a: Extract + validate token from query params
  - [ ] 3b: Call consumeToken; handle used/expired (redirect to Story 9.3 page)
  - [ ] 3c: Find or create user
  - [ ] 3d: Add to target group/event
  - [ ] 3e: Issue JWT, set HTTP-only cookies, redirect
- [ ] **Task 4:** Build MagicLinkLanding page (`app/auth/magic/page.tsx`)
  - [ ] 4a: Loading state: "Signing you in..."
  - [ ] 4b: Delegates to API via useEffect on mount
  - [ ] 4c: Accessible loading indicator
- [ ] **Task 5:** Write tests
  - [ ] 5a: Token consumption with concurrent request test (race condition)
  - [ ] 5b: New user auto-creation test
  - [ ] 5c: Existing user sign-in test
  - [ ] 5d: Group membership added on link click

---

## File List

**Files to Create:**
- `lib/services/magicLinkService.ts`
- `lib/db/smsTokens.ts` (extended from Story 9.1)
- `app/api/auth/magic/route.ts`
- `app/auth/magic/page.tsx`
- `migrations/0011_users_phone_hash.sql`
- `__tests__/auth/magicLink.test.ts`
- `__tests__/api/magicLinkRoute.test.ts`

---

## Status

**Current Status:** ready-for-dev
**Last Updated:** 2026-06-30
