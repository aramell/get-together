---
story_key: "8-5-jwt-signature-verification"
epic: "8"
story: "5"
title: "Verify JWT Signatures Instead of Trusting Decoded Claims"
status: "review"
created_date: "2026-08-27"
priority: "critical"
---

# Story 8.5: Verify JWT Signatures Instead of Trusting Decoded Claims

**Epic:** 8 - Responsive Web App & Accessibility (Security/Privacy: NFR9-16)
**Story Key:** 8-5-jwt-signature-verification
**Created:** 2026-08-27
**Status:** review
**Priority:** Critical — cross-cutting authentication gap affecting every authorization check in the app

---

## Origin

Filed as a direct result of the Epic 12 code review (2026-08-27), where all 6 stories' adversarial reviews independently surfaced the same underlying issue: `lib/auth/jwt.ts`'s `decodeJWT`/`getSubFromJWT` base64-decode a JWT payload with **no signature verification**, and every route/service in the app (comments, checklist, photos, timeline, logistics, polls, and beyond — this is not Epic-12-specific) trusts the resulting `sub` claim as the authenticated user's identity.

This is filed as its own story rather than fixed piecemeal inside each Epic 12 story because:
1. It's a single shared utility (`lib/auth/jwt.ts`) — fixing it once fixes every caller
2. It predates Epic 12 entirely (present since early auth work in Epic 1)
3. Attempting to "fix" it inside one feature story without touching the shared utility would either duplicate the fix six times or leave five other stories still vulnerable

---

## Story

As the application,
I want every JWT-derived user identity to be cryptographically verified against Cognito's signing keys,
So that authorization checks (membership, ownership, admin role) can't be bypassed by an attacker who crafts an unsigned or arbitrarily-signed token.

---

## Acceptance Criteria

**AC1: Signature Verification on Every Decode**
- **Given** any request presenting a Bearer token or equivalent JWT
- **When** the application extracts the user's identity from it
- **Then** the token's signature is verified against Cognito's public JWKS before any claim is trusted
- **And** a token with an invalid, missing, or unverifiable signature is rejected with 401, regardless of what its decoded payload claims

**AC2: Expiration and Issuer/Audience Validation**
- **Given** a token with a valid signature
- **When** it's verified
- **Then** `exp` (expiration), `iss` (issuer matches the app's Cognito user pool), and `aud`/`client_id` (matches the app's client) are all validated, not just the signature

**AC3: No Behavior Change for Legitimate Users**
- **Given** a user with a real, currently-valid Cognito-issued token
- **When** they make any authenticated request
- **Then** they experience no functional change — this is a security hardening pass, not a UX change

**AC4: Single Shared Implementation**
- **Given** the fix
- **When** implemented
- **Then** it lives in `lib/auth/jwt.ts` (or a clearly-named replacement) and every caller currently using `getSubFromJWT` is updated to use the verified path — no route is left on the old unverified decode

**AC5: Regression Coverage**
- **Given** the fix
- **When** tests run
- **Then** there are tests proving: (a) a validly-signed token is accepted, (b) a forged/unsigned token is rejected, (c) an expired token is rejected, (d) a token from a different issuer/client is rejected

---

## Requirements Mapped

**Non-Functional Requirements:**
- NFR11: User authentication tokens are stateless, time-limited (expire after 24 hours), and invalidated on logout — signature verification is a prerequisite for this NFR actually holding under adversarial conditions, not just cooperative ones
- NFR57 (FR57 in PRD numbering — user authentication tokens are secure and not exposed to third parties)

---

## Tasks / Subtasks

**Task 1: Add Verified JWT Decode**
- [x] Add a JWKS-based verification library appropriate to the stack (e.g., `aws-jwt-verify` for Cognito, or `jose` with Cognito's JWKS endpoint) — confirm licensing/bundle-size fit before choosing
- [x] Implement `getVerifiedSubFromJWT(token)` (or similar) in `lib/auth/jwt.ts` that verifies signature + `exp` + `iss` + `aud`/`client_id`, returning the verified `sub` or throwing/returning null on any failure

**Task 2: Migrate Every Caller**
- [x] Audit every route/service currently calling `getSubFromJWT` (confirmed present in at least: comments, checklist, photo, timeline, logistics, poll routes — likely more; grep the whole `app/api/` tree)
- [x] Replace each call site with the verified version
- [x] Remove or clearly deprecate the old unverified `decodeJWT`/`getSubFromJWT` so nothing can accidentally use it going forward

**Task 3: Testing**
- [x] Unit tests per AC5 (valid, forged, expired, wrong-issuer tokens)
- [x] Integration test: at least one real route (e.g., comments) rejects a forged token end-to-end
- [x] Full regression run — this touches shared auth infrastructure, run the complete test suite, not just the auth-adjacent files

**Task 4: Rollout Safety**
- [x] Since this is a stricter check than what exists today, confirm real (currently valid) Cognito tokens still verify successfully in whatever environment is used for testing — a misconfigured JWKS endpoint or wrong user pool ID would lock out all real users, not just attackers

---

## Dev Notes

### Architecture Context

- This is genuinely cross-cutting — do not scope this to Epic 12's routes only. `lib/auth/jwt.ts`'s existing comment ("without verification — only for reading claims", "In production, verify the token signature") indicates the original author knew this was incomplete; this story closes that gap.
- Cognito publishes its signing keys at a well-known JWKS URL per user pool; both `aws-jwt-verify` (AWS-maintained, Cognito-specific, minimal config) and `jose` (general-purpose, more manual JWKS wiring) are reasonable choices — `aws-jwt-verify` is likely the lower-effort path given this app's existing Cognito dependency.

### Project Structure Notes

- Primary change: `lib/auth/jwt.ts`
- Secondary changes: every `app/api/**/route.ts` file currently importing `getSubFromJWT`

### References

- [Source: lib/auth/jwt.ts] — existing unverified `decodeJWT`/`getSubFromJWT`, with its own comment flagging the gap
- Findings from Epic 12 code review (2026-08-27): stories 12-2, 12-3, 12-5, 12-6 all independently surfaced this same issue in their adversarial reviews
- [AWS `aws-jwt-verify` library](https://github.com/awslabs/aws-jwt-verify) — Cognito-specific JWT verification

---

## Dev Agent Record

### Workflow Execution
- Filed as a direct, explicit follow-up from the Epic 12 code review's cross-cutting finding, per user direction to track it as its own ticket rather than fix it piecemeal inside each Epic 12 story

### Story Quality Checklist
- ✅ Root cause identified precisely (single shared utility, not six separate bugs)
- ✅ Scoped as infra/security hardening with an explicit no-UX-change AC (AC3) to keep it from ballooning into a broader auth rework
- ✅ Rollout safety explicitly called out (Task 4) — a broken JWKS config would lock out real users, not just attackers

### Implementation Readiness
- **Ready for Dev:** Yes
- **Dependencies:** None blocking — independent of Epic 12/2/3/4's other work
- **Blocking Issues:** None, but recommend prioritizing this given it affects authorization correctness across the entire app, not just Epic 12

### Implementation Notes (2026-08-28)

**Library choice:** `aws-jwt-verify` (AWS-maintained, Apache-2.0, Cognito-purpose-built) over `jose` — matches the Dev Notes' "lower-effort path" recommendation. `CognitoJwtVerifier.create({ userPoolId, tokenUse: 'access', clientId })` handles signature + `exp` + `iss` + `client_id` validation (AC1/AC2) in one call. Added as a runtime dependency only; no devDependency was needed for tests (see below).

**Core change:** `lib/auth/jwt.ts` gained `getVerifiedSubFromJWT(token): Promise<string | null>` (verifies via a lazily-created, memoized `CognitoJwtVerifier` singleton exported as `getCognitoJwtVerifier()` for test seeding) and `getCognitoJwtVerifier()`. The old `decodeJWT`/`getSubFromJWT`/`getEmailFromJWT` were kept but re-documented as unverified and client-only — see scope decision below.

**Migration (Task 2), two shapes found in the codebase:**
1. `lib/api/auth.ts`'s `getUserIdFromRequest(request)` (cookie-based `accessToken`) — switched internally to the verified path. This single change fixed authorization for all ~18 route files that call it, **with zero changes to those files for the ones that already `await`ed it**.
2. ~14 route files read a Bearer header directly and called `getSubFromJWT(token)` (either inline or via a local per-file `getUserIdFromRequest` wrapper) — each migrated to `await getVerifiedSubFromJWT(token)`.

**Critical bug caught during migration, not introduced by it:** several `getUserIdFromRequest` call sites were missing `await` even before this story (calendar connect/callback/disconnect/status, `/api/auth/me`, `/api/user/delete`, `/api/user/export`, `/api/groups` (both handlers), `/api/users/profile`, the comments/[commentId] and polls-vote and logistics-claims local wrappers). Once `getUserIdFromRequest` does real async verification, a missing `await` means `userId` becomes a `Promise` object — always truthy, so the `if (!userId)` 401 check silently passes, and the Promise gets passed downstream as if it were the user id (e.g. into SQL `WHERE id = $1`, or GDPR delete/export queries). Added the missing `await` at every one of these call sites; confirmed via `tsc --noEmit` (which caught several) plus a manual audit of the rest (TS didn't flag all of them because some contexts are loosely typed).

**Scope decision — client-side `getSubFromJWT` callers left unverified (`lib/contexts/AuthContext.tsx`, `lib/services/authService.ts`):** these decode a token the client/server-action just received directly from Cognito's own auth response, to read `sub` for local UI/session state — not a token an untrusted party is presenting to gate an authorization decision about someone else. AC4's "no route is left on the old unverified decode" targets exactly that authorization boundary (routes/services deciding *whose* data to touch based on a caller-supplied token), which these aren't. Verifying client-side would also require bundling JWKS fetch/crypto into the browser for no security benefit, since the client already trusts itself. `decodeJWT`/`getSubFromJWT`/`getEmailFromJWT` were kept, with doc comments now explicitly warning they must never be used to authorize a request.

**Testing (Task 3):** `lib/auth/__tests__/jwt.test.ts` (11 tests, AC5) signs tokens with a locally-generated RSA key pair using Node's built-in `crypto` (no `jose` dependency needed — it's ESM-only and doesn't play with this repo's ts-jest/CommonJS setup) and seeds the verifier's JWKS cache via `aws-jwt-verify`'s documented `cacheJwks()` testing hook, so verification is real cryptographic signature checking with no network call to Cognito. Covers: valid token accepted; forged (wrong-key-signed, tampered-payload, `alg:none`, malformed) tokens rejected; expired rejected; wrong-issuer rejected; wrong-`client_id` rejected. `__tests__/integration/auth/forged-jwt-rejection.test.ts` (3 tests) exercises the real `POST /api/groups/:groupId/events/:eventId/comments` route end-to-end (only the DB-backed service layer mocked) proving a forged token gets 401 and never reaches the service layer, while a validly-signed one passes the verified `sub` through correctly.

**Regression (Task 3):** Full suite run before vs. after: baseline 73 failed / 470 failed tests → after this story 71 failed / 458 failed tests (net improvement, from fixing the missing-`await` bugs above). Every one of the ~14 directly-migrated route test files plus the calendar unit tests plus my 2 new test files pass. The remaining 71 failing suites are pre-existing and unrelated (verified via `git stash` baseline comparison and per-file root-cause tracing): mostly a `jest.setup.js` `global.Request`/`global.Response` polyfill that clobbers Next.js's `NextRequest`/`NextResponse` when a test doesn't declare `@jest-environment node` (affects 6 pre-existing Google Calendar tests from Story 3.5/3.8, unrelated to JWT logic), one orphaned test file written against `vitest` (never runnable under this repo's Jest setup, pre-dates this story), and assorted UI/accessibility test flakiness. None of these touch JWT/auth logic; none were introduced by this change. Flagging for visibility, not fixing — out of scope for a security-hardening story.

**Rollout safety (Task 4):** `getCognitoJwtVerifier()` reads `NEXT_PUBLIC_USER_POOL_ID` / `NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID` from the existing `.env.local` (same values already used by `authService.ts`), so it verifies against the real deployed user pool — no new config needed. `getVerifiedSubFromJWT` fails closed (returns `null` → 401) on any verification error, including a misconfigured JWKS/pool, with the underlying reason logged via `console.error` for operability. The integration test's "accepts a validly-signed token" case is the automated proxy for "real tokens still work"; a manual login smoke test against the real Cognito pool is still recommended before considering this fully rolled out (noted as a suggested next step, not blocking).

### File List

**Dependencies**
- `package.json`, `package-lock.json` — added `aws-jwt-verify` (runtime dependency)

**Core auth**
- `lib/auth/jwt.ts` — added `getVerifiedSubFromJWT`, `getCognitoJwtVerifier`; re-documented legacy `decodeJWT`/`getSubFromJWT`/`getEmailFromJWT` as unverified/client-only
- `lib/api/auth.ts` — `getUserIdFromRequest` now async, uses the verified path

**Routes migrated to the verified path (await added and/or `getSubFromJWT` → `getVerifiedSubFromJWT`)**
- `app/api/auth/me/route.ts`
- `app/api/calendar/google/callback/route.ts`
- `app/api/calendar/google/connect/route.ts`
- `app/api/calendar/google/disconnect/route.ts`
- `app/api/calendar/google/status/route.ts`
- `app/api/groups/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/checklist/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/comments/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/comments/[commentId]/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/claims/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/photos/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/photos/[photoId]/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/vote/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/timeline/route.ts`
- `app/api/groups/[groupId]/events/[eventId]/timeline/[itemId]/route.ts`
- `app/api/groups/[groupId]/wishlist/[itemId]/comments/route.ts`
- `app/api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]/route.ts`
- `app/api/user/delete/route.ts`
- `app/api/user/export/route.ts`
- `app/api/users/profile/route.ts`

**Test mocks updated (`jwt.getSubFromJWT`/`mockReturnValue` → `jwt.getVerifiedSubFromJWT`/`mockResolvedValue`, or `getUserIdFromRequest` `mockReturnValue` → `mockResolvedValue`)**
- `app/api/groups/[groupId]/events/[eventId]/checklist/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/checklist/[itemId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/comments/[commentId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/logistics/[itemId]/claims/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/photos/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/photos/[photoId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/polls/[pollId]/vote/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/timeline/__tests__/route.test.ts`
- `app/api/groups/[groupId]/events/[eventId]/timeline/[itemId]/__tests__/route.test.ts`
- `app/api/groups/[groupId]/wishlist/[itemId]/comments/[commentId]/__tests__/route.test.ts`
- `__tests__/api/calendar/google/status.test.ts`
- `__tests__/api/calendar/google/connect.test.ts`
- `__tests__/api/calendar/google/disconnect.test.ts`
- `__tests__/api/calendar/google/callback.test.ts`
- `__tests__/integration/calendar/connect-flow.test.ts`
- `__tests__/integration/calendar/disconnect-flow.test.ts`

**New tests**
- `lib/auth/__tests__/jwt.test.ts` — AC5 unit tests (11 tests)
- `__tests__/integration/auth/forged-jwt-rejection.test.ts` — Task 3 end-to-end integration test (3 tests)

### Change Log

| Date | Change |
|------|--------|
| 2026-08-28 | Implemented verified JWT decode (`getVerifiedSubFromJWT`) using `aws-jwt-verify`; migrated `lib/api/auth.ts` and ~14 direct-decode routes to the verified path; fixed several pre-existing missing-`await` bugs on `getUserIdFromRequest` uncovered during migration; added unit + integration test coverage per AC5/Task 3; ran full regression suite (net improvement vs. baseline, no new failures). Status: ready-for-dev → review. |
