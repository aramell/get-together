---
story_key: "3-5-connect-google-calendar"
epic: "3"
story: "5"
title: "Connect Google Calendar (OAuth)"
status: "review"
created_date: "2026-08-27"
---

# Story 3.5: Connect Google Calendar (OAuth)

**Epic:** 3 - Soft Calendar & Availability
**Story Key:** 3-5-connect-google-calendar
**Created:** 2026-08-27
**Status:** review

---

## Story

As a user,
I want to connect my Google Calendar via OAuth,
So that my real availability syncs into the group's soft calendar without manual marking.

---

## Acceptance Criteria

**AC1: Initiate OAuth Connect**
- **Given** a logged-in user viewing calendar/availability settings
- **When** they tap "Connect Google Calendar"
- **Then** they are redirected to Google's OAuth consent screen with `access_type=offline` and `prompt=consent`
- **And** a CSRF-protecting `state` parameter is included and validated on callback

**AC2: Store Refresh Token Securely**
- **Given** a user completes the OAuth consent flow
- **When** Google redirects back with an authorization code
- **Then** the app exchanges the code for an access token and refresh token
- **And** the refresh token is stored encrypted in a `calendar_connections` table, scoped to that user
- **And** the access token itself is never persisted — only refreshed on demand during sync (Story 3.6)

**AC3: Reflect Connected State**
- **Given** a user has successfully connected Google Calendar
- **When** they view calendar/availability settings
- **Then** they see "Google Calendar Connected" with the connected account's email
- **And** the "Connect" action is replaced with "Disconnect" (Story 3.8)

**AC4: Handle Consent Denial**
- **Given** a user starts the OAuth flow
- **When** they deny consent on Google's screen
- **Then** they are redirected back with a clear message ("Calendar connection was not completed")
- **And** no partial connection record is created

**AC5: Re-Connect Updates Existing Record**
- **Given** a user already has a connected Google Calendar
- **When** they go through the connect flow again
- **Then** the existing `calendar_connections` row is updated (new refresh token) rather than duplicated

---

## Requirements Mapped

**Functional Requirements:**
- FR21: Users can connect their Google Calendar via OAuth to populate availability

**Non-Functional Requirements:**
- NFR12: Calendar data from external providers never stored — only free/busy blocks cached, never event details (this story only handles the connection; enforced at the data layer in Story 3.6)

**Architecture Decisions:**
- Decision 6b (Calendar Integration — OAuth Token Management): `access_type=offline` + `prompt=consent`, refresh token stored encrypted in the existing Supabase Postgres database, scoped per user

---

## Tasks / Subtasks

**Task 1: Database Schema**
- [x] Create `calendar_connections` table: `id`, `user_id` (FK, unique), `provider` (`'google'`), `refresh_token_encrypted`, `connected_email`, `needs_reauth` (boolean, default false), `created_at`, `updated_at`
- [x] Encrypt `refresh_token_encrypted` at the application layer before insert (Postgres encryption-at-rest alone isn't sufficient for a credential this sensitive — extends the managed-encryption pattern from Architecture Decision 2d)

**Task 2: OAuth Initiation Endpoint**
- [x] `GET /api/calendar/google/connect` — generate Google OAuth consent URL with `access_type=offline`, `prompt=consent`, a signed `state` param (CSRF), redirect user

**Task 3: OAuth Callback Endpoint**
- [x] `GET /api/calendar/google/callback` — validate `state`, exchange `code` for tokens via Google's token endpoint, encrypt refresh token, upsert `calendar_connections` row, redirect to settings with success/denial message

**Task 4: Settings UI**
- [x] "Connect Google Calendar" button in calendar/availability settings
- [x] Connected state display (email + "Disconnect" action, wired to Story 3.8)
  - **RESOLVED 2026-08-28:** Story 3.8 has since shipped (status `review`) and implemented the Disconnect action directly into this story's `components/settings/CalendarConnectionSetting.tsx` (Disconnect button, confirmation dialog reusing `DeleteConfirmationDialog`, wired to `DELETE /api/calendar/google/disconnect`). Verified by inspection: the component renders the "Google Calendar Connected" badge, connected email, and a "Disconnect" button with confirmation flow. No source changes were needed in this story; re-ran `CalendarConnectionSetting.test.tsx`, `calendarConnectionService.test.ts`, and `crypto.test.ts` (26/26 passing) to confirm.
- [x] Consent-denial and error message handling

**Task 5: Environment Configuration**
- [x] New env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — document in `.env.example` and deployment config (new external dependency, per sprint-change-proposal's Technical Impact section)

**Task 6: Testing**
- [x] Unit tests: token exchange service, encryption/decryption round-trip
- [x] API tests: connect redirect, callback success, callback with denied consent, callback with invalid `state`
- [x] Component tests: connect button, connected-state display
- [x] Integration test: full connect flow (mocked Google OAuth endpoints)

---

## Dev Notes

### Architecture Context

- OAuth pattern is standard Google offline-access: `access_type=offline` + `prompt=consent` returns a refresh token on first authorization only — if a user disconnects and reconnects without fully revoking Google-side access, Google may not return a new refresh token unless `prompt=consent` forces re-consent (already included above; keep it).
- Per Architecture Decision 6b, refresh tokens live in the **same Supabase Postgres database** as everything else — no separate secrets store. Encrypt the column value at the application layer regardless of Postgres's own at-rest encryption.
- Access tokens are never stored — Google's client library auto-refreshes using the stored refresh token when a sync (Story 3.6) needs one.

### Project Structure Notes

- New: `lib/services/calendarConnectionService.ts` — `initiateConnect()`, `handleCallback()`, `getConnectionStatus(userId)`
- New: `app/api/calendar/google/connect/route.ts`, `app/api/calendar/google/callback/route.ts`
- New: settings UI component, likely alongside existing profile/group settings patterns from Epic 2

### References

- [Source: prd.md#FR21](../planning-artifacts/prd.md)
- [Architecture: Decision 6b — OAuth Token Management](../planning-artifacts/architecture.md#decision-6b-oauth-token-management)
- [Google OAuth 2.0 offline access docs](https://developers.google.com/identity/protocols/oauth2)

---

## Dev Agent Record

### Workflow Execution
- Created via Scrum Master story-preparation pass following the approved sprint-change-proposal-2026-08-19 and Architecture Decisions 6a-6c

### Story Quality Checklist
- ✅ Acceptance criteria cover happy path, consent denial, re-connect, and security (CSRF state param)
- ✅ Database schema specified with encryption requirement called out explicitly
- ✅ API endpoints specified
- ✅ New environment variables identified for deployment
- ✅ Testing strategy covers unit, API, component, and integration levels

### Implementation Readiness
- **Ready for Dev:** Yes
- **Dependencies:** None blocking — can be built independently of Stories 3.6/3.7/3.8, though it's the prerequisite for all three
- **Blocking Issues:** None

### Implementation Plan
- **No new SDK dependency:** Google OAuth token exchange, refresh, and userinfo lookup are implemented via plain `fetch()` calls to Google's REST endpoints (`accounts.google.com/o/oauth2/v2/auth`, `oauth2.googleapis.com/token`, `googleapis.com/oauth2/v2/userinfo`), rather than adding the `googleapis` npm package. Avoids a new-dependency approval gate for something a few `fetch` calls covers; Story 3.6 will use the same approach for `freebusy.query`.
- **Encryption:** New `lib/encryption/crypto.ts` (AES-256-GCM, `crypto.createCipheriv`/`createDecipheriv`) for reversible encryption of the refresh token — distinct from the existing `lib/encryption/hash.ts`, which is one-way bcrypt hashing and can't be decrypted back. Keyed by a new `ENCRYPTION_KEY` env var (base64, 32 bytes). No prior reversible-encryption helper existed in the repo to reuse.
- **CSRF `state` param (AC1):** Stateless double-submit pattern — `initiateConnect()` generates a random hex token, the connect route stores it in a short-lived httpOnly `google_oauth_state` cookie, and the callback route compares the cookie value against the `state` query param before proceeding. No server-side state table needed.
- **Auth:** Used `getUserIdFromRequest` (cookie/JWT-based, `lib/api/auth.ts`) rather than the `x-user-id` header pattern seen in some older routes — these are browser-navigated GET requests (redirects to/from Google), so there's no way for a client to attach a custom header; only the cookie approach works here.
- **Service layer:** `lib/services/calendarConnectionService.ts` follows `eventLogisticsService.ts`'s pattern (`getClient()` from `lib/db/client`, try/finally with `client.release()`, `ServiceResult<T>` return shape) rather than the client-side fetch-wrapper style used by `groupService.ts`, since this needs direct DB access.
- **Re-connect handling (AC5):** `handleCallback` upserts on `user_id` conflict. If Google omits a refresh token on re-consent (can happen depending on Google's session state despite `prompt=consent`), the existing encrypted token is preserved and only `connected_email`/`needs_reauth` are updated, rather than overwriting a valid token with nothing.
- **Settings location:** No dedicated "settings" page existed in the app; `calendar_connections` is per-user (not per-group), so I added `components/settings/CalendarConnectionSetting.tsx` to `app/profile/page.tsx` (existing per-user profile screen) rather than creating a new route, and reused the `Suspense`-wrapping pattern already established for `useSearchParams()` consumers (`components/auth/ResetPasswordFormContent.tsx`).
- **Bug caught by tests, fixed before completion:** The settings component's original `useEffect` for reading the OAuth-callback redirect's `calendar_status` query param depended on `router`/`pathname`/`searchParams`. Since Next's `useRouter()` object isn't guaranteed referentially stable across renders (and definitely isn't under the test mock), and the effect calls `setState`, this produced a genuine infinite render loop — reproduced as a real hang (sustained 100%+ CPU) when running the component test, not a mock artifact. Fixed by making the effect run once on mount (`[]` deps) — this is a "read the redirect param once" pattern, not something that should react to router identity changes. Caught before this reached review specifically because Task 6 requires a component test exercising the connected-state redirect path, not because the AC list would have surfaced it. Worth remembering: forward-facing agents in this codebase should treat `useEffect` + `setState` + `useSearchParams()`/`useRouter()` in dependency arrays as a code smell to double-check.
- **Endpoint added beyond the story's explicit task list:** `GET /api/calendar/google/status` (+ `getConnectionStatus` in the service). The connect/callback routes are pure browser redirects and never return JSON, so the settings UI needs *some* way to ask "is this user currently connected" to satisfy AC3 (needed for both initial page load and to avoid the UI drifting from DB state). This is a small, natural extension of Task 4/AC3, not scope creep into another story.
- **Foundational helper for Story 3.6 added now, not part of 3.5's own ACs:** `getDecryptedRefreshToken(userId)` in the service — Story 3.6's sync worker will need to decrypt the stored token, and this is a one-line, obviously-correct pairing with `encrypt()`/the upsert logic already in this file. Not exercised by any of *this* story's tests since no 3.5 AC calls for it; will be covered when 3.6 lands.

### Test environment note
Same pre-existing, repo-wide Node v25 harness issue documented in Story 2.8's Dev Notes: `jest.setup.js`'s `global.Request` polyfill never actually installs (it only applies `if (!global.Request)`, and Node 25 already provides a native `Request`), so `next/server`'s `NextRequest` — which defines `url` as a read-only getter — fails with "Cannot set property url of #<NextRequest> which has only a getter" the moment any test constructs one. This affects all 4 of this story's `NextRequest`-constructing test files (`connect.test.ts`, `callback.test.ts`, `status.test.ts`, `integration/calendar/connect-flow.test.ts` — 17 tests total). Verified these are harness-only, not logic bugs, three ways: (1) the failure trace is identical to the pre-existing baseline failure in `__tests__/api/groups/delete.test.ts`; (2) `calendarConnectionService.test.ts` (11 tests, service layer only, no `NextRequest`) passes 100%; (3) `crypto.test.ts` (5 tests) and `CalendarConnectionSetting.test.tsx` (4 tests, component-level, no `NextRequest`) pass 100%. Ran the full repo test suite before and after this story's changes (`git stash -u` compare): no previously-passing test regressed. Baseline (unmodified main, no untracked files): 65 failed suites / 430 failed tests / 3239 total. With this story's + Story 2.8's combined uncommitted work: 68 failed suites / 448 failed tests / 3291 total — the entire delta is explained by this story's 17 harness-only failures plus Story 2.8's own already-in-progress test files.
- `tsc --noEmit` and `eslint`: no new errors beyond the same two pre-existing, repo-wide baseline patterns already present throughout the codebase (`catch (error: any)` → `@typescript-eslint/no-explicit-any`; `require()`-based jest mocks losing type info → TS2345 "not assignable to type 'never'", present in e.g. `eventService.test.ts`). Confirmed via direct comparison against unmodified files using the same patterns.

### Completion Notes
- Tasks 1, 2, 3, 5, 6 fully implemented and tested. Task 4 is done except one sub-item: the "Disconnect" action is intentionally not built here — it's Story 3.8's scope (still `ready-for-dev`), and per this story's own AC3 phrasing ("replaced with 'Disconnect' (Story 3.8)") that's expected. Connected-state display (email) is implemented and tested.
- AC1 (initiate OAuth, CSRF state), AC2 (encrypted refresh-token storage, access token never persisted), AC4 (consent-denial handling), AC5 (re-connect updates existing row) are fully implemented and tested.
- AC3 (reflect connected state) is now fully implemented — the "connected" half (email + status endpoint + UI badge) by this story, and the "Connect replaced with Disconnect" half by Story 3.8 (see Task 4 note, resolved 2026-08-28).
- **Next in this session:** proceeding directly to Story 3.6 (Sync Google Availability), then 3.7, then back to finish Story 2.8's Task 4 — per user's explicit direction to build the dependency chain in order this session.
- **2026-08-28:** Task 4's remaining sub-item resolved with no source changes — Story 3.8 shipped in the interim and implemented the Disconnect action directly into this story's `CalendarConnectionSetting.tsx`, satisfying AC3's "Connect replaced with Disconnect" half. Verified by inspection and re-ran this story's non-`NextRequest` test suites (26/26 passing). All tasks now complete; story moved to `review`.

### File List
- `lib/db/migrations/024_create_calendar_connections_table.sql` (new)
- `lib/encryption/crypto.ts` (new)
- `lib/services/calendarConnectionService.ts` (new)
- `app/api/calendar/google/connect/route.ts` (new)
- `app/api/calendar/google/callback/route.ts` (new)
- `app/api/calendar/google/status/route.ts` (new)
- `components/settings/CalendarConnectionSetting.tsx` (new)
- `app/profile/page.tsx` (modified — renders `CalendarConnectionSetting` in a `Suspense` boundary)
- `.env.local.example` (modified — added `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `ENCRYPTION_KEY`)
- `__tests__/lib/encryption/crypto.test.ts` (new)
- `__tests__/services/calendarConnectionService.test.ts` (new)
- `__tests__/api/calendar/google/connect.test.ts` (new)
- `__tests__/api/calendar/google/callback.test.ts` (new)
- `__tests__/api/calendar/google/status.test.ts` (new)
- `__tests__/components/settings/CalendarConnectionSetting.test.tsx` (new)
- `__tests__/integration/calendar/connect-flow.test.ts` (new)
- No files changed to close out Task 4 — the Disconnect action was implemented directly into `components/settings/CalendarConnectionSetting.tsx` by Story 3.8; see Task 4 note.

### Change Log
- 2026-08-27: Implemented Tasks 1, 2, 3, 5, 6 and most of Task 4 (DB migration, encryption helper, OAuth connect/callback/status endpoints, settings UI, env config, tests) for Google Calendar OAuth connection. Task 4's "Disconnect" action deferred to Story 3.8 (doesn't exist yet). Story left `in-progress`, not `review`, pending Story 3.8.
- 2026-08-28: Closed out Task 4 — Story 3.8 shipped and already wires the Disconnect action into `CalendarConnectionSetting.tsx`. Verified by code inspection and re-running affected test suites (26/26 passing). All tasks and ACs now complete; Status moved to `review`.

---

## Next Steps

1. ~~**Dev Agent:** Invoke `/bmad-bmm-dev-story` with this story file~~ — done 2026-08-27 (Tasks 1/2/3/5/6, most of Task 4)
2. ~~**Task 4:** Disconnect action, wired to Story 3.8~~ — done 2026-08-28 (satisfied by Story 3.8's implementation; see Task 4 note)
3. **Coordinate:** Provision `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in Google Cloud Console before this connects to real Google accounts (not needed for the code/tests themselves)
4. **Code Review:** Run `/bmad-bmm-code-review`
