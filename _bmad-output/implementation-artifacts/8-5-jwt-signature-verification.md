---
story_key: "8-5-jwt-signature-verification"
epic: "8"
story: "5"
title: "Verify JWT Signatures Instead of Trusting Decoded Claims"
status: "ready-for-dev"
created_date: "2026-08-27"
priority: "critical"
---

# Story 8.5: Verify JWT Signatures Instead of Trusting Decoded Claims

**Epic:** 8 - Responsive Web App & Accessibility (Security/Privacy: NFR9-16)
**Story Key:** 8-5-jwt-signature-verification
**Created:** 2026-08-27
**Status:** ready-for-dev
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
- [ ] Add a JWKS-based verification library appropriate to the stack (e.g., `aws-jwt-verify` for Cognito, or `jose` with Cognito's JWKS endpoint) — confirm licensing/bundle-size fit before choosing
- [ ] Implement `getVerifiedSubFromJWT(token)` (or similar) in `lib/auth/jwt.ts` that verifies signature + `exp` + `iss` + `aud`/`client_id`, returning the verified `sub` or throwing/returning null on any failure

**Task 2: Migrate Every Caller**
- [ ] Audit every route/service currently calling `getSubFromJWT` (confirmed present in at least: comments, checklist, photo, timeline, logistics, poll routes — likely more; grep the whole `app/api/` tree)
- [ ] Replace each call site with the verified version
- [ ] Remove or clearly deprecate the old unverified `decodeJWT`/`getSubFromJWT` so nothing can accidentally use it going forward

**Task 3: Testing**
- [ ] Unit tests per AC5 (valid, forged, expired, wrong-issuer tokens)
- [ ] Integration test: at least one real route (e.g., comments) rejects a forged token end-to-end
- [ ] Full regression run — this touches shared auth infrastructure, run the complete test suite, not just the auth-adjacent files

**Task 4: Rollout Safety**
- [ ] Since this is a stricter check than what exists today, confirm real (currently valid) Cognito tokens still verify successfully in whatever environment is used for testing — a misconfigured JWKS endpoint or wrong user pool ID would lock out all real users, not just attackers

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

---

## Next Steps

1. **Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file
2. **Code Review:** Run `/bmad-bmm-code-review` after implementation — this one especially warrants a genuinely adversarial pass given its security nature
3. **Coordinate:** Confirm which JWT verification library fits the deployment target before starting Task 1
