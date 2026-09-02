---
story_key: "9-2-auto-account-creation-magic-link"
epic: "9"
story: "2"
title: "Auto-Account Creation & Immediate Access via Magic Link"
status: "review"
created_date: "2026-06-30"
---

# Story 9.2: Auto-Account Creation & Immediate Access via Magic Link

**Epic:** 9 - SMS Magic Link Authentication
**Story Key:** 9-2-auto-account-creation-magic-link
**Created:** 2026-06-30
**Status:** review

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

- [x] **Task 1:** Add `phone_hash` column to users table (`lib/db/migrations/027_add_phone_hash_to_users.sql`)
- [x] **Task 2:** Implement token consumption service (`lib/services/magicLinkService.ts`)
  - [x] 2a: `consumeToken(rawToken)` — hash, query with FOR UPDATE, set used_at
  - [x] 2b: `findOrCreateUserByPhoneHash(phoneHash)` — Cognito Admin API + local upsert
  - [x] 2c: `addUserToTarget(userId, targetType, targetId)` — membership creation
- [x] **Task 3:** Implement magic link API route (`app/api/auth/magic/route.ts`)
  - [x] 3a: Extract + validate token from request body
  - [x] 3b: Call consumeToken; handle used/expired (410, redirected client-side to `/auth/phone?error=expired` pending Story 9.3)
  - [x] 3c: Find or create user
  - [x] 3d: Add to target group/event
  - [x] 3e: Issue JWT, set HTTP-only cookies, return redirect path
- [x] **Task 4:** Build MagicLinkLanding page (`app/auth/magic/page.tsx` + `components/auth/MagicLinkLandingContent.tsx`)
  - [x] 4a: Loading state: "Signing you in..."
  - [x] 4b: Delegates to API via useEffect on mount
  - [x] 4c: Accessible loading indicator
- [x] **Task 5:** Write tests
  - [x] 5a: Token consumption with concurrent request test (race condition)
  - [x] 5b: New user auto-creation test
  - [x] 5c: Existing user sign-in test
  - [x] 5d: Group membership added on link click

---

## File List

**Files Created:**
- `lib/services/magicLinkService.ts`
- `lib/services/userService.ts` (extended: `findUserByPhoneHash`, `createUserProfileByPhoneHash` — Dev Notes said `lib/db/smsTokens.ts` "extended from Story 9.1"; the local `users` row CRUD already lives in `userService.ts`, alongside `createUserProfile`/`getUserProfile` for email users, so the phone equivalents were added there instead)
- `app/api/auth/magic/route.ts` (POST, not GET — matches the Dev Notes' documented alternative, and pairs with Task 4's useEffect-driven client fetch)
- `app/auth/magic/page.tsx`
- `components/auth/MagicLinkLandingContent.tsx` (not in the original file list; required by Next.js App Router to wrap `useSearchParams()` in `<Suspense>` — same split used by `app/auth/reset-password/page.tsx` + `ResetPasswordFormContent.tsx`)
- `lib/db/migrations/027_add_phone_hash_to_users.sql` (Dev Notes said `migrations/0011_users_phone_hash.sql`; actual migrations live in `lib/db/migrations/`, numbered sequentially — see Story 9.1's same note)
- `__tests__/services/magicLinkService.test.ts` (Dev Notes said `__tests__/auth/magicLink.test.ts`; placed alongside `__tests__/services/` per that directory's existing convention)
- `__tests__/api/magic-link-route.test.ts` (Dev Notes said `__tests__/api/magicLinkRoute.test.ts`; hyphenated to match sibling files, e.g. Story 9.1's `sms-request.test.ts`)
- `__tests__/components/MagicLinkLandingContent.test.tsx`

---

## Dev Agent Record

### Implementation Plan

- **Session strategy (AC7) — user decision required:** `middleware.ts` and every protected API route verify `accessToken` against Cognito's JWKS (`getVerifiedSubFromJWT`), so a magic-link session must carry a genuine Cognito-issued token, not a locally-crafted one. No existing code in this repo creates/authenticates a Cognito user without a password (no Admin API usage, no custom-auth Lambda triggers, no IAM policy visible in `amplify/` granting `cognito-idp:Admin*`). Asked the user; they chose: **AdminCreateUser + a discarded one-time password**, over building a full Cognito custom-auth-challenge Lambda flow. This requires the deployed app's AWS execution role to be granted `cognito-idp:AdminCreateUser`, `AdminSetUserPassword`, and `AdminInitiateAuth` (with `ADMIN_USER_PASSWORD_AUTH` enabled on the App Client) — an IAM/Cognito console change outside this codebase's visibility, not yet verified to exist in the deployed environment.
- **Stateless re-auth:** Every sign-in (new or existing user) generates a fresh one-time password via `AdminSetUserPassword` immediately before `AdminInitiateAuth`, then discards it. This means the app never needs to remember a phone-auth user's password across sessions (Admin APIs don't require knowing the previous one), which cleanly handles the existing-user silent-sign-in case (AC3) with the same code path as new-user creation (AC2).
- **Phone number recovery (AC2 Cognito user) — user decision required:** At token-consumption time this story only has `phone_hash` (Story 9.1 never persists the raw phone number, by design, per NFR32) — not enough to set Cognito's `phone_number` attribute or use the real number as `Username`. Asked the user; they chose to **keep 9.2 self-contained** rather than reopening Story 9.1 to store the number reversibly-encrypted. Cognito's `Username` is a synthetic `phone_<phoneHash>` identifier; no `phone_number` attribute is set. Consequence, documented in code: the app can never recover a phone-auth user's actual number later (no SMS re-notifications, no "signed in as +1 555..." display), and rotating `ENCRYPTION_KEY` (the HMAC key behind `phone_hash`) would orphan existing phone-linked accounts.
- **`users.status` (AC2):** The `users` table (Story 8.x) has no `status` column, only `deleted_at` for soft-delete. Interpreted AC2's "status set to active" as "not soft-deleted" (`deleted_at IS NULL`), consistent with how the rest of the app already represents active vs. deleted users, rather than adding a new column not otherwise used anywhere.
- **AC5 (soft "add your name" banner):** Not implemented — it's not represented by any Task/Subtask in this story (the acceptance criterion itself says "may suggest", non-blocking), so per the workflow's "never implement anything not mapped to a task" rule, it's flagged here as a gap for a follow-up story rather than built speculatively.
- **API is POST**, matching the Dev Notes' documented alternative (`(or POST /api/auth/magic with body { token })`) rather than GET-with-redirect, since Task 4 specifies the landing page calls the API from a `useEffect` (client fetch), which pairs naturally with a JSON POST response (cookies still ride the fetch response's `Set-Cookie` headers) rather than a server-side redirect response.
- **Event targets** grant membership on the event's parent group (event pages require group membership) and redirect straight to the event detail page; group targets grant membership on that group directly. A target that no longer exists (deleted event/group) falls back to `/groups` rather than failing the whole sign-in.
- Story 9.3 (expired/used link re-request) doesn't exist yet; the 410 case redirects client-side to `/auth/phone?error=expired` as an interim landing spot, not a purpose-built error page — noted as a placeholder pending that story.

### Completion Notes

- All 5 tasks implemented and tested; 26 new tests across the service, API route, and landing-page-content layers, all passing.
- `__tests__/api/magic-link-route.test.ts` uses the same `/** @jest-environment node */` per-file override as Story 9.1's `sms-request.test.ts`, for the same pre-existing jsdom `Response.json` gap.
- Ran the full suite (`npx jest`) after implementation: pre-existing failures (same baseline documented in Story 9.1 — timeouts, AWS-SDK-ESM/jsdom-Response gaps, unrelated to this story) are unchanged; none of the failing suites are files this story touches or created.
- **Not verified in this session** (no access to the deployed AWS environment): whether the app's execution role actually has the required `cognito-idp:Admin*` IAM permissions, and whether the User Pool's App Client has `ADMIN_USER_PASSWORD_AUTH` enabled, and whether `AdminCreateUser` succeeds without an `email`/other "required" standard attribute set on a pool that may expect one. If any of these assumptions are wrong, `findOrCreateUserByPhoneHash` will throw and the sign-in returns a 500 — this needs to be smoke-tested against the real deployed Cognito User Pool before this story is considered production-ready, not just code-reviewed.
- Story 9.3 will build the dedicated expired/used-link experience this story's 410 handling currently just redirects toward `/auth/phone?error=expired` for.

### Code Review Fixes (2026-09-02)

Ran `/code-review` against Stories 9.1 + 9.2 (see also `9-1-sms-magic-link-request.md`). Two findings against this story's code were fixed:

- **Orphaned Cognito account (`lib/services/magicLinkService.ts`):** `findOrCreateUserByPhoneHash` discarded the return value of `createUserProfileByPhoneHash`, which swallows DB errors and returns `null` instead of throwing (`userService.ts`). A failed local INSERT would silently continue to password-set and authenticate the Cognito user anyway, issuing a valid session for an account with no matching `users` row — invisible to `getUserProfile` and everything built on it. Fixed: the `null` result is now checked and throws before any password is set or authentication attempted, so no session is ever issued for a phantom account. Covered by a new test asserting `AdminSetUserPassword`/`AdminInitiateAuth` are never called in that path.
- **Token permanently burned by an unrelated downstream failure:** `consumeToken` commits `used_at = NOW()` (required for AC6's atomic double-click protection) before account creation/sign-in runs; if that later step fails for any reason (transient Cognito error, the fix above, etc.), the token was already unusable with no retry path — forcing the user to request an entirely new SMS for what might be a transient server-side issue. Fixed: `signInViaMagicLink` now wraps the post-consumption steps in a try/catch; on failure it resets the token's `used_at` back to `NULL` (`releaseToken`) before rethrowing, so the same link can be retried. Covered by a new test asserting the release UPDATE fires when downstream sign-in fails.

Two other findings (in-memory rate limiter not surviving multi-instance deployment in `smsService.ts`; redundant indexes on already-`UNIQUE` columns in migrations 026/027; `PhoneMagicLinkForm` never passing `targetType`/`targetId`) were reported but not fixed in this pass — left as follow-ups since they're either cross-cutting (rate limiter — shared with Story 9.1) or scope additions (target-aware UI) rather than correctness bugs in this story's own code paths.

Full suite re-run after the fixes: no new failures, same pre-existing baseline as before.

---

## Change Log

- 2026-09-02: Implemented Story 9.2 (Tasks 1–5): phone_hash column, magicLinkService (atomic token consumption, Cognito Admin API account creation/sign-in, target membership), API route, MagicLinkLanding page, and test coverage. Two architecture decisions (Cognito session strategy, phone number recovery) required user input mid-implementation — see Dev Agent Record.
- 2026-09-02: Fixed two code-review findings: orphaned-Cognito-account guard, and token release-on-downstream-failure for retry. Two new tests added.

---

## Status

**Current Status:** review
**Last Updated:** 2026-09-02
